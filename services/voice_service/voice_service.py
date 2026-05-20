#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Voice Service — Flask microservice for TTS and audio processing.

Endpoints:
    POST /api/tts/generate     — Generate TTS audio from text
    POST /api/tts/preview       — Quick preview of a voice
    POST /api/audio/process     — Process and enhance audio (speed, trim, normalize)
    GET  /api/health            — Health check

Used by the .NET backend (VideoVault.API) to generate dubbed audio
for translated video subtitles.
"""

import os
import sys
import uuid
import hashlib
import subprocess
import tempfile
import logging
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
TEMP_AUDIO_DIR = BASE_DIR / "temp_audio"
PREVIEW_CACHE_DIR = BASE_DIR / "preview_cache"
TEMP_AUDIO_DIR.mkdir(exist_ok=True)
PREVIEW_CACHE_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds using ffprobe."""
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
    except Exception as e:
        logger.error(f"Failed to get audio duration: {e}")
        return 0.0


def strip_silence(input_path: str, output_path: str) -> str:
    """Remove leading/trailing silence from audio using ffmpeg silenceremove."""
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(input_path),
                "-af", "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,"
                       "areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,areverse",
                str(output_path)
            ],
            capture_output=True, text=True, timeout=30
        )
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path
    except Exception as e:
        logger.warning(f"Silence stripping failed: {e}")
    return input_path


def process_and_enhance_audio(
    input_path: str,
    output_path: str,
    speed_factor: float = 1.0,
    normalize: bool = True
) -> str:
    """Process audio: apply speed adjustment and loudness normalization."""
    filters = []

    # 1. Normalize loudness
    if normalize:
        filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")

    # 2. Add speed control if needed
    if speed_factor > 1.01:
        # Cap at 1.05x — user requested NO automatic speedup.
        # The translation prompt handles keeping text short enough.
        capped_factor = min(speed_factor, 1.05)
        filters.append(f"atempo={capped_factor:.4f}")

    if not filters:
        # No processing needed, just copy
        import shutil
        shutil.copy2(input_path, output_path)
        return output_path

    filter_chain = ",".join(filters)
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(input_path),
                "-af", filter_chain,
                "-ar", "44100", "-ac", "1",
                str(output_path)
            ],
            capture_output=True, text=True, timeout=60
        )
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path
    except Exception as e:
        logger.error(f"Audio processing failed: {e}")
    return input_path


def generate_tts_audio(text: str, voice: str, output_path: str) -> bool:
    """
    Generate TTS audio using edge-tts.
    
    Args:
        text: The text to synthesize.
        voice: The voice identifier (e.g. 'vi-VN-HoaiMyNeural').
        output_path: Path to save the generated audio file.
    
    Returns:
        True if generation was successful.
    """
    try:
        result = subprocess.run(
            [
                sys.executable, "-m", "edge_tts",
                "--voice", voice,
                "--text", text,
                "--write-media", str(output_path)
            ],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0 and os.path.exists(output_path):
            return True
        else:
            logger.error(f"edge-tts failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        return False


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "voice-service"})


@app.route("/api/tts/generate", methods=["POST"])
def tts_generate():
    """
    Generate TTS audio from text.
    
    Request JSON:
        text (str): Text to synthesize
        voice (str): Voice identifier (default: vi-VN-HoaiMyNeural)
        max_duration (float, optional): Maximum allowed duration in seconds
        job_id (str, optional): Job ID for organizing output files
    
    Returns:
        The generated audio file (WAV/MP3)
    """
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"]
    voice = data.get("voice", "vi-VN-HoaiMyNeural")
    max_duration = data.get("max_duration", None)
    job_id = data.get("job_id", str(uuid.uuid4()))

    # Create job-specific directory
    job_dir = TEMP_AUDIO_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    chunk_id = str(uuid.uuid4())[:8]
    raw_path = str(job_dir / f"raw_{chunk_id}.mp3")
    stripped_path = str(job_dir / f"stripped_{chunk_id}.mp3")
    final_path = str(job_dir / f"final_{chunk_id}.mp3")

    # Step 1: Generate raw TTS
    if not generate_tts_audio(text, voice, raw_path):
        return jsonify({"error": "TTS generation failed"}), 500

    # Step 2: Strip silence
    actual_input = strip_silence(raw_path, stripped_path)

    # Step 3: Calculate speed factor if max_duration is specified
    speed_factor = 1.0
    if max_duration and max_duration > 0:
        current_duration = get_audio_duration(actual_input)
        if current_duration > 0 and current_duration > max_duration:
            speed_factor = current_duration / max_duration
            logger.info(
                f"Audio duration {current_duration:.2f}s > max {max_duration:.2f}s, "
                f"speed factor: {speed_factor:.2f}x"
            )

    # Step 4: Process and enhance
    result_path = process_and_enhance_audio(
        actual_input, final_path, speed_factor=speed_factor
    )

    final_duration = get_audio_duration(result_path)
    logger.info(f"Generated TTS: text='{text[:50]}...', duration={final_duration:.2f}s")

    return send_file(
        result_path,
        mimetype="audio/mpeg",
        as_attachment=True,
        download_name=f"tts_{chunk_id}.mp3"
    )


@app.route("/api/tts/preview", methods=["POST"])
def tts_preview():
    """
    Quick preview of a voice with caching.
    
    Request JSON:
        text (str): Text to preview
        voice (str): Voice identifier
    
    Returns:
        The preview audio file
    """
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"]
    voice = data.get("voice", "vi-VN-HoaiMyNeural")

    # Cache key based on text + voice
    cache_key = hashlib.md5(f"{voice}:{text}".encode()).hexdigest()
    cache_path = PREVIEW_CACHE_DIR / f"{cache_key}.wav"

    if cache_path.exists():
        return send_file(str(cache_path), mimetype="audio/wav")

    # Generate fresh preview
    if not generate_tts_audio(text, voice, str(cache_path)):
        return jsonify({"error": "Preview generation failed"}), 500

    return send_file(str(cache_path), mimetype="audio/wav")


@app.route("/api/audio/process", methods=["POST"])
def audio_process():
    """
    Process an uploaded audio file.
    
    Form data:
        file: Audio file to process
        speed (float): Speed factor (default: 1.0)
        normalize (bool): Whether to normalize loudness (default: true)
    
    Returns:
        The processed audio file
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    audio_file = request.files["file"]
    speed = float(request.form.get("speed", 1.0))
    normalize = request.form.get("normalize", "true").lower() == "true"

    # Save uploaded file
    temp_input = str(TEMP_AUDIO_DIR / f"input_{uuid.uuid4().hex[:8]}.mp3")
    temp_output = str(TEMP_AUDIO_DIR / f"output_{uuid.uuid4().hex[:8]}.mp3")
    audio_file.save(temp_input)

    result_path = process_and_enhance_audio(
        temp_input, temp_output,
        speed_factor=speed, normalize=normalize
    )

    return send_file(
        result_path,
        mimetype="audio/mpeg",
        as_attachment=True,
        download_name="processed_audio.mp3"
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logger.info("Starting Voice Service on port 5052...")
    app.run(host="0.0.0.0", port=5052, debug=True)
