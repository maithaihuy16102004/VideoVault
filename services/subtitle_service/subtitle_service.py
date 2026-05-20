"""
VideoVault Subtitle Service  (TURBO edition)
=============================================
Flask microservice that pre-loads faster-whisper model on startup.
- Model loaded ONCE and kept in memory.
- Progress tracking via job status polling.
- FFmpeg audio extraction via imageio-ffmpeg.

SPEED OPTIMIZATIONS:
  1. Model "medium" — Best accuracy for all voices
  2. beam_size=5 + best_of=5 — Captures all voices reliably
  3. vad_filter=False — Avoid clipping end of speech
  4. FFmpeg: -vn (skip video), -threads 0 (max CPU), direct pipe
  5. int8 quantization — 2x less memory, faster on CPU
  6. cpu_threads=os.cpu_count() — Use ALL CPU cores

Port: 5050
"""

import os
import sys
import uuid
import json
import time
import subprocess
import threading
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import imageio_ffmpeg

# ──────────────────────────────────────────────
#  Configuration
# ──────────────────────────────────────────────
MODEL_SIZE = "small"      # Optimized to small: 3x faster speed, instant loading, and excellent accuracy on CPU
COMPUTE_TYPE = "int8"     # Keep int8 for CPU performance
DEVICE = "cpu"
PORT = 5051
CPU_THREADS = os.cpu_count() or 4
FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()

# ──────────────────────────────────────────────
#  Flask App
# ──────────────────────────────────────────────
app = Flask(__name__)

# ──────────────────────────────────────────────
#  Global Model (loaded once at startup)
# ──────────────────────────────────────────────
print(f"[LOADING] Whisper model '{MODEL_SIZE}' ({COMPUTE_TYPE}, {CPU_THREADS} threads)...", flush=True)
model = WhisperModel(
    MODEL_SIZE,
    device=DEVICE,
    compute_type=COMPUTE_TYPE,
    cpu_threads=CPU_THREADS,
    num_workers=2,              # parallel batch workers
)
print(f"[OK] Model loaded! Ready to serve on port {PORT}.", flush=True)

# ──────────────────────────────────────────────
#  Job Storage
# ──────────────────────────────────────────────
jobs = {}  # { job_id: { status, progress, stage, srtContent, error } }


def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def extract_audio(video_path, audio_path, job_id):
    """Extract audio from video using FFmpeg (mono 16kHz WAV) — TURBO."""
    jobs[job_id]["stage"] = "Dang trich xuat audio..."
    jobs[job_id]["progress"] = 10

    cmd = [
        FFMPEG_PATH,
        "-y",                   # overwrite
        "-i", video_path,
        "-vn",                  # SKIP video processing entirely (huge speedup)
        "-ar", "16000",         # 16kHz (whisper native)
        "-ac", "1",             # mono
        "-c:a", "pcm_s16le",    # raw PCM (no encode overhead)
        "-threads", "0",        # use all CPU cores
        audio_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if not os.path.exists(audio_path):
        err = result.stderr.decode("utf-8", errors="ignore")
        raise Exception(f"FFmpeg failed: {err}")

    jobs[job_id]["progress"] = 25
    jobs[job_id]["stage"] = "Audio da trich xuat xong."


def transcribe_audio(audio_path, job_id):
    """Transcribe audio to SRT using pre-loaded faster-whisper — TURBO."""
    jobs[job_id]["stage"] = "AI dang nhan dien giong noi..."
    jobs[job_id]["progress"] = 30

    # Get audio duration for progress calculation
    import wave
    try:
        with wave.open(audio_path, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            duration = frames / float(rate) if rate else 0
    except Exception:
        duration = 0

    # ── High Accuracy + Fast settings (Silero VAD enabled) ──
    segments, info = model.transcribe(
        audio_path,
        beam_size=3,                          # Faster beam search
        best_of=3,                            # Less redundant computations
        condition_on_previous_text=True,
        vad_filter=True,                      # Enable VAD filter for huge speedup + zero silent hallucinations!
        vad_parameters=dict(min_silence_duration_ms=600), # Standard smooth silence threshold
        word_timestamps=False,
        without_timestamps=False,
        repetition_penalty=1.2,               # Prevent repetitive loop hallucinations
        no_repeat_ngram_size=3,
        hallucination_silence_threshold=2.0,  # Prevent trailing hallucinations
    )

    srt_lines = []
    idx = 0
    for segment in segments:
        idx += 1
        start = format_timestamp(segment.start)
        end = format_timestamp(segment.end)
        text = segment.text.strip()
        if not text:
            continue  # skip empty segments
        srt_lines.append(f"{idx}")
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(text)
        srt_lines.append("")

        # Update progress (30% -> 95%)
        if duration > 0:
            pct = 30 + int((segment.end / duration) * 65)
            pct = min(pct, 95)
            jobs[job_id]["progress"] = pct
            jobs[job_id]["stage"] = f"Xu ly phu de... ({idx} doan)"

    return "\n".join(srt_lines)


def process_job(job_id, video_path):
    """Background worker thread for a single subtitle extraction job."""
    audio_path = os.path.splitext(video_path)[0] + ".wav"
    try:
        # Step 1: Extract audio
        extract_audio(video_path, audio_path, job_id)

        # Step 2: Transcribe
        srt_content = transcribe_audio(audio_path, job_id)

        # Step 3: Done
        jobs[job_id]["progress"] = 100
        jobs[job_id]["stage"] = "Hoan tat!"
        jobs[job_id]["status"] = "done"
        jobs[job_id]["srtContent"] = srt_content

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["progress"] = 0
    finally:
        # Cleanup temp files
        for f in [video_path, audio_path]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except:
                    pass


# ──────────────────────────────────────────────
#  API Routes
# ──────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_SIZE, "threads": CPU_THREADS})


@app.route("/extract", methods=["POST"])
def extract():
    """Accept a video file, start background transcription, return job ID."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    # Save uploaded file to temp
    job_id = str(uuid.uuid4())
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_stt")
    os.makedirs(temp_dir, exist_ok=True)
    video_path = os.path.join(temp_dir, f"{job_id}{os.path.splitext(file.filename)[1]}")
    file.save(video_path)

    # Initialize job
    jobs[job_id] = {
        "status": "processing",
        "progress": 5,
        "stage": "Dang tai file len...",
        "srtContent": None,
        "error": None,
    }

    # Start background processing
    thread = threading.Thread(target=process_job, args=(job_id, video_path), daemon=True)
    thread.start()

    return jsonify({"jobId": job_id})


@app.route("/status/<job_id>", methods=["GET"])
def status(job_id):
    """Poll job status and progress."""
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)


# ──────────────────────────────────────────────
#  Entrypoint
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print(f"[START] Subtitle Service on port {PORT} | model={MODEL_SIZE} | threads={CPU_THREADS}", flush=True)
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
