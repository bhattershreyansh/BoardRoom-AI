import asyncio
import signal
import logging
from typing import List, Callable, Any
from core.utils.logger import get_logger

logger = get_logger(__name__)

class GracefulShutdown:
    def __init__(self):
        self.shutdown_handlers: List[Callable] = []
        self.is_shutting_down = False
        self._original_handlers = {}
    
    def add_shutdown_handler(self, handler: Callable):
        """Add a function to be called during shutdown."""
        self.shutdown_handlers.append(handler)
        logger.debug(f"Added shutdown handler: {handler.__name__}")
    
    async def shutdown(self, signal_name: str = "unknown"):
        """Execute all shutdown handlers gracefully."""
        if self.is_shutting_down:
            logger.warning("Shutdown already in progress")
            return
        
        self.is_shutting_down = True
        logger.info(f"Starting graceful shutdown (signal: {signal_name})")
        
        # Execute shutdown handlers
        for handler in self.shutdown_handlers:
            try:
                logger.info(f"Executing shutdown handler: {handler.__name__}")
                if asyncio.iscoroutinefunction(handler):
                    await handler()
                else:
                    handler()
                logger.info(f"Shutdown handler completed: {handler.__name__}")
            except Exception as e:
                logger.error(f"Error in shutdown handler {handler.__name__}: {e}")
        
        logger.info("Graceful shutdown completed")
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            signal_name = signal.Signals(signum).name
            logger.info(f"Received signal {signal_name}, initiating graceful shutdown")
            asyncio.create_task(self.shutdown(signal_name))
        
        # Register signal handlers
        for sig in [signal.SIGINT, signal.SIGTERM]:
            self._original_handlers[sig] = signal.signal(sig, signal_handler)
            logger.debug(f"Registered signal handler for {signal.Signals(sig).name}")
    
    def restore_signal_handlers(self):
        """Restore original signal handlers."""
        for sig, handler in self._original_handlers.items():
            signal.signal(sig, handler)
            logger.debug(f"Restored signal handler for {signal.Signals(sig).name}")

# Global graceful shutdown instance
graceful_shutdown = GracefulShutdown()