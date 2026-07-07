from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from core.config.settings import settings

# Neon PostgreSQL connection strings start with postgresql:// and use sslmode=require
# We replace postgresql:// with postgresql+asyncpg:// and sslmode=require with ssl=require
db_url = settings.database_url
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
if "sslmode=require" in db_url:
    db_url = db_url.replace("sslmode=require", "ssl=require")

# Create Async Engine
engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,  # Automatically tests connection health
)

# Async Session Factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db():
    """Dependency generator for FastAPI routes."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
