import logging
import os
import subprocess
import sys

from .tts_engine import TTSEngine, TTSResult, VoiceInfo
from ..pipeline.models import EmotionType
from ..utils.audio_utils import get_audio_duration

logger = logging.getLogger(__name__)


class EdgeTTSEngine(TTSEngine):
    def __init__(self):
        self.voices = [
            VoiceInfo(
                id="vi-VN-HoaiMyNeural",
                name="HoaiMy Neural",
                gender="Female",
                language="vi",
                country="Vietnam",
                accent="Southern",
                engine="edge-tts",
                quality_score=94,
                tags=["Fashion", "TikTok Viral", "Young", "Friendly"],
            ),
            VoiceInfo(
                id="vi-VN-NamMinhNeural",
                name="NamMinh Neural",
                gender="Male",
                language="vi",
                country="Vietnam",
                accent="Northern",
                engine="edge-tts",
                quality_score=92,
                tags=["Finance", "Tech Review", "News", "Professional"],
            ),
        ]

    def get_available_voices(self) -> list[VoiceInfo]:
        return self.voices

    async def synthesize(
        self,
        text: str,
        voice: str,
        speed: float = 1.0,
        emotion: EmotionType = EmotionType.NEUTRAL,
        output_path: str = "",
    ) -> TTSResult:
        """Generate audio using Microsoft Edge TTS."""
        rate_percent = int((speed - 1.0) * 100)
        rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"

        try:
            if output_path and os.path.exists(output_path):
                os.remove(output_path)

            cmd = [
                sys.executable,
                "-m",
                "edge_tts",
                "--voice",
                voice,
                "--text",
                text,
                "--rate",
                rate_str,
                "--write-media",
                output_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

            if result.returncode == 0 and os.path.exists(output_path):
                duration = get_audio_duration(output_path)
                return TTSResult(audio_path=output_path, duration=duration, success=True)

            return TTSResult(
                audio_path="",
                duration=0.0,
                success=False,
                error=f"edge-tts failed: {result.stderr}",
            )
        except Exception as exc:
            logger.error("TTS generation error: %s", exc)
            return TTSResult(audio_path="", duration=0.0, success=False, error=str(exc))
