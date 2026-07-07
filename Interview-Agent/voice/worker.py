import os
import asyncio
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, AgentSession
from voice.interview_agent import create_interview_agent
from core.utils.logger import get_logger

logger = get_logger(__name__)

async def entrypoint(ctx: JobContext):
    logger.info("Starting Interview Agent worker")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # TODO: Fetch the pre-computed "Interview Plan" (JD + Resume) from the Ingestion/Conductor module.
    # For now, we use a placeholder context.
    dummy_interview_context = (
        "Role: Senior Frontend Engineer.\n"
        "Candidate Background: 5 years in React, Next.js.\n"
        "Focus Areas: State management, Web Vitals, Leadership."
    )

    agent = create_interview_agent(dummy_interview_context)
    session = AgentSession()
    
    try:
        await session.start(agent=agent, room=ctx.room)
        await session.say("Hello, I am your AI interviewer. Are you ready to begin?", allow_interruptions=True)
        logger.info("Voice session started successfully")
    except Exception as e:
        logger.error(f"Failed to start voice session: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
