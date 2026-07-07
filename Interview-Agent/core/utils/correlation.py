"""
Correlation ID management for distributed tracing.
"""
import uuid
import contextvars
from typing import Optional

# Context variable to store correlation ID across async calls
correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    'correlation_id', default=None
)

def generate_correlation_id() -> str:
    """Generate a new correlation ID."""
    return str(uuid.uuid4())

def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID from context."""
    return correlation_id_var.get()

def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID in context."""
    correlation_id_var.set(correlation_id)

def ensure_correlation_id() -> str:
    """Ensure a correlation ID exists, creating one if necessary."""
    correlation_id = get_correlation_id()
    if correlation_id is None:
        correlation_id = generate_correlation_id()
        set_correlation_id(correlation_id)
    return correlation_id

class CorrelationContext:
    """Context manager for correlation ID tracking."""
    
    def __init__(self, correlation_id: Optional[str] = None):
        self.correlation_id = correlation_id or generate_correlation_id()
        self.token = None
    
    def __enter__(self):
        self.token = correlation_id_var.set(self.correlation_id)
        return self.correlation_id
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.token is not None:
            correlation_id_var.reset(self.token)

async def with_correlation_id(correlation_id: Optional[str] = None):
    """Async context manager for correlation ID tracking."""
    correlation_id = correlation_id or generate_correlation_id()
    token = correlation_id_var.set(correlation_id)
    try:
        yield correlation_id
    finally:
        correlation_id_var.reset(token)