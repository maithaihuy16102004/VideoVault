import logging
from .stt_engine import STTEngine, STTResult, STTSegment, STTWord
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

class WhisperEngine(STTEngine):
    def __init__(self, model_size="small", device="cpu", compute_type="int8"):
        logger.info(f"Loading Whisper model {model_size} on {device} ({compute_type})")
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type
        )

    def transcribe(self, audio_path: str, language: str | None = None) -> STTResult:
        try:
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500),
                word_timestamps=False # disable for speed
            )
            
            result_segments = []
            for seg in segments:
                result_segments.append(STTSegment(
                    text=seg.text.strip(),
                    start=seg.start,
                    end=seg.end
                ))
                
            return STTResult(
                segments=result_segments,
                language=info.language,
                success=True
            )
            
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            return STTResult(segments=[], language="", success=False, error=str(e))
