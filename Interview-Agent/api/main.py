import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config.settings import settings
from core.utils.logger import get_logger
from api.routes.sessions import router as sessions_router

logger = get_logger(__name__)

app = FastAPI(
    title="CXO Interview Engine API",
    description="Backend API for document ingestion, token vending, and report scoring",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    # allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:5173"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(sessions_router)

@app.get("/")
async def root():
    return {"message": "CXO Interview Engine API is active."}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    logger.info("Starting FastAPI server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
