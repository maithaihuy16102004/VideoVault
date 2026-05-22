import asyncio
import uuid
import logging
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict

from .config import settings
from .pipeline.models import PipelineJob
from .pipeline.orchestrator import PipelineOrchestrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="VideoVault AI Dubbing Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store
jobs_store: Dict[str, PipelineJob] = {}

class StartDubbingRequest(BaseModel):
    video_path: str
    target_language: str = "vi"
    tts_engine: str = "edge-tts"
    enable_voice_clone: bool = False
    enable_emotion: bool = True

async def on_job_update(job: PipelineJob):
    """Callback to update job state and potentially notify .NET backend."""
    jobs_store[job.job_id] = job
    logger.info(f"Job {job.job_id} updated: {job.current_stage} ({job.progress}%) - {job.status}")
    # Here you could make an HTTP request to .NET backend to trigger SignalR updates.

@app.post("/api/pipeline/start")
async def start_pipeline(req: StartDubbingRequest, bg_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    
    job = PipelineJob(
        job_id=job_id,
        video_path=req.video_path,
        target_language=req.target_language,
        tts_engine=req.tts_engine,
        enable_voice_clone=req.enable_voice_clone,
        enable_emotion=req.enable_emotion
    )
    
    jobs_store[job_id] = job
    
    orchestrator = PipelineOrchestrator(on_job_update)
    bg_tasks.add_task(orchestrator.run_pipeline, job)
    
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/pipeline/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_store[job_id]
    return {
        "job_id": job.job_id,
        "status": job.status,
        "progress": job.progress,
        "current_stage": job.current_stage,
        "error_message": job.error_message,
        "output_video_path": job.output_video_path,
        "subtitle_path": job.subtitle_path
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "dubbing_pipeline"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
