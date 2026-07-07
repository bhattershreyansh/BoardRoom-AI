import asyncio
import os
import sys

# Add the current directory to the path so we can import 'api'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import delete
from api.database import SessionLocal
from api.models import InterviewSession

async def clear_database():
    print("Connecting to database to clear all interview sessions...")
    try:
        async with SessionLocal() as db:
            # Delete all rows from InterviewSession table
            result = await db.execute(delete(InterviewSession))
            await db.commit()
            print(f"Successfully deleted {result.rowcount} interview sessions from the database!")
    except Exception as e:
        print(f"Error clearing database: {e}")

if __name__ == "__main__":
    asyncio.run(clear_database())
