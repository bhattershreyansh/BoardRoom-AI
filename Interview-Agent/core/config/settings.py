from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseSettings):
    # LiveKit
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    
    # Groq
    groq_api_key: str = os.getenv("GROQ_API_KEY")
    groq_model: str = "openai/gpt-oss-120b" 
    groq_competency_model: str = "openai/gpt-oss-20b" 

    # Deepgram (STT)
    deepgram_api_key: Optional[str] = None

    # Weaviate (ingestion/retrieval — wire up when implemented)
    weaviate_url: str = "http://localhost:8080"
    weaviate_api_key: Optional[str] = None

    # Redis (API rate limiting)
    redis_host: str = "localhost"
    redis_port: int = 6379

    # Logging
    log_level: str = "INFO"
    log_format: str = "pretty"

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # Security / API
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000

    # Database
    database_url: str = os.getenv("DATABASE_URL", "")

    # SMTP Configuration
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_sender: str = os.getenv("SMTP_SENDER", "interviews@futureagi.com")

    # Voice agent
    max_conversation_history: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
