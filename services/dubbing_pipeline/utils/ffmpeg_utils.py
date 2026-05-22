import subprocess
import logging
import os

logger = logging.getLogger(__name__)

def check_nvidia_gpu() -> bool:
    """Check if NVIDIA GPU is available for FFmpeg acceleration."""
    try:
        result = subprocess.run(
            ["nvidia-smi"],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False

def extract_metadata(video_path: str) -> dict:
    """Extract width, height, fps, duration from video."""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,r_frame_rate,duration",
            "-of", "json",
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        import json
        data = json.loads(result.stdout)
        stream = data.get("streams", [{}])[0]
        
        # Parse fps
        fps_str = stream.get("r_frame_rate", "30/1")
        num, den = fps_str.split("/")
        fps = float(num) / float(den) if float(den) > 0 else 30.0
        
        return {
            "width": int(stream.get("width", 1080)),
            "height": int(stream.get("height", 1920)),
            "fps": fps,
            "duration": float(stream.get("duration", 0))
        }
    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        return {"width": 1080, "height": 1920, "fps": 30.0, "duration": 0.0}
