import asyncio
import sys
import os

# Add root folder to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import engine, Base
from api.models import InterviewSession

async def init_models():
    print("Connecting to Neon PostgreSQL database and initializing tables...")
    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_models())
