import logging
from typing import Callable, Awaitable
from .models import PipelineJob, PipelineStage

logger = logging.getLogger(__name__)

class StageManager:
    def __init__(self, update_callback: Callable[[PipelineJob], Awaitable[None]]):
        self.update_callback = update_callback
        self.stages = {}
        
    def register_stage(self, stage: PipelineStage, handler: Callable[[PipelineJob], Awaitable[PipelineJob]]):
        self.stages[stage] = handler
        
    async def execute_stage(self, job: PipelineJob, stage: PipelineStage, progress_val: float) -> PipelineJob:
        if stage not in self.stages:
            raise ValueError(f"Stage {stage} not registered")
            
        logger.info(f"Executing stage: {stage} for job {job.job_id}")
        job.current_stage = stage
        job.status = "processing"
        
        try:
            job = await self.stages[stage](job)
            job.progress = progress_val
            await self.update_callback(job)
            return job
        except Exception as e:
            logger.error(f"Error in stage {stage}: {e}")
            job.status = "failed"
            job.error_message = str(e)
            await self.update_callback(job)
            raise e
