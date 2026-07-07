import logging
import structlog
import sys
from typing import Any, Dict
import time
import uuid
from datetime import datetime
from functools import wraps
import inspect

def setup_logging(
    level: str = "INFO",
    enable_json: bool = True,
    enable_colors: bool = True
) -> None:
    """
    Setup structured logging with correlation IDs and performance tracking.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR)
        enable_json: Whether to output JSON format (production)
        enable_colors: Whether to use colored output (development)
    """
    
    # Configure stdlib logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level.upper()),
    )
    
    # Shared processors for both configurations
    shared_processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        add_correlation_id,
        add_timestamp,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    if enable_json:
        # Production: JSON output
        processors = shared_processors + [structlog.processors.JSONRenderer()]
    else:
        # Development: Pretty colored output
        if enable_colors:
            processors = shared_processors + [
                structlog.dev.ConsoleRenderer(colors=True)
            ]
        else:
            processors = shared_processors + [
                structlog.dev.ConsoleRenderer(colors=False)
            ]
    
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

def add_correlation_id(logger, method_name, event_dict) -> Dict[str, Any]:
    """Add correlation ID for request tracking."""
    if 'correlation_id' not in event_dict:
        # Try to get correlation ID from context
        try:
            from core.utils.correlation import get_correlation_id
            correlation_id = get_correlation_id()
            if correlation_id:
                event_dict['correlation_id'] = correlation_id[:8]  # Truncate for readability
            else:
                event_dict['correlation_id'] = str(uuid.uuid4())[:8]
        except ImportError:
            # Fallback if correlation module not available
            event_dict['correlation_id'] = str(uuid.uuid4())[:8]
    return event_dict

def add_timestamp(logger, method_name, event_dict) -> Dict[str, Any]:
    """Add ISO timestamp."""
    event_dict['timestamp'] = datetime.utcnow().isoformat()
    return event_dict

def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a configured logger instance."""
    return structlog.get_logger(name)

class PerformanceLogger:
    """Context manager for performance tracking."""
    
    def __init__(self, logger: structlog.stdlib.BoundLogger, operation: str, **context):
        self.logger = logger
        self.operation = operation
        self.context = context
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        self.logger.info(
            "Operation started",
            operation=self.operation,
            **self.context
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        
        if exc_type:
            self.logger.error(
                "Operation failed",
                operation=self.operation,
                duration_seconds=round(duration, 3),
                error_type=exc_type.__name__,
                error_message=str(exc_val),
                **self.context
            )
        else:
            self.logger.info(
                "Operation completed",
                operation=self.operation,
                duration_seconds=round(duration, 3),
                **self.context
            )

def log_performance(operation: str, **context):
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            with PerformanceLogger(logger, operation, **context):
                return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            with PerformanceLogger(logger, operation, **context):
                return func(*args, **kwargs)

        return async_wrapper if inspect.iscoroutinefunction(func) else sync_wrapper
    return decorator