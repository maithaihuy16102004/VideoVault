from abc import ABC, abstractmethod
from typing import List
from pydantic import BaseModel

class STTWord(BaseModel):
    word: str
    start: float
    end: float

class STTSegment(BaseModel):
    text: str
    start: float
    end: float
    words: List[STTWord] = []

class STTResult(BaseModel):
    segments: List[STTSegment]
    language: str
    success: bool = True
    error: str = ""

class STTEngine(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str, language: str = "vi") -> STTResult:
        """Transcribe audio to text segments with timestamps."""
        pass
