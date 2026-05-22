import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 5060
    
    # Paths
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "../../storage")
    DUBBING_STORAGE_PATH: str = os.path.join(STORAGE_PATH, "dubbing")
    
    # Model Settings
    TTS_DEFAULT_ENGINE: str = "edge-tts"
    STT_MODEL_SIZE: str = "small"
    STT_COMPUTE_TYPE: str = "int8"
    
    # Processing Limits
    MAX_VIDEO_DURATION_SECONDS: int = 600  # 10 minutes
    MAX_CONCURRENT_JOBS: int = 1
    
    class Config:
        env_file = ".env"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.DUBBING_STORAGE_PATH, exist_ok=True)
