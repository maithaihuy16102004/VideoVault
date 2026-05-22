from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, List

class PipelineStage(str, Enum):
    AUDIO_EXTRACTION = "audio_extraction"
    VOCAL_SEPARATION = "vocal_separation"
    SPEAKER_DIARIZATION = "speaker_diarization"
    SPEECH_TO_TEXT = "speech_to_text"
    TRANSLATION = "translation"
    VIETNAMESE_REWRITE = "vietnamese_rewrite"
    SUBTITLE_COMPRESSION = "subtitle_compression"
    EMOTION_DETECTION = "emotion_detection"
    SENTENCE_SEGMENTATION = "sentence_segmentation"
    TIMING_ALIGNMENT = "timing_alignment"
    TTS_GENERATION = "tts_generation"
    VOICE_CLONE = "voice_clone"
    SILENCE_SHAPING = "silence_shaping"
    LOUDNESS_NORMALIZATION = "loudness_normalization"
    AUDIO_MERGE = "audio_merge"
    SUBTITLE_GENERATION = "subtitle_generation"
    FINAL_RENDER = "final_render"

class EmotionType(str, Enum):
    NEUTRAL = "neutral"
    EXCITED = "excited"
    FUNNY = "funny"
    DRAMATIC = "dramatic"
    EMOTIONAL = "emotional"
    SUSPENSE = "suspense"
    ROMANTIC = "romantic"
    STORYTELLING = "storytelling"

class SpeechSegment(BaseModel):
    """A single speech segment with all metadata for dubbing."""
    index: int
    speaker_id: str = "SPEAKER_0"
    start_time: float          # seconds
    end_time: float            # seconds
    original_text: str = ""
    translated_text: str = ""
    rewritten_text: str = ""   # Vietnamese-adapted text
    compressed_text: str = ""  # Duration-fitted text
    emotion: EmotionType = EmotionType.NEUTRAL
    emotion_confidence: float = 0.0
    
    # Timing
    original_duration: float = 0.0
    target_duration: float = 0.0     # available duration for TTS
    tts_raw_duration: float = 0.0    # actual TTS output duration
    speed_factor: float = 1.0        # applied speed adjustment
    
    # Audio paths
    tts_audio_path: str = ""
    processed_audio_path: str = ""   # after silence shaping + normalization
    
    # Silence
    pre_silence: float = 0.0    # silence before this segment
    post_silence: float = 0.0   # silence after this segment
    
    @property
    def duration(self) -> float:
        return self.end_time - self.start_time

class PipelineJob(BaseModel):
    """Complete pipeline job state."""
    job_id: str
    video_path: str
    target_language: str = "vi"
    
    # Configuration
    tts_engine: str = "edge-tts"      # "cosyvoice", "edge-tts", "piper"
    enable_voice_clone: bool = False
    enable_emotion: bool = True
    speed_min: float = 0.92
    speed_max: float = 1.08
    
    # Pipeline state
    current_stage: PipelineStage = PipelineStage.AUDIO_EXTRACTION
    progress: float = 0.0
    status: str = "queued"            # queued, processing, completed, failed
    error_message: str = ""
    
    # Intermediate artifacts
    audio_path: str = ""              # extracted full audio
    vocals_path: str = ""             # isolated vocals
    accompaniment_path: str = ""      # background/music track
    segments: List[SpeechSegment] = []
    
    # Output
    dubbed_audio_path: str = ""
    subtitle_path: str = ""           # .ass file
    output_video_path: str = ""       # final rendered video
    
    # Metadata
    video_duration: float = 0.0
    video_fps: float = 30.0
    video_width: int = 0
    video_height: int = 0
    original_language: str = ""
    speaker_count: int = 1
