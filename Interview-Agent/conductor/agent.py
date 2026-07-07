import sys
import os
import asyncio
import uuid
import json
from typing import Optional, Set
from sqlalchemy import select

# Dynamically add the parent directory to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm, inference, ConversationItemAddedEvent, AgentSession
from livekit.agents.voice import Agent
from livekit.plugins import silero

from core.utils.logger import get_logger
from core.config.settings import settings
from ingestion.models import CandidateProfile, ResumeSnapshot, JDConfig, GeneratedProfileData, Hypothesis, AnchorQuestion, CareerEntry, TenureGap
from conductor.models import SessionState, Turn, TurnScore
from conductor.probe_logic import decide_next_action
from conductor.competency_scorer import CompetencyScorer
from conductor.interview_brain import InterviewBrain
from evaluation.aggregator import EvaluationAggregator
from evaluation.report_generator import ReportGenerator
from api.database import SessionLocal
from api.models import InterviewSession

logger = get_logger(__name__)

# Keep track of background scoring tasks to prevent garbage collection
background_tasks: Set[asyncio.Task] = set()

class InterviewAgent(Agent):
    """
    Stateful AI Interviewer Agent.
    Subclasses the LiveKit Agent to handle turn-based instructions updates.
    """
    def __init__(
        self,
        profile: CandidateProfile,
        state: SessionState,
        brain: InterviewBrain,
        scorer: CompetencyScorer,
        initial_prompt: str
    ):
        self.profile = profile
        self.state = state
        self.brain = brain
        self.scorer = scorer
        
        # Build a premium, warm introduction dynamically
        name = profile.candidate.full_name
        role = profile.jd.role_type
        duration = profile.jd.expected_duration_minutes
        comps = [c.replace("_", " ") for c in profile.jd.competency_weights.keys()]
        if len(comps) > 1:
            comp_str = ", ".join(comps[:-1]) + ", and " + comps[-1]
        elif comps:
            comp_str = comps[0]
        else:
            comp_str = "your professional experience"
            
        opening_text = (
            f"Hello {name}, welcome! I am your AI interviewer today, and we'll be discussing your background "
            f"for the {role} position. We will cover a few key competencies today, including {comp_str}. "
            f"The session should take around {duration} minutes. When you're ready, let me know if we can begin."
        )
        self.last_question = {"text": opening_text}
        
        super().__init__(
            instructions=initial_prompt,
            vad=silero.VAD.load(),
            stt=inference.STT(
                model="deepgram/nova-3",
                language="en"
            ),
            llm=inference.LLM(
                model="openai/gpt-4o-mini"
            ),
            tts=inference.TTS(
                model="elevenlabs/eleven_turbo_v2_5",
                voice="Xb7hH8MSUJpSbSDYk0k2",
                language="en"
            ),
            chat_ctx=llm.ChatContext()
        )

    async def on_user_turn_completed(
        self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage
    ) -> None:
        """
        Triggered when the candidate finishes speaking and the turn is committed.
        """
        candidate_text = new_message.text_content or ""
        
        # 1. Append Candidate Turn to State
        turn_id = len(self.state.full_transcript) + 1
        self.state.full_transcript.append(Turn(
            turn_id=turn_id,
            speaker="candidate",
            text=candidate_text,
            timestamp=asyncio.get_event_loop().time()
        ))
        
        # 2. Trigger Background Competency Scorer (Async/Non-blocking)
        async def run_scoring():
            try:
                score = await self.scorer.score_turn(
                    turn_id=turn_id,
                    competency=self.state.current_competency,
                    question=self.last_question["text"],
                    answer=candidate_text
                )
                self.state.turn_scores.append(score)
            except Exception as e:
                logger.error(f"Background scoring failed: {e}")
                
        scoring_task = asyncio.create_task(run_scoring())
        background_tasks.add(scoring_task)
        scoring_task.add_done_callback(background_tasks.discard)
        
        # 3. Run Decision Logic using the latest available scores
        last_score = self.state.turn_scores[-1] if self.state.turn_scores else None
        next_action = decide_next_action(self.state, last_score)
        
        # 4. Update state counters based on decision
        if next_action == "probe_deeper":
            self.state.follow_ups_this_turn += 1
        elif next_action == "next_competency":
            self.state.follow_ups_this_turn = 0
            if self.state.current_competency not in self.state.competencies_covered:
                self.state.competencies_covered.append(self.state.current_competency)
            
            # Transition to next weighted competency
            remaining_weights = {k: v for k, v in self.profile.jd.competency_weights.items() 
                                 if k not in self.state.competencies_covered}
            if remaining_weights:
                self.state.current_competency = max(remaining_weights, key=remaining_weights.get)
            else:
                next_action = "closing"
                self.state.phase = "closing"
        elif next_action == "redirect":
            self.state.offtopic_turns = 0
            self.state.follow_ups_this_turn = 0
            
        # Update phase
        if next_action == "closing":
            self.state.phase = "closing"
        elif self.state.phase == "opening" and len(self.state.full_transcript) >= 4:
            self.state.phase = "probing"
            
        # 5. Dynamically update the System Prompt for the upcoming LLM generation
        new_system_prompt = self.brain.build_system_prompt(self.profile, self.state, next_action)
        await self.update_instructions(new_system_prompt)

        # 6. Save current state to database asynchronously (non-blocking)
        async def save_state_to_db():
            if self.state.session_id.startswith("console-"):
                return  # Skip DB saves for playground runs
            try:
                session_uuid = uuid.UUID(self.state.session_id)
                async with SessionLocal() as db:
                    stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
                    result = await db.execute(stmt)
                    db_session = result.scalar_one_or_none()
                    if db_session:
                        db_session.session_state = json.loads(self.state.model_dump_json())
                        await db.commit()
            except Exception as e:
                logger.error(f"Failed to save session state to DB: {e}")
        
        db_task = asyncio.create_task(save_state_to_db())
        background_tasks.add(db_task)
        db_task.add_done_callback(background_tasks.discard)

async def load_candidate_profile(session_id: str) -> CandidateProfile:
    """
    Loads the CandidateProfile from local storage (populated by backend ingestion).
    Falls back to a mock profile for local testing if file is missing.
    """
    logger.info(f"Loading candidate profile for session: {session_id}")
    
    # Try querying the DB first
    try:
        session_uuid = uuid.UUID(session_id)
        async with SessionLocal() as db:
            stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
            result = await db.execute(stmt)
            db_session = result.scalar_one_or_none()
            
            if db_session and db_session.profile_data:
                logger.info(f"Successfully loaded CandidateProfile from database for session: {session_id}")
                return CandidateProfile.model_validate(db_session.profile_data)
    except Exception as e:
        logger.warning(f"Database query failed for session {session_id}: {e}. Trying file fallback...")

    # File fallback
    profile_path = os.path.join("profiles", f"{session_id}.json")
    if os.path.exists(profile_path):
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                return CandidateProfile.model_validate_json(f.read())
        except Exception as e:
            logger.error(f"Failed to parse candidate profile file {profile_path}: {e}")
            
    logger.warning(f"Profile file not found at {profile_path}. Falling back to default mock profile.")
    
    # Mock Profile matching the exact ingestion schemas
    resume = ResumeSnapshot(
        full_name="Jane Doe",
        current_title="VP of Engineering",
        career_arc=[
            CareerEntry(
                company="StartUpX",
                title="VP of Engineering",
                start_year=2021,
                end_year=2024,
                duration_months=36,
                description="Scaled engineering team from 20 to 100."
            )
        ],
        total_years_experience=12,
        domains=["System Architecture", "Leadership", "Financial Management"],
        seniority_level="Executive",
        tenure_gaps=[],
        board_exposure=False,
        notable_signals=["Strong technical lead experience"],
        red_flags=["Has not managed P&L directly"]
    )
    
    jd = JDConfig(
        role_type="CTO",
        company_stage="Series B",
        mandate="Scale engineering team and transition to microservices.",
        competency_weights={"strategic_vision": 0.4, "team_scaling": 0.3, "financial_acumen": 0.3},
        mandatory_probes=["Scale experience", "Microservices architecture", "P&L management"],
        red_flag_triggers=["No scaling experience"],
        interview_tone="conversational",
        expected_duration_minutes=45
    )
    
    return CandidateProfile(
        session_id=session_id,
        candidate=resume,
        jd=jd,
        hypothesis_map=[
            Hypothesis(
                area="team_scaling",
                hypothesis="Candidate has strong scale leadership but potentially lacks corporate governance experience.",
                probe_instruction="Ask about their board exposure and reporting structure.",
                priority=1
            )
        ],
        anchor_questions=[
            AnchorQuestion(
                question="You've scaled engineering at StartUpX, but as a CTO at a Series B company, you will own the department budget. Walk me through how you managed budgeting and cost optimization in your last role.",
                target_competency="financial_acumen",
                resume_reference="VP of Engineering at StartUpX"
            )
        ],
        mandatory_probes=["Scale experience", "Microservices architecture", "P&L management"],
        red_flags=["Has not managed P&L directly"]
    )

async def entrypoint(ctx: JobContext):
    logger.info("Starting Conductor Agent worker")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    session_id = ctx.room.name
    profile = await load_candidate_profile(session_id)
    
    # Try loading SessionState from database first
    state = None
    try:
        session_uuid = uuid.UUID(session_id)
        async with SessionLocal() as db:
            stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
            result = await db.execute(stmt)
            db_session = result.scalar_one_or_none()
            if db_session and db_session.session_state:
                logger.info(f"Loaded existing SessionState from DB for session: {session_id}")
                state = SessionState.model_validate(db_session.session_state)
    except Exception as e:
        logger.warning(f"Failed to load SessionState from DB: {e}. Re-initializing state...")
        
    if not state:
        # Initialize default state
        state = SessionState(
            session_id=session_id,
            current_competency="strategic_vision",
            mandatory_probes_remaining=list(profile.mandatory_probes),
            phase="opening"
        )
    
    brain = InterviewBrain()
    scorer = CompetencyScorer()
    
    # Prime the chat context with the opening system prompt
    initial_prompt = brain.build_system_prompt(profile, state, "continue")
    
    # Initialize the InterviewAgent
    agent = InterviewAgent(profile, state, brain, scorer, initial_prompt)
    
    # Setup LiveKit AgentSession
    session = AgentSession()
    
    # Listen to conversation updates to record the interviewer's speech
    @session.on("conversation_item_added")
    def on_conversation_item_added(ev: ConversationItemAddedEvent):
        msg = ev.item
        if isinstance(msg, llm.ChatMessage) and msg.role == "assistant":
            agent_text = msg.text_content or ""
            agent.last_question["text"] = agent_text
            
            # Append Interviewer Turn to State
            turn_id = len(state.full_transcript) + 1
            state.full_transcript.append(Turn(
                turn_id=turn_id,
                speaker="interviewer",
                text=agent_text,
                timestamp=asyncio.get_event_loop().time()
            ))
            logger.info(f"Recorded interviewer turn: {agent_text}")

            # Save state asynchronously (non-blocking)
            async def save_state_to_db():
                try:
                    session_uuid = uuid.UUID(state.session_id)
                    async with SessionLocal() as db:
                        stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
                        result = await db.execute(stmt)
                        db_session = result.scalar_one_or_none()
                        if db_session:
                            db_session.session_state = json.loads(state.model_dump_json())
                            await db.commit()
                except Exception as e:
                    logger.error(f"Failed to save session state to DB: {e}")
            
            db_task = asyncio.create_task(save_state_to_db())
            background_tasks.add(db_task)
            db_task.add_done_callback(background_tasks.discard)
        
    async def run_post_interview_evaluation():
        logger.info(f"Generating post-interview evaluation report for session: {session_id}...")
        try:
            aggregator = EvaluationAggregator()
            report = await aggregator.aggregate_report(profile, state)
            
            # Save report to Neon PostgreSQL
            if session_id.startswith("console-"):
                logger.info("Skipping DB save for playground session.")
            else:
                try:
                    session_uuid = uuid.UUID(session_id)
                    async with SessionLocal() as db:
                        stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
                        result = await db.execute(stmt)
                        db_session = result.scalar_one_or_none()
                        if db_session:
                            db_session.evaluation_report = json.loads(report.model_dump_json())
                            db_session.status = "completed"
                            await db.commit()
                            logger.info(f"Successfully saved evaluation report to DB for session: {session_id}")
                except Exception as e:
                    logger.error(f"Failed to save evaluation report to database: {e}", exc_info=True)
                
            # Local backup reports for developer convenience
            generator = ReportGenerator()
            generator.generate_all_reports(report)
            logger.info("Local evaluation reports generated successfully.")
        except Exception as e:
            logger.error(f"Failed to generate evaluation report: {e}", exc_info=True)

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant):
        logger.info(f"Candidate {participant.identity} disconnected. Concluding session.")
        eval_task = asyncio.create_task(run_post_interview_evaluation())
        background_tasks.add(eval_task)
        eval_task.add_done_callback(background_tasks.discard)

    try:
        # Start the agent session in the LiveKit Room
        await session.start(agent=agent, room=ctx.room)
        logger.info("LiveKit Conductor Agent session started")
        
        # Speak the opening question
        await session.say(agent.last_question["text"], allow_interruptions=True)
    except Exception as e:
        logger.error(f"Failed to run Conductor Agent session: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
