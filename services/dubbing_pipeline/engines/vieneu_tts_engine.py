import logging
from .tts_engine import TTSEngine, TTSResult, VoiceInfo
from ..pipeline.models import EmotionType

logger = logging.getLogger(__name__)

class VieneuTTSEngine(TTSEngine):
    def __init__(self):
        self.voices = [
            VoiceInfo(id="default_female", name="VieNeu Female", gender="Female", language="vi"),
            VoiceInfo(id="default_male", name="VieNeu Male", gender="Male", language="vi"),
            VoiceInfo(id="clone", name="VieNeu Clone", gender="Unknown", language="vi")
        ]

    def get_available_voices(self) -> list[VoiceInfo]:
        return self.voices

    async def synthesize(
        self,
        text: str,
        voice: str,
        speed: float = 1.0,
        emotion: EmotionType = EmotionType.NEUTRAL,
        output_path: str = ""
    ) -> TTSResult:
        """Generate audio using VieNeu-TTS when a real adapter is installed."""
        logger.info(f"Synthesizing with VieNeu-TTS | Voice: {voice} | Emotion: {emotion}")

        return TTSResult(
            audio_path="",
            duration=0.0,
            success=False,
            error="VieNeu TTS engine is not connected. Edge TTS fallback is disabled to avoid wrong voice output.",
        )
