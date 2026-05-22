import subprocess
import os
import sys
import logging
from .tts_engine import TTSEngine, TTSResult, VoiceInfo
from ..pipeline.models import EmotionType
from ..utils.audio_utils import get_audio_duration

logger = logging.getLogger(__name__)

class EdgeTTSEngine(TTSEngine):
    def __init__(self):
        self.voices = [
            VoiceInfo(id="vi-VN-HoaiMyNeural", name="Hoài My", gender="Female", language="vi"),
            VoiceInfo(id="vi-VN-NamMinhNeural", name="Nam Minh", gender="Male", language="vi")
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
        """Generate audio using Microsoft Edge TTS."""
        
        # Edge TTS takes a rate adjustment as a percentage (e.g. +10%, -5%)
        # Convert our speed multiplier (e.g. 1.05) to Edge TTS rate
        rate_percent = int((speed - 1.0) * 100)
        rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"
        
        try:
            cmd = [
                sys.executable, "-m", "edge_tts",
                "--voice", voice,
                "--text", text,
                "--rate", rate_str,
                "--write-media", output_path
            ]
            
            # Note: subprocess.run is blocking. In a real async environment, 
            # we should use asyncio.create_subprocess_exec. Using subprocess.run 
            # here for simplicity as we have sequential execution requirement anyway.
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0 and os.path.exists(output_path):
                duration = get_audio_duration(output_path)
                return TTSResult(
                    audio_path=output_path,
                    duration=duration,
                    success=True
                )
            else:
                return TTSResult(
                    audio_path="",
                    duration=0.0,
                    success=False,
                    error=f"edge-tts failed: {result.stderr}"
                )
                
        except Exception as e:
            logger.error(f"TTS generation error: {e}")
            return TTSResult(
                audio_path="",
                duration=0.0,
                success=False,
                error=str(e)
            )
