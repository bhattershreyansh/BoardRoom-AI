import json
from typing import AsyncGenerator
from groq import AsyncGroq
from core.config.settings import settings
from core.utils.logger import get_logger
from ingestion.models import CandidateProfile
from conductor.models import SessionState

logger = get_logger(__name__)

class InterviewBrain:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = settings.groq_model  # High-capability model (e.g. llama-3.3-70b-versatile)

    def build_system_prompt(self, profile: CandidateProfile, state: SessionState, next_action: str) -> str:
        # Format hypotheses
        hypotheses_str = "\n".join([
            f"- [{h.area}] Hypothesis: {h.hypothesis} | Action: {h.probe_instruction} (Priority: {h.priority})"
            for h in profile.hypothesis_map
        ])
        
        # Format remaining probes
        remaining_probes_str = "\n".join([f"- {probe}" for probe in state.mandatory_probes_remaining])
        
        # Format red flags
        red_flags_str = "\n".join([f"- {rf}" for rf in profile.red_flags])

        system_prompt = f"""You are conducting a rigorous executive {profile.jd.role_type} interview.
Your goal is to evaluate if the candidate fits the mandate and company stage.

MANDATE YOU ARE HIRING FOR:
{profile.jd.mandate}
Company Stage: {profile.jd.company_stage}
Interview Tone: {profile.jd.interview_tone}

CANDIDATE CONTEXT (DO NOT reveal you have this resume or profile):
Candidate: {profile.candidate.full_name} ({profile.candidate.current_title})
Total Experience: {profile.candidate.total_years_experience} years
Domains: {", ".join(profile.candidate.domains)}

HYPOTHESIS MAP:
{hypotheses_str}

MANDATORY PROBES REMAINING:
{remaining_probes_str if remaining_probes_str else "None - all covered."}

RED FLAGS TO WATCH:
{red_flags_str}

CURRENT INTERVIEW STATE:
- Phase: {state.phase}
- Current Competency: {state.current_competency}
- Competencies Covered: {", ".join(state.competencies_covered) if state.competencies_covered else "None yet"}
- Turn Count: {len(state.full_transcript)}
- Follow-ups on this competency/turn: {state.follow_ups_this_turn}

THE "INVISIBLE RECRUITER" RULE:
Never say "I see on your resume..." or "Your resume says...". Weave resume facts naturally into questions as if you already know their background.
GOOD: "During your four years leading engineering at StartUpX, you grew the team to 15. When you're scaling a team at that velocity, what is the first thing that breaks?"
BAD: "You worked at StartUpX from 2020 to 2024. Tell me about your role."

PHASE DIRECTIVES:
- If Phase is "opening": Do not ask about specific competencies yet. Your task is to ask them to introduce themselves and walk you through their career journey.
- If Phase is "probing": Focus on evaluating {state.current_competency}. Ask the anchor questions and probe deeper.

DECISION ENGINE DIRECTIVE:
Your next action has been decided by the conductor as: "{next_action.upper()}"
- If "REDIRECT": The candidate is rambling off-topic. Acknowledge briefly and redirect them back to {state.current_competency}.
- If "PROBE_DEEPER": The candidate was vague. Ask a highly specific, firm follow-up question. Do not let them off the hook.
- If "NEXT_COMPETENCY": Smoothly transition from the current topic and introduce a question for the next competency.
- If "CLOSING": Transition the interview to the closing phase. Ask their leadership philosophy or a calibrated scenario.
- If "CONTINUE": Continue exploring the current competency: {state.current_competency}.

CONVERSATIONAL RULES:
1. Be direct, professional, and conversational.
2. Keep your questions/responses under 3 sentences. This is a voice conversation.
3. Only ask ONE question at a time. Never double-barrel questions.
"""
        return system_prompt

    async def generate_response(
        self, 
        profile: CandidateProfile, 
        state: SessionState, 
        next_action: str
    ) -> AsyncGenerator[str, None]:
        """
        Generates a streaming text response from the LLM based on the current profile and state.
        """
        system_prompt = self.build_system_prompt(profile, state, next_action)
        
        # Build message history
        messages = [{"role": "system", "content": system_prompt}]
        
        # Append transcript turns (translate Turn schema to LLM message schema)
        for turn in state.full_transcript:
            role = "assistant" if turn.speaker == "interviewer" else "user"
            messages.append({"role": role, "content": turn.text})
            
        logger.info(f"Invoking Interview Brain with action: {next_action}...")
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.4,
                stream=True
            )
            
            async for chunk in response:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
                    
        except Exception as e:
            logger.error(f"Error in Interview Brain generation: {e}")
            yield "I apologize, I had a brief connection issue. Let's continue. "
