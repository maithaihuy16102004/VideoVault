from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel
from ..pipeline.models import EmotionType

class VoiceInfo(BaseModel):
    id: str
    name: str
    gender: str
    language: str
    country: str = ""
    accent: str = ""
    engine: str = ""
    quality_score: int = 0
    tags: list[str] = []

class TTSResult(BaseModel):
    audio_path: str
    duration: float
    sample_rate: int = 44100
    success: bool = True
    error: str = ""

class TTSEngine(ABC):
    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice: str,
        speed: float = 1.0,
        emotion: EmotionType = EmotionType.NEUTRAL,
        output_path: str = ""
    ) -> TTSResult:
        """Generate speech audio from text."""
        pass
    
    @abstractmethod
    def get_available_voices(self) -> List[VoiceInfo]:
        """Return list of available voices."""
        pass
