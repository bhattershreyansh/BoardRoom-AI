import sys
import os
import asyncio
import uuid

# Dynamically add the parent directory to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from groq import AsyncGroq
from core.config.settings import settings
from ingestion.models import CandidateProfile, ResumeSnapshot, JDConfig, Hypothesis, AnchorQuestion
from conductor.models import SessionState, Turn
from conductor.probe_logic import decide_next_action
from conductor.competency_scorer import CompetencyScorer
from conductor.interview_brain import InterviewBrain
from evaluation.aggregator import EvaluationAggregator
from evaluation.report_generator import ReportGenerator

async def get_mock_profile(session_id: str) -> CandidateProfile:
    # Uses the same mock profile as agent.py
    resume = ResumeSnapshot(
        full_name="Alice Smith",
        current_title="VP of Engineering",
        career_arc=[],
        total_years_experience=10,
        domains=["SaaS", "Cloud Architecture"],
        seniority_level="VP",
        tenure_gaps=[],
        board_exposure=False,
        notable_signals=["No P&L management experience"],
        red_flags=["Has not managed P&L directly"]
    )
    
    jd = JDConfig(
        role_type="CTO",
        company_stage="Series B",
        mandate="Scale engineering team from 20 to 100 while rebuilding monolith into microservices.",
        competency_weights={
            "strategic_vision": 1.0,
            "operational_execution": 0.8,
            "people_leadership": 0.9,
            "financial_acumen": 0.5
        },
        mandatory_probes=["Scale experience", "Microservices architecture", "P&L management"],
        red_flag_triggers=["Weak technical leadership", "No scaling experience"],
        interview_tone="conversational",
        expected_duration_minutes=45
    )
    
    return CandidateProfile(
        session_id=session_id,
        candidate=resume,
        jd=jd,
        hypothesis_map=[
            Hypothesis(
                area="financial_acumen",
                hypothesis="Candidate claims executive leadership but has no direct P&L ownership.",
                probe_instruction="Ask about their budgeting authority and if they had final sign-off on spend.",
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

async def simulate_candidate_response(client: AsyncGroq, model: str, question: str, history: list) -> str:
    """
    Simulates a candidate (Alice Smith) answering the interviewer's question.
    Sometimes gives vague answers to test the agent's probing capability.
    """
    prompt = f"""You are Alice Smith, interviewing for a CTO position.
Your resume:
- VP of Engineering at StartUpX: Managed 15 engineers. Re-architected AWS backend. Did NOT manage P&L directly.
- Senior Engineer at BigCorp: Built scalable services.
- Gap: Took 2019-2020 off to travel.

Your personality: Confident, technical, but slightly defensive if asked about financial/budget management.
Answer the following question from the interviewer in 2-3 sentences.
If they ask about budget or P&L, try to give a slightly vague answer about 'working closely with the finance team' to see if they probe you.

Interviewer's Question: {question}
"""
    messages = [{"role": "system", "content": prompt}]
    for turn in history:
        role = "user" if turn["speaker"] == "interviewer" else "assistant"
        messages.append({"role": role, "content": turn["text"]})
        
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.7
    )
    return response.choices[0].message.content.strip()

async def main():
    session_id = str(uuid.uuid4())
    profile = await get_mock_profile(session_id)
    
    state = SessionState(
        session_id=session_id,
        current_competency="financial_acumen",  # Start here to test our budget/P&L hypothesis immediately
        mandatory_probes_remaining=list(profile.mandatory_probes),
        phase="probing"
    )
    
    brain = InterviewBrain()
    scorer = CompetencyScorer()
    client = AsyncGroq(api_key=settings.groq_api_key)
    model = settings.groq_model
    
    print("=========================================")
    print("STARTING CXO INTERVIEW SIMULATION")
    print(f"Candidate: {profile.candidate.full_name} | Target Role: {profile.jd.role_type}")
    print("=========================================\n")
    
    # Opener
    interviewer_question = profile.anchor_questions[0].question
    print(f"🤖 [Interviewer]: {interviewer_question}\n")
    
    state.full_transcript.append(Turn(
        turn_id=1,
        speaker="interviewer",
        text=interviewer_question,
        timestamp=0.0
    ))
    
    sim_history = [{"speaker": "interviewer", "text": interviewer_question}]
    
    # Run 4 turns of interaction
    for turn_idx in range(2, 6):
        # 1. Candidate answers
        candidate_answer = await simulate_candidate_response(client, model, interviewer_question, sim_history)
        print(f"👤 [Candidate]: {candidate_answer}\n")
        
        state.full_transcript.append(Turn(
            turn_id=turn_idx,
            speaker="candidate",
            text=candidate_answer,
            timestamp=float(turn_idx)
        ))
        sim_history.append({"speaker": "candidate", "text": candidate_answer})
        
        # 2. Score the response (Awaited here in simulation to show output, runs async in production)
        print("⚡ [System]: Scoring candidate response in background...")
        score = await scorer.score_turn(
            turn_id=turn_idx,
            competency=state.current_competency,
            question=interviewer_question,
            answer=candidate_answer
        )
        state.turn_scores.append(score)
        print(f"📊 [Score Card]: Specificity={score.scores['specificity']}/5 | Relevance={score.scores['relevance']}/5 | Composite={score.composite}/5")
        print(f"📝 [Rationale]: {score.rationale}\n")
        
        # 3. Decide next action
        next_action = decide_next_action(state, score)
        print(f"⚙️ [Conductor Decision]: {next_action.upper()}")
        
        # 4. Update counters
        if next_action == "probe_deeper":
            state.follow_ups_this_turn += 1
        elif next_action == "next_competency":
            state.follow_ups_this_turn = 0
            if state.current_competency not in state.competencies_covered:
                state.competencies_covered.append(state.current_competency)
            state.current_competency = "strategic_vision"  # Move to next mock competency
        
        # 5. Generate next question
        print("🤖 [Interviewer is thinking...]")
        interviewer_question = ""
        async for chunk in brain.generate_response(profile, state, next_action):
            interviewer_question += chunk
            
        print(f"🤖 [Interviewer]: {interviewer_question}\n")
        
        state.full_transcript.append(Turn(
            turn_id=turn_idx + 1,
            speaker="interviewer",
            text=interviewer_question,
            timestamp=float(turn_idx + 0.5)
        ))
        sim_history.append({"speaker": "interviewer", "text": interviewer_question})
        
    print("=========================================")
    print("SIMULATION COMPLETED")
    print("=========================================")
    
    # 6. Run Post-Interview Evaluation
    print("\n⚡ [System]: Running Evaluator (Post-Interview Aggregator)...")
    aggregator = EvaluationAggregator()
    generator = ReportGenerator()
    
    report = await aggregator.aggregate_report(profile, state)
    paths = generator.generate_all_reports(report)
    
    print("\n=========================================")
    print("📝 POST-INTERVIEW REPORT GENERATED")
    print(f"JSON Output: {paths['json']}")
    print(f"Markdown Output: {paths['markdown']}")
    print("=========================================")

if __name__ == "__main__":
    asyncio.run(main())
