import logging
import asyncio
from typing import Callable, Awaitable
from .models import PipelineJob, PipelineStage
from .stage_manager import StageManager
from . import stages

logger = logging.getLogger(__name__)

class PipelineOrchestrator:
    def __init__(self, update_callback: Callable[[PipelineJob], Awaitable[None]]):
        self.manager = StageManager(update_callback)
        self.update_callback = update_callback
        
        # Register all stages
        self.manager.register_stage(PipelineStage.AUDIO_EXTRACTION, stages.s01_audio_extraction)
        self.manager.register_stage(PipelineStage.VOCAL_SEPARATION, stages.s02_vocal_separation)
        self.manager.register_stage(PipelineStage.SPEAKER_DIARIZATION, stages.s03_speaker_diarization)
        self.manager.register_stage(PipelineStage.SPEECH_TO_TEXT, stages.s04_speech_to_text)
        self.manager.register_stage(PipelineStage.TRANSLATION, stages.s05_translation)
        self.manager.register_stage(PipelineStage.VIETNAMESE_REWRITE, stages.s06_vietnamese_rewrite)
        self.manager.register_stage(PipelineStage.SUBTITLE_COMPRESSION, stages.s07_subtitle_compression)
        self.manager.register_stage(PipelineStage.EMOTION_DETECTION, stages.s08_emotion_detection)
        self.manager.register_stage(PipelineStage.SENTENCE_SEGMENTATION, stages.s09_sentence_segmentation)
        self.manager.register_stage(PipelineStage.TIMING_ALIGNMENT, stages.s10_timing_alignment)
        self.manager.register_stage(PipelineStage.TTS_GENERATION, stages.s11_tts_generation)
        self.manager.register_stage(PipelineStage.VOICE_CLONE, stages.s12_voice_clone)
        self.manager.register_stage(PipelineStage.SILENCE_SHAPING, stages.s13_silence_shaping)
        self.manager.register_stage(PipelineStage.LOUDNESS_NORMALIZATION, stages.s14_loudness_normalization)
        self.manager.register_stage(PipelineStage.AUDIO_MERGE, stages.s15_audio_merge)
        self.manager.register_stage(PipelineStage.SUBTITLE_GENERATION, stages.s16_subtitle_generation)
        self.manager.register_stage(PipelineStage.FINAL_RENDER, stages.s17_final_render)
        
        # Define progress weights for each stage
        self.stage_progress = {
            PipelineStage.AUDIO_EXTRACTION: 2,
            PipelineStage.VOCAL_SEPARATION: 10,
            PipelineStage.SPEAKER_DIARIZATION: 15,
            PipelineStage.SPEECH_TO_TEXT: 25,
            PipelineStage.TRANSLATION: 30,
            PipelineStage.VIETNAMESE_REWRITE: 35,
            PipelineStage.SUBTITLE_COMPRESSION: 38,
            PipelineStage.EMOTION_DETECTION: 42,
            PipelineStage.SENTENCE_SEGMENTATION: 45,
            PipelineStage.TIMING_ALIGNMENT: 50,
            PipelineStage.TTS_GENERATION: 70,
            PipelineStage.VOICE_CLONE: 75,
            PipelineStage.SILENCE_SHAPING: 78,
            PipelineStage.LOUDNESS_NORMALIZATION: 80,
            PipelineStage.AUDIO_MERGE: 85,
            PipelineStage.SUBTITLE_GENERATION: 90,
            PipelineStage.FINAL_RENDER: 100
        }

    async def run_pipeline(self, job: PipelineJob):
        """Run the full pipeline sequentially."""
        try:
            logger.info(f"Starting pipeline for job {job.job_id}")
            
            # Ordered list of stages
            ordered_stages = [
                PipelineStage.AUDIO_EXTRACTION, PipelineStage.VOCAL_SEPARATION,
                PipelineStage.SPEAKER_DIARIZATION, PipelineStage.SPEECH_TO_TEXT,
                PipelineStage.TRANSLATION, PipelineStage.VIETNAMESE_REWRITE,
                PipelineStage.SUBTITLE_COMPRESSION, PipelineStage.EMOTION_DETECTION,
                PipelineStage.SENTENCE_SEGMENTATION, PipelineStage.TIMING_ALIGNMENT,
                PipelineStage.TTS_GENERATION, PipelineStage.VOICE_CLONE,
                PipelineStage.SILENCE_SHAPING, PipelineStage.LOUDNESS_NORMALIZATION,
                PipelineStage.AUDIO_MERGE, PipelineStage.SUBTITLE_GENERATION,
                PipelineStage.FINAL_RENDER
            ]
            
            for stage in ordered_stages:
                progress = self.stage_progress[stage]
                job = await self.manager.execute_stage(job, stage, progress)
                
            job.status = "completed"
            await self.update_callback(job)
            logger.info(f"Pipeline completed successfully for job {job.job_id}")
            
        except Exception as e:
            logger.error(f"Pipeline failed for job {job.job_id}: {e}")
            job.status = "failed"
            job.error_message = str(e)
            await self.update_callback(job)
