import weaviate
from weaviate.classes.init import Auth
from core.config.settings import settings
from core.utils.logger import get_logger

logger = get_logger(__name__)

class WeaviateStore:
    def __init__(self):
        self.url = settings.weaviate_url
        self.api_key = settings.weaviate_api_key
        self.client = None

    def connect(self):
        """Initialize Weaviate client."""
        try:
            if self.api_key:
                self.client = weaviate.connect_to_local(
                    host=self.url.replace("http://", "").replace("https://", "").split(":")[0],
                    port=int(self.url.split(":")[-1]) if ":" in self.url.replace("http://", "").replace("https://", "") else 8080,
                    auth_credentials=Auth.api_key(self.api_key)
                )
            else:
                # No auth (e.g. local docker)
                self.client = weaviate.connect_to_local(
                    host=self.url.replace("http://", "").replace("https://", "").split(":")[0],
                    port=int(self.url.split(":")[-1]) if ":" in self.url.replace("http://", "").replace("https://", "") else 8080
                )
            
            logger.info("Successfully connected to Weaviate")
        except Exception as e:
            logger.error(f"Failed to connect to Weaviate: {e}")
            raise e

    def close(self):
        """Close Weaviate connection."""
        if self.client:
            self.client.close()
            logger.info("Closed Weaviate connection")

    # TODO: Add methods for creating collections and inserting data
    # (e.g., storing interview transcripts, candidate profiles)
