import os
import subprocess
import librosa
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from typing import Tuple

def get_audio_duration(file_path: str) -> float:
    """Get audio duration using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(file_path)
            ],
            capture_output=True, text=True, timeout=10
        )
        return float(result.stdout.strip())
    except Exception:
        # Fallback to librosa
        try:
            return librosa.get_duration(path=file_path)
        except Exception:
            return 0.0

def load_audio(file_path: str, sr: int = 44100) -> Tuple[np.ndarray, int]:
    """Load audio file into numpy array."""
    y, sr_out = librosa.load(file_path, sr=sr, mono=True)
    return y, sr_out

def save_audio(file_path: str, y: np.ndarray, sr: int = 44100):
    """Save numpy array to audio file."""
    sf.write(file_path, y, sr)

def measure_loudness(file_path: str) -> float:
    """Measure integrated loudness in LUFS."""
    try:
        y, sr = load_audio(file_path)
        meter = pyln.Meter(sr)
        return meter.integrated_loudness(y)
    except Exception:
        return -20.0
