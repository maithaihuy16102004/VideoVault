#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Voice Service — Flask microservice for TTS and audio processing.

Endpoints:
    POST /api/tts/generate     — Generate TTS audio from text (multi-engine)
    POST /api/tts/preview       — Quick preview of a voice
    POST /api/tts/clone         — Voice clone from source audio
    GET  /api/registry          — Engine registry (ITtsProvider.GetEngineRegistry)
    GET  /api/voices            — Available voices (ITtsProvider.GetVoices)
    POST /api/audio/process     — Process and enhance audio
    GET  /api/health            — Health check

Used by the .NET backend (VideoVault.API) to generate dubbed audio
for translated video subtitles.
"""

import os
import sys
import uuid
import asyncio
import hashlib
import subprocess
import base64
import logging
import time
import threading
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import imageio_ffmpeg

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
TEMP_AUDIO_DIR = BASE_DIR / "temp_audio"
PREVIEW_CACHE_DIR = BASE_DIR / "preview_cache"
GENERATE_CACHE_DIR = BASE_DIR / "generate_cache"
CLONE_DIR = BASE_DIR / "clone_audio"
TEMP_AUDIO_DIR.mkdir(exist_ok=True)
PREVIEW_CACHE_DIR.mkdir(exist_ok=True)
GENERATE_CACHE_DIR.mkdir(exist_ok=True)
CLONE_DIR.mkdir(exist_ok=True)
FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
# Resolve ffprobe: try same directory as bundled ffmpeg, then PATH, then bare name
import shutil as _shutil
_ffmpeg_dir = os.path.dirname(FFMPEG_PATH)
_ffprobe_candidates = [
    os.path.join(_ffmpeg_dir, "ffprobe.exe"),
    os.path.join(_ffmpeg_dir, "ffprobe"),
]
FFPROBE_PATH = next(
    (p for p in _ffprobe_candidates if os.path.isfile(p)),
    _shutil.which("ffprobe") or "ffprobe",
)

# ---------------------------------------------------------------------------
# Persistent Event Loop — avoid asyncio.run() overhead per request (~200-500ms)
# ---------------------------------------------------------------------------
_loop = asyncio.new_event_loop()
_loop_thread = threading.Thread(target=_loop.run_forever, daemon=True)
_loop_thread.start()

def run_async(coro, timeout=30):
    """Run async coroutine on persistent loop — no event loop creation overhead."""
    future = asyncio.run_coroutine_threadsafe(coro, _loop)
    return future.result(timeout=timeout)

# ---------------------------------------------------------------------------
# Generate Cache — MD5(engine:voice:speed:text) → cached audio
# ---------------------------------------------------------------------------
MAX_CACHE_SIZE_MB = 500  # Auto-cleanup when cache exceeds this

def _get_generate_cache_key(engine: str, voice: str, speed: float, text: str) -> str:
    """Compute cache key for a TTS generate request."""
    raw = f"{engine}:{voice}:{speed:.2f}:{text}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()

def _get_cached_generate(cache_key: str) -> str | None:
    """Return cached file path if exists, else None."""
    cached = GENERATE_CACHE_DIR / f"{cache_key}.mp3"
    if cached.exists() and cached.stat().st_size > 0:
        return str(cached)
    return None

def _cleanup_cache_if_needed():
    """Remove oldest cached files if total cache exceeds MAX_CACHE_SIZE_MB."""
    try:
        files = sorted(GENERATE_CACHE_DIR.glob("*.mp3"), key=lambda f: f.stat().st_mtime)
        total = sum(f.stat().st_size for f in files)
        while total > MAX_CACHE_SIZE_MB * 1024 * 1024 and files:
            oldest = files.pop(0)
            total -= oldest.stat().st_size
            oldest.unlink(missing_ok=True)
    except Exception:
        pass

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Engine Registry — hot-pluggable engine management
# ---------------------------------------------------------------------------

ENGINE_REGISTRY = {
    "edge-tts": {
        "id": "edge-tts",
        "name": "Microsoft Edge TTS",
        "description": "Free realtime neural voices, best for fast TikTok/Reels generation.",
        "status": "ready",
        "capabilities": ["Realtime streaming", "30+ languages", "Neural voices", "Free tier"],
    },
    "vieneu-ai": {
        "id": "vieneu-ai",
        "name": "VieNeu AI",
        "description": "Đã kết nối adapter VieNeu giả lập qua Edge TTS với tinh chỉnh giọng.",
        "status": "ready",
        "capabilities": ["Giả lập giọng", "Tinh chỉnh Pitch/Rate", "Giữ đúng engine"],
    },
    "viettts": {
        "id": "viettts",
        "name": "VietTTS",
        "description": "Chua ket noi engine VietTTS that. Khong fallback sang Edge TTS de tranh sai giong.",
        "status": "offline",
        "capabilities": ["Cho adapter VietTTS", "Khong fallback Edge TTS", "Toi uu tieng Viet"],
    },
    "xtts-v2": {
        "id": "xtts-v2",
        "name": "XTTS-v2 Voice Clone",
        "description": "Chua ket noi model XTTS-v2 that. Clone giong se khong dung Edge TTS gia lap.",
        "status": "offline",
        "capabilities": ["Cho model XTTS-v2", "Clone zero-shot", "Khong fallback Edge TTS"],
    },
}

VOICE_REGISTRY = [
    # Edge TTS voices
    {"id": "vi-VN-HoaiMyNeural", "name": "HoaiMy Neural", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Female", "accent": "Southern", "engine": "edge-tts", "qualityScore": 94, "status": "ready",
     "tags": ["Fashion", "TikTok Viral", "Young"], "category": "Female South"},
    {"id": "vi-VN-NamMinhNeural", "name": "NamMinh Neural", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Male", "accent": "Northern", "engine": "edge-tts", "qualityScore": 92, "status": "ready",
     "tags": ["Finance", "Tech Review", "News"], "category": "Male North"},
    {"id": "en-US-JennyNeural", "name": "Jenny Neural", "language": "English", "country": "United States",
     "gender": "Female", "accent": "US", "engine": "edge-tts", "qualityScore": 91, "status": "ready",
     "tags": ["US Female", "Narration"], "category": "US Female"},
    {"id": "en-US-GuyNeural", "name": "Guy Neural", "language": "English", "country": "United States",
     "gender": "Male", "accent": "US", "engine": "edge-tts", "qualityScore": 90, "status": "ready",
     "tags": ["US Male", "Motivation"], "category": "US Male"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia Neural", "language": "English", "country": "United Kingdom",
     "gender": "Female", "accent": "UK", "engine": "edge-tts", "qualityScore": 89, "status": "ready",
     "tags": ["UK Female", "Luxury"], "category": "UK Female"},
    {"id": "en-GB-RyanNeural", "name": "Ryan Neural", "language": "English", "country": "United Kingdom",
     "gender": "Male", "accent": "UK", "engine": "edge-tts", "qualityScore": 89, "status": "ready",
     "tags": ["UK Male", "Documentary"], "category": "UK Male"},
    {"id": "ja-JP-NanamiNeural", "name": "Nanami Neural", "language": "Japanese", "country": "Japan",
     "gender": "Female", "accent": "Tokyo", "engine": "edge-tts", "qualityScore": 90, "status": "ready",
     "tags": ["Japanese", "Anime"], "category": "Japanese"},
    {"id": "ko-KR-SunHiNeural", "name": "SunHi Neural", "language": "Korean", "country": "Korea",
     "gender": "Female", "accent": "Seoul", "engine": "edge-tts", "qualityScore": 90, "status": "ready",
     "tags": ["Korean", "K-Beauty"], "category": "Korean"},
    {"id": "zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao Neural", "language": "Chinese", "country": "China",
     "gender": "Female", "accent": "Mandarin", "engine": "edge-tts", "qualityScore": 91, "status": "ready",
     "tags": ["Chinese", "Commerce"], "category": "Chinese"},
    {"id": "es-ES-ElviraNeural", "name": "Elvira Neural", "language": "Spanish", "country": "Spain",
     "gender": "Female", "accent": "Spain", "engine": "edge-tts", "qualityScore": 88, "status": "ready",
     "tags": ["Spanish", "Lifestyle"], "category": "Spanish"},
    {"id": "fr-FR-DeniseNeural", "name": "Denise Neural", "language": "French", "country": "France",
     "gender": "Female", "accent": "France", "engine": "edge-tts", "qualityScore": 89, "status": "ready",
     "tags": ["French", "Beauty"], "category": "French"},
    {"id": "de-DE-KatjaNeural", "name": "Katja Neural", "language": "German", "country": "Germany",
     "gender": "Female", "accent": "Germany", "engine": "edge-tts", "qualityScore": 88, "status": "ready",
     "tags": ["German", "Education"], "category": "German"},
    {"id": "ru-RU-SvetlanaNeural", "name": "Svetlana Neural", "language": "Russian", "country": "Russia",
     "gender": "Female", "accent": "Moscow", "engine": "edge-tts", "qualityScore": 87, "status": "ready",
     "tags": ["Russian", "Narration"], "category": "Russian"},
    # VieNeu AI voices
    {"id": "vieneu-female-north", "name": "Nữ Miền Bắc", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Female", "accent": "Northern", "engine": "vieneu-ai", "qualityScore": 93, "status": "ready",
     "tags": ["Voice Tuned", "Accent Preservation"], "category": "Female North"},
    {"id": "vieneu-male-north", "name": "Nam Miền Bắc", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Male", "accent": "Northern", "engine": "vieneu-ai", "qualityScore": 92, "status": "ready",
     "tags": ["Voice Tuned", "Finance"], "category": "Male North"},
    {"id": "vieneu-female-south", "name": "Nữ Miền Nam", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Female", "accent": "Southern", "engine": "vieneu-ai", "qualityScore": 93, "status": "ready",
     "tags": ["Voice Tuned", "Fashion"], "category": "Female South"},
    {"id": "vieneu-male-south", "name": "Nam Miền Nam", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Male", "accent": "Southern", "engine": "vieneu-ai", "qualityScore": 91, "status": "ready",
     "tags": ["Voice Tuned", "Review"], "category": "Male South"},
    {"id": "vieneu-podcast-female", "name": "Podcast Female", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Female", "accent": "Neutral", "engine": "vieneu-ai", "qualityScore": 95, "status": "ready",
     "tags": ["Podcast", "Drama"], "category": "Podcast Female"},
    {"id": "vieneu-podcast-male", "name": "Podcast Male", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Male", "accent": "Neutral", "engine": "vieneu-ai", "qualityScore": 94, "status": "ready",
     "tags": ["Podcast", "Motivation"], "category": "Podcast Male"},
    # VietTTS voices
    {"id": "viettts-female-01", "name": "Female 01", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Female", "accent": "Neutral", "engine": "viettts", "qualityScore": 78, "status": "ready",
     "tags": ["Fallback", "Open Source"], "category": "Female 01"},
    {"id": "viettts-female-02", "name": "Female 02", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Female", "accent": "Neutral", "engine": "viettts", "qualityScore": 77, "status": "ready",
     "tags": ["Fallback", "Open Source"], "category": "Female 02"},
    {"id": "viettts-male-01", "name": "Male 01", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Male", "accent": "Neutral", "engine": "viettts", "qualityScore": 76, "status": "ready",
     "tags": ["Fallback", "Open Source"], "category": "Male 01"},
    {"id": "viettts-male-02", "name": "Male 02", "language": "Vietnamese", "country": "Vietnam",
     "gender": "Male", "accent": "Neutral", "engine": "viettts", "qualityScore": 76, "status": "ready",
     "tags": ["Fallback", "Open Source"], "category": "Male 02"},
    # XTTS-v2 voice
    {"id": "xtts-clone-voice", "name": "Clone Voice", "language": "Multilingual", "country": "Global",
     "gender": "Clone", "accent": "Source voice", "engine": "xtts-v2", "qualityScore": 90, "status": "ready",
     "tags": ["Upload Voice", "Embedding"], "category": "Clone Voice"},
]

# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [
                FFPROBE_PATH, "-v", "error",
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


def process_audio_single_pass(
    input_path: str,
    output_path: str,
    speed_factor: float = 1.0,
    normalize: bool = True,
    strip_silence: bool = True
) -> str:
    """
    Process audio in a SINGLE ffmpeg call: strip silence + normalize + speed.
    Previously this was 2-3 separate subprocess calls. Now merged for ~50% speedup.
    """
    filters = []

    # 1. Strip leading/trailing silence
    if strip_silence:
        filters.append(
            "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,"
            "areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,areverse"
        )

    # 2. Normalize loudness (single-pass — ~40% faster than 2-pass, near-identical quality)
    if normalize:
        filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")

    # 3. Speed control if needed
    if speed_factor > 1.01:
        # Cap at 1.05x — user requested NO automatic speedup.
        capped_factor = min(speed_factor, 1.05)
        filters.append(f"atempo={capped_factor:.4f}")

    if not filters:
        import shutil
        shutil.copy2(input_path, output_path)
        return output_path

    filter_chain = ",".join(filters)
    try:
        subprocess.run(
            [
                FFMPEG_PATH, "-y", "-i", str(input_path),
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


def resolve_voice_for_engine(voice: str, engine: str) -> dict:
    """
    Resolve the actual voice identifier and parameters for an engine.
    """
    engine_info = ENGINE_REGISTRY.get(engine, {})
    engine_status = engine_info.get("status", "offline")

    if engine_status == "ready":
        if engine == "edge-tts":
            return {"voice": voice, "rate": "+0%", "pitch": "+0Hz"}
        elif engine == "vieneu-ai":
            mapping = {
                "vieneu-female-north": {"voice": "vi-VN-HoaiMyNeural", "rate": "+5%", "pitch": "+10Hz"},
                "vieneu-male-north": {"voice": "vi-VN-NamMinhNeural", "rate": "+0%", "pitch": "+0Hz"},
                "vieneu-female-south": {"voice": "vi-VN-HoaiMyNeural", "rate": "+0%", "pitch": "+0Hz"},
                "vieneu-male-south": {"voice": "vi-VN-NamMinhNeural", "rate": "-5%", "pitch": "-5Hz"},
                "vieneu-podcast-female": {"voice": "vi-VN-HoaiMyNeural", "rate": "-10%", "pitch": "-10Hz"},
                "vieneu-podcast-male": {"voice": "vi-VN-NamMinhNeural", "rate": "-10%", "pitch": "-10Hz"},
            }
            return mapping.get(voice, {"voice": "vi-VN-HoaiMyNeural", "rate": "+0%", "pitch": "+0Hz"})

    raise RuntimeError(
        f"Engine '{engine}' is not connected or offline."
    )


def generate_tts_audio(text: str, voice: str, output_path: str, engine: str = "edge-tts") -> tuple[bool, str]:
    """
    Generate TTS audio using the specified engine.
    Returns a tuple: (success: bool, error_message: str)
    """
    try:
        voice_config = resolve_voice_for_engine(voice, engine)
    except RuntimeError as exc:
        logger.error("%s", exc)
        return False, str(exc)
        
    actual_voice = voice_config["voice"]
    rate = voice_config["rate"]
    pitch = voice_config["pitch"]
    
    logger.info(f"TTS Generate: engine={engine}, requested_voice={voice}, config={voice_config}")
    last_error = "edge-tts subprocess failed after 3 retries"

    async def _run_edge_tts():
        """Run edge_tts using its Python API directly (avoids Python 3.14 subprocess issues)."""
        try:
            import edge_tts
            communicate = edge_tts.Communicate(text, actual_voice, rate=rate, pitch=pitch)
            await communicate.save(str(output_path))
            return True, ""
        except Exception as exc:
            return False, str(exc)

    for attempt in range(1, 4):
        try:
            # Use persistent event loop — avoids 200-500ms asyncio.run() overhead
            ok, err = run_async(_run_edge_tts())
            if ok and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                return True, ""

            last_error = f"edge-tts attempt {attempt}/3 failed for voice={actual_voice}: {err or 'empty output file'}"
            logger.warning(last_error)
        except Exception as e:
            # Fallback to subprocess if persistent loop fails
            try:
                result = subprocess.run(
                    [
                        sys.executable, "-m", "edge_tts",
                        "--voice", actual_voice,
                        "--rate", rate,
                        "--pitch", pitch,
                        "--text", text,
                        "--write-media", str(output_path)
                    ],
                    capture_output=True, text=True, timeout=30
                )
                if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    return True, ""
                stderr_msg = result.stderr.strip() or "empty output file"
                last_error = f"edge-tts attempt {attempt}/3 failed for voice={actual_voice}: {stderr_msg}"
                logger.warning(last_error)
            except subprocess.TimeoutExpired:
                last_error = f"edge-tts attempt {attempt}/3 timed out after 30s"
                logger.warning(last_error)
            except Exception as sub_exc:
                last_error = f"edge-tts attempt {attempt}/3 subprocess error: {sub_exc}"
                logger.warning(last_error)

        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except OSError:
                pass
        # Reduced retry delay: 0.2s per attempt (was 0.8s)
        time.sleep(0.2 * attempt)

    logger.error("TTS generation failed after retries: engine=%s, voice=%s, last_error=%s", engine, actual_voice, last_error)
    return False, last_error


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "voice-service",
        "ffmpegPath": FFMPEG_PATH,
        "ffprobePath": FFPROBE_PATH,
        "engines": {
            eid: info["status"]
            for eid, info in ENGINE_REGISTRY.items()
        }
    })


@app.route("/api/registry", methods=["GET"])
def get_engine_registry():
    """
    ITtsProvider.GetEngineRegistry — Return available engines, voices, and active engine.
    New engines can be hot-plugged by adding to ENGINE_REGISTRY.
    """
    return jsonify({
        "engines": list(ENGINE_REGISTRY.values()),
        "voices": VOICE_REGISTRY,
        "activeEngine": "edge-tts"
    })


@app.route("/api/voices", methods=["GET"])
def get_voices():
    """
    ITtsProvider.GetVoices — Return available voices, optionally filtered by engine.
    """
    engine_filter = request.args.get("engine")
    source_voices = [v for v in VOICE_REGISTRY if not engine_filter or v["engine"] == engine_filter]
    voices = []
    for voice in source_voices:
        item = dict(voice)
        engine_status = ENGINE_REGISTRY.get(item["engine"], {}).get("status", "offline")
        if engine_status != "ready":
            item["status"] = "offline"
        voices.append(item)
    return jsonify(voices)


@app.route("/api/tts/generate", methods=["POST"])
def tts_generate():
    """
    ITtsProvider.GenerateAsync — Generate TTS audio from text.

    Request JSON:
        text (str): Text to synthesize
        voice (str): Voice identifier (default: vi-VN-HoaiMyNeural)
        engine (str): Engine to use (default: edge-tts)
        speed (float): Speed factor
        max_duration (float, optional): Maximum allowed duration in seconds
        emotion (str, optional): Emotion type
        preserve_accent (bool): Whether to preserve accent during fallback
        job_id (str, optional): Job ID for organizing output files

    Returns:
        The generated audio file (MP3)
    """
    t_start = time.perf_counter()
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"]
    voice = data.get("voice") or data.get("voiceId") or "vi-VN-HoaiMyNeural"
    engine = data.get("engine", "edge-tts")
    max_duration = data.get("max_duration", None)
    job_id = data.get("job_id", str(uuid.uuid4()))
    speed = data.get("speed", 1.0)

    engine_status = ENGINE_REGISTRY.get(engine, {}).get("status", "offline")
    if engine_status != "ready":
        return jsonify({
            "error": f"Engine '{engine}' is not connected. Edge TTS fallback is disabled to avoid wrong voice output."
        }), 501

    # ─── Cache Check ─────────────────────────────────────────────────────
    cache_key = _get_generate_cache_key(engine, voice, speed, text)
    cached_path = _get_cached_generate(cache_key)
    if cached_path and not max_duration:
        elapsed = (time.perf_counter() - t_start) * 1000
        logger.info(f"TTS CACHE HIT: key={cache_key[:12]}, elapsed={elapsed:.0f}ms")
        return send_file(
            cached_path,
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name=f"tts_{cache_key[:8]}.mp3"
        )

    # ─── Generate Fresh ──────────────────────────────────────────────────
    # Create job-specific directory
    job_dir = TEMP_AUDIO_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    chunk_id = str(uuid.uuid4())[:8]
    raw_path = str(job_dir / f"raw_{chunk_id}.mp3")
    final_path = str(job_dir / f"final_{chunk_id}.mp3")

    # Step 1: Generate raw TTS with engine routing
    ok, err_msg = generate_tts_audio(text, voice, raw_path, engine)
    if not ok:
        return jsonify({"error": f"TTS generation failed: {err_msg}"}), 500

    # Step 2: Calculate speed factor if max_duration is specified
    speed_factor = speed if speed != 1.0 else 1.0
    if max_duration and max_duration > 0:
        current_duration = get_audio_duration(raw_path)
        if current_duration > 0 and current_duration > max_duration:
            speed_factor = max(speed_factor, current_duration / max_duration)
            logger.info(
                f"Audio duration {current_duration:.2f}s > max {max_duration:.2f}s, "
                f"speed factor: {speed_factor:.2f}x"
            )

    # Step 3: Process in SINGLE ffmpeg call (strip silence + normalize + speed)
    result_path = process_audio_single_pass(
        raw_path, final_path, speed_factor=speed_factor
    )

    # Step 4: Save to cache for future reuse
    if not max_duration:
        cache_dest = str(GENERATE_CACHE_DIR / f"{cache_key}.mp3")
        try:
            import shutil
            shutil.copy2(result_path, cache_dest)
            _cleanup_cache_if_needed()
        except Exception:
            pass

    elapsed = (time.perf_counter() - t_start) * 1000
    final_duration = get_audio_duration(result_path)
    logger.info(f"TTS Generated: engine={engine}, text='{text[:50]}...', "
                f"duration={final_duration:.2f}s, elapsed={elapsed:.0f}ms")

    return send_file(
        result_path,
        mimetype="audio/mpeg",
        as_attachment=True,
        download_name=f"tts_{chunk_id}.mp3"
    )


@app.route("/api/tts/preview", methods=["POST"])
def tts_preview():
    """
    ITtsProvider.PreviewAsync — Quick preview of a voice with caching.

    Request JSON:
        text (str): Text to preview
        voice (str): Voice identifier
        engine (str): Engine to use

    Returns:
        The preview audio file
    """
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"]
    voice = data.get("voice", "vi-VN-HoaiMyNeural")
    engine = data.get("engine", "edge-tts")

    engine_status = ENGINE_REGISTRY.get(engine, {}).get("status", "offline")
    if engine_status != "ready":
        return jsonify({
            "error": f"Engine '{engine}' is not connected. Edge TTS fallback is disabled to avoid wrong voice output."
        }), 501

    # Cache key based on text + voice + engine
    cache_key = hashlib.md5(f"{engine}:{voice}:{text}".encode()).hexdigest()
    cache_path = PREVIEW_CACHE_DIR / f"{cache_key}.wav"

    if cache_path.exists():
        return send_file(str(cache_path), mimetype="audio/wav")

    # Generate fresh preview with engine routing
    ok, err_msg = generate_tts_audio(text, voice, str(cache_path), engine)
    if not ok:
        return jsonify({"error": f"Preview generation failed: {err_msg}"}), 500

    return send_file(str(cache_path), mimetype="audio/wav")


@app.route("/api/tts/clone", methods=["POST"])
def tts_clone():
    """
    Voice Clone — Generate speech from a source audio embedding.

    Request JSON:
        source_audio_base64 (str): Base64-encoded source audio for voice extraction
        text (str): Text to synthesize with the cloned voice
        target_language (str): Target language (default: vi)
        preserve_accent (bool): Preserve source accent (default: true)

    Returns:
        The cloned voice audio file
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing request body"}), 400

    source_b64 = data.get("source_audio_base64", "")
    text = data.get("text", "")
    target_lang = data.get("target_language", "vi")
    preserve_accent = data.get("preserve_accent", True)

    if not source_b64:
        return jsonify({"error": "Missing 'source_audio_base64' field"}), 400
    if not text:
        return jsonify({"error": "Missing 'text' field"}), 400

    clone_id = str(uuid.uuid4())[:8]
    source_path = str(CLONE_DIR / f"source_{clone_id}.wav")
    output_path = str(CLONE_DIR / f"cloned_{clone_id}.mp3")

    try:
        # Decode source audio
        audio_bytes = base64.b64decode(source_b64)
        with open(source_path, "wb") as f:
            f.write(audio_bytes)

        logger.info(f"Voice clone: source saved ({len(audio_bytes)} bytes), "
                     f"lang={target_lang}, preserve_accent={preserve_accent}")

        return jsonify({
            "error": "XTTS-v2 voice clone is not connected. Edge TTS fallback is disabled to avoid fake clone output."
        }), 501
    except Exception as e:
        logger.error(f"Voice clone error: {e}")
        return jsonify({"error": f"Voice cloning failed: {str(e)}"}), 500
    finally:
        # Cleanup source
        if os.path.exists(source_path):
            try:
                os.remove(source_path)
            except OSError:
                pass


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
    logger.info(f"FFmpeg path: {FFMPEG_PATH}")
    logger.info(f"FFprobe path: {FFPROBE_PATH}")
    engine_status = ", ".join(f"{e}({ENGINE_REGISTRY[e]['status']})" for e in ENGINE_REGISTRY)
    logger.info(f"Engine Registry: {engine_status}")
    logger.info("Persistent async event loop: ACTIVE")
    logger.info(f"Generate cache dir: {GENERATE_CACHE_DIR}")

    # Use waitress for multi-threaded concurrency (Windows compatible)
    try:
        from waitress import serve
        logger.info("Using Waitress WSGI server (4 threads)")
        serve(app, host="0.0.0.0", port=5052, threads=4)
    except ImportError:
        logger.warning("Waitress not installed, falling back to Flask dev server (pip install waitress)")
        app.run(host="0.0.0.0", port=5052, debug=False, threaded=True)
