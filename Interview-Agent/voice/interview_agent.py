import asyncio
from livekit.agents import Agent, llm
from livekit.plugins import deepgram, openai, silero
from core.utils.logger import get_logger

class InterviewVoiceAgent(Agent):
    """
    Production-ready Voice Agent for Interviews.
    Unlike the old Meeting Assistant, this uses Full Context Injection (no RAG).
    """
    def __init__(self, interview_context: str):
        self.logger = get_logger(__name__)
        
        master_prompt = f"""You are a professional AI interviewer conducting a job interview.
You have full access to the candidate's resume and the job description.

=== INTERVIEW CONTEXT & PLAN ===
{interview_context}
================================

INSTRUCTIONS:
1. Conduct the interview naturally as if you were on a real phone call.
2. Follow the interview plan provided in the context.
3. Ask ONE question at a time. Wait for the candidate to finish before responding.
4. If the candidate gives a vague answer, ask follow-up questions to dig deeper.
5. Do NOT hallucinate information about the company or the candidate outside of the provided context.
"""
        
        # We drop the DummyLLM and RAG system. We use standard OpenAI LLM directly.
        super().__init__(
            instructions=master_prompt,
            vad=silero.VAD.load(),
            stt=deepgram.STT(),
            llm=openai.LLM(model="gpt-4o-mini"), 
            tts=openai.TTS(),
        )
        self.logger.info("Interview Voice Agent initialized with full context injection.")

def create_interview_agent(interview_context: str) -> InterviewVoiceAgent:
    return InterviewVoiceAgent(interview_context)
