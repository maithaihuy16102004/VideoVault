"""
VideoVault Subtitle Service.

Flask microservice that keeps a faster-whisper model loaded in memory and
extracts subtitles from uploaded video or audio files.
"""

import os
import hashlib
import json
import re
import shutil
import subprocess
import threading
import time as _time
import uuid
import wave
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from faster_whisper import WhisperModel
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import imageio_ffmpeg


app = Flask(__name__)
CORS(app)

MODEL_SIZE = os.getenv("STT_MODEL_SIZE", "small")
COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "int8")
DEVICE = os.getenv("STT_DEVICE", "cpu")
DEFAULT_LANGUAGE = os.getenv("STT_LANGUAGE", "auto")
PORT = int(os.getenv("STT_PORT", "5051"))
CPU_THREADS = int(os.getenv("STT_CPU_THREADS", "8"))

try:
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_PATH = "ffmpeg"
FFPROBE_PATH = os.getenv("FFPROBE_PATH") or shutil.which("ffprobe") or "ffprobe"
JOBS_ROOT = Path(__file__).resolve().parent / "jobs"

print(
    f"[LOADING] Whisper model={MODEL_SIZE} device={DEVICE} "
    f"compute={COMPUTE_TYPE} threads={CPU_THREADS}",
    flush=True,
)
model = WhisperModel(
    MODEL_SIZE,
    device=DEVICE,
    compute_type=COMPUTE_TYPE,
    cpu_threads=CPU_THREADS,
    num_workers=2,
)
print(f"[OK] Model loaded. Subtitle Service ready on port {PORT}.", flush=True)

jobs = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def sha256_file(file_path):
    digest = hashlib.sha256()
    with open(file_path, "rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def append_job_log(job_id, message):
    timestamped = f"{now_iso()} {message}"
    print(timestamped, flush=True)
    job_dir = jobs.get(job_id, {}).get("jobDir")
    if job_dir:
        with open(Path(job_dir) / "logs.txt", "a", encoding="utf-8") as log_file:
            log_file.write(timestamped + "\n")


def run_command(cmd):
    try:
        return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    except FileNotFoundError as exc:
        raise Exception(f"Command not found: {cmd[0]}") from exc


def parse_ffmpeg_duration(output):
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", output)
    if not match:
        return None
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = float(match.group(3))
    return hours * 3600 + minutes * 60 + seconds


def ffmpeg_probe_duration(file_path):
    result = run_command([FFMPEG_PATH, "-i", str(file_path)])
    duration = parse_ffmpeg_duration(f"{result.stdout}\n{result.stderr}")
    if duration is None:
        raise Exception("ffmpeg fallback could not read duration.")
    return duration


def probe_duration(file_path):
    try:
        result = run_command([
            FFPROBE_PATH,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(file_path),
        ])
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception:
        pass
    return ffmpeg_probe_duration(file_path)


def probe_has_audio(file_path):
    try:
        result = run_command([
            FFPROBE_PATH,
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=index",
            "-of",
            "csv=p=0",
            str(file_path),
        ])
        if result.returncode == 0:
            return bool(result.stdout.strip())
    except Exception:
        pass
    result = run_command([FFMPEG_PATH, "-i", str(file_path)])
    return "Audio:" in f"{result.stdout}\n{result.stderr}"


def measure_mean_volume(audio_path):
    result = run_command([
        FFMPEG_PATH,
        "-i",
        str(audio_path),
        "-af",
        "volumedetect",
        "-f",
        "null",
        "-",
    ])
    output = f"{result.stdout}\n{result.stderr}"
    match = re.search(r"mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB", output)
    return float(match.group(1)) if match else None


def format_timestamp(seconds):
    seconds = max(0.0, float(seconds or 0))
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis == 1000:
        secs += 1
        millis = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def get_wav_duration(audio_path):
    try:
        with wave.open(audio_path, "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            return frames / float(rate) if rate else 0.0
    except Exception:
        return 0.0


def extract_audio(video_path, audio_path, job_id):
    jobs[job_id]["stage"] = "Đang trích xuất audio..."
    jobs[job_id]["progress"] = 10
    diagnostics = jobs[job_id]["diagnostics"]
    t0 = _time.monotonic()

    video_duration = probe_duration(video_path)
    jobs[job_id]["videoDuration"] = video_duration
    diagnostics["video_duration"] = video_duration
    diagnostics["has_audio"] = probe_has_audio(video_path)
    if not diagnostics["has_audio"]:
        raise Exception("Input video does not contain an audio stream.")

    # Fast audio extraction: no loudnorm (expensive 2-pass), direct PCM 16kHz mono
    cmd = [
        FFMPEG_PATH,
        "-y",
        "-i",
        str(video_path),
        "-vn",
        "-map",
        "0:a:0",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        str(audio_path),
    ]
    result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0 or not os.path.exists(audio_path):
        raise Exception(f"FFmpeg failed to extract audio: {result.stderr}")

    audio_duration = probe_duration(audio_path)
    jobs[job_id]["audioDuration"] = audio_duration
    diagnostics["audio_duration"] = audio_duration
    diagnostics["mean_volume_db"] = None  # Skip volume measurement for speed

    duration_delta = abs(video_duration - audio_duration)
    diagnostics["duration_delta"] = duration_delta
    if duration_delta > 0.5:
        raise Exception(
            "Audio extraction duration mismatch: "
            f"video={video_duration:.2f}s audio={audio_duration:.2f}s"
        )

    elapsed = _time.monotonic() - t0
    jobs[job_id]["duration"] = audio_duration
    jobs[job_id]["progress"] = 25
    jobs[job_id]["stage"] = f"Audio trích xuất xong ({audio_duration:.1f}s) trong {elapsed:.1f}s"
    append_job_log(job_id, f"[STT_JOB] video_duration={video_duration:.3f}")
    append_job_log(job_id, f"[STT_JOB] audio_duration={audio_duration:.3f}")
    append_job_log(job_id, f"[STT_JOB] audio_extract_time={elapsed:.2f}s")


def transcribe_audio(audio_path, job_id, language):
    jobs[job_id]["stage"] = "AI đang nhận diện giọng nói..."
    jobs[job_id]["progress"] = 30
    t0 = _time.monotonic()

    duration = jobs[job_id].get("duration") or get_wav_duration(audio_path)
    language = (language or DEFAULT_LANGUAGE or "auto").strip().lower()
    transcribe_options = {
        "task": "transcribe",
        "beam_size": 3,
        "best_of": 1,
        "condition_on_previous_text": True,
        "vad_filter": True,
        "vad_parameters": {
            "min_silence_duration_ms": 500,
            "speech_pad_ms": 150,
        },
        "word_timestamps": True,
        "without_timestamps": False,
        "temperature": 0.0,
        "compression_ratio_threshold": 2.4,
        "log_prob_threshold": -1.0,
        "no_speech_threshold": 0.6,
    }
    if language != "auto":
        transcribe_options["language"] = language

    segments, info = model.transcribe(
        audio_path,
        **transcribe_options,
    )

    detected_language = getattr(info, "language", language)
    jobs[job_id]["detectedLanguage"] = detected_language
    jobs[job_id]["diagnostics"]["detected_language"] = detected_language

    srt_lines = []
    subtitle_index = 1
    speech_seconds = 0.0
    
    max_chars_per_segment = 80 if detected_language not in ["zh", "ja", "ko"] else 35
    max_duration_per_segment = 5.0

    current_segment = {"start": None, "end": None, "text": ""}
    
    def push_current_segment():
        nonlocal subtitle_index, speech_seconds, current_segment
        if current_segment["start"] is not None and current_segment["text"].strip():
            srt_lines.append(str(subtitle_index))
            start_time = current_segment["start"]
            end_time = current_segment["end"]
            
            if duration and end_time > duration:
                end_time = duration
                
            srt_lines.append(f"{format_timestamp(start_time)} --> {format_timestamp(end_time)}")
            srt_lines.append(current_segment["text"].strip())
            srt_lines.append("")
            
            subtitle_index += 1
            speech_seconds += (end_time - start_time)
            
            if duration > 0:
                pct = 30 + int((end_time / duration) * 65)
                jobs[job_id]["progress"] = min(pct, 95)
                jobs[job_id]["stage"] = f"Xử lý phụ đề... ({subtitle_index - 1} đoạn)"
                
        current_segment = {"start": None, "end": None, "text": ""}

    for segment in segments:
        avg_logprob = float(getattr(segment, "avg_logprob", 0.0) or 0.0)
        no_speech_prob = float(getattr(segment, "no_speech_prob", 0.0) or 0.0)

        if no_speech_prob > 0.75 or avg_logprob < -1.2:
            continue

        if hasattr(segment, "words") and segment.words:
            for w in segment.words:
                word_text = w.word
                word_start = w.start
                word_end = w.end
                
                if current_segment["start"] is None:
                    current_segment["start"] = word_start
                    current_segment["text"] = word_text.lstrip()
                    current_segment["end"] = word_end
                else:
                    text_so_far = current_segment["text"] + word_text
                    duration_so_far = word_end - current_segment["start"]
                    pause = word_start - current_segment["end"]
                    
                    is_punctuation = word_text.strip() and word_text.strip()[-1] in ".!?。！？"
                    
                    if len(text_so_far) > max_chars_per_segment or duration_so_far > max_duration_per_segment or pause > 1.0:
                        push_current_segment()
                        current_segment["start"] = word_start
                        current_segment["text"] = word_text.lstrip()
                        current_segment["end"] = word_end
                    else:
                        current_segment["text"] = text_so_far
                        current_segment["end"] = word_end
                        if is_punctuation:
                            push_current_segment()
        else:
            # Fallback if no words available
            start_seconds = float(segment.start or 0)
            end_seconds = float(segment.end or 0)
            text = (segment.text or "").strip()
            
            if text and len(text) > 1:
                push_current_segment() # push any accumulated words first
                current_segment["start"] = start_seconds
                current_segment["end"] = end_seconds
                current_segment["text"] = text
                push_current_segment()

    # push remaining
    push_current_segment()

    if not srt_lines:
        raise Exception("Whisper khong nhan dien duoc loi thoai trong file nay.")

    jobs[job_id]["subtitleCount"] = subtitle_index - 1
    speech_ratio = speech_seconds / duration if duration else 0.0
    confidence = "HIGH"
    if speech_ratio < 0.15 or subtitle_index - 1 <= 2:
        confidence = "LOW"
    elif speech_ratio < 0.3 or subtitle_index - 1 <= 5:
        confidence = "MEDIUM"
    jobs[job_id]["diagnostics"].update({
        "speech_detected_seconds": speech_seconds,
        "speech_ratio": speech_ratio,
        "stt_segments": subtitle_index - 1,
        "confidence": confidence,
    })
    return "\n".join(srt_lines)


def save_job_result(job_id):
    result_path = Path(jobs[job_id]["jobDir"]) / "result.json"
    with open(result_path, "w", encoding="utf-8") as result_file:
        json.dump(jobs[job_id], result_file, ensure_ascii=False, indent=2)


def process_job(job_id, video_path, audio_path, language):
    job_start = _time.monotonic()
    try:
        extract_audio(video_path, audio_path, job_id)
        srt_content = transcribe_audio(audio_path, job_id, language)

        total_time = _time.monotonic() - job_start
        jobs[job_id]["progress"] = 100
        jobs[job_id]["stage"] = f"Hoàn tất! ({total_time:.1f}s)"
        jobs[job_id]["status"] = "done"
        jobs[job_id]["srtContent"] = srt_content
        jobs[job_id]["processingTime"] = round(total_time, 2)
        append_job_log(job_id, f"[STT_JOB] total_time={total_time:.2f}s")
    except Exception as exc:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(exc)
        jobs[job_id]["progress"] = 0
    finally:
        save_job_result(job_id)


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "model": MODEL_SIZE,
            "device": DEVICE,
            "computeType": COMPUTE_TYPE,
            "threads": CPU_THREADS,
            "defaultLanguage": DEFAULT_LANGUAGE,
            "ffmpegPath": FFMPEG_PATH,
            "ffprobePath": FFPROBE_PATH,
        }
    )


@app.route("/extract", methods=["POST"])
def extract():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    language = request.form.get("language", DEFAULT_LANGUAGE)
    job_id = str(uuid.uuid4())
    job_dir = JOBS_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=False)
    extension = os.path.splitext(file.filename)[1] or ".bin"
    video_path = job_dir / f"input{extension}"
    audio_path = job_dir / "audio.wav"
    file.save(video_path)
    file_size_bytes = video_path.stat().st_size
    input_sha256 = sha256_file(video_path)
    created_at = now_iso()

    jobs[job_id] = {
        "status": "processing",
        "jobId": job_id,
        "originalFilename": file.filename,
        "fileSizeBytes": file_size_bytes,
        "sha256": input_sha256,
        "createdAt": created_at,
        "jobDir": str(job_dir),
        "inputPath": str(video_path),
        "audioPath": str(audio_path),
        "videoDuration": None,
        "audioDuration": None,
        "progress": 5,
        "stage": "Dang tai file len...",
        "srtContent": None,
        "error": None,
        "duration": None,
        "subtitleCount": 0,
        "language": language,
        "detectedLanguage": None,
        "diagnostics": {
            "video_duration": None,
            "audio_duration": None,
            "has_audio": None,
            "mean_volume_db": None,
            "speech_detected_seconds": None,
            "speech_ratio": None,
            "detected_language": None,
            "stt_segments": 0,
            "confidence": "UNKNOWN",
            "duration_delta": None,
        },
    }

    append_job_log(job_id, f"[STT_JOB] job_id={job_id}")
    append_job_log(job_id, f"[STT_JOB] input_path={video_path}")
    append_job_log(job_id, f"[STT_JOB] filename={file.filename}")
    append_job_log(job_id, f"[STT_JOB] size={file_size_bytes}")
    append_job_log(job_id, f"[STT_JOB] sha256={input_sha256}")

    thread = threading.Thread(
        target=process_job,
        args=(job_id, video_path, audio_path, language),
        daemon=True,
    )
    thread.start()

    return jsonify({"jobId": job_id})


@app.route("/status/<job_id>", methods=["GET"])
def status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    response = dict(job)
    if response.get("status") == "done":
        response["status"] = "completed"
    if response.get("status") == "error":
        response["status"] = "failed"
    response["jobId"] = job_id
    return jsonify(response)


@app.route("/jobs/<job_id>/debug", methods=["GET"])
def debug_job(job_id):
    job = jobs.get(job_id)
    result_path = JOBS_ROOT / job_id / "result.json"
    if not job and result_path.exists():
        with open(result_path, "r", encoding="utf-8") as result_file:
            job = json.load(result_file)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)


@app.route("/jobs/<job_id>/debug.zip", methods=["GET"])
def debug_zip(job_id):
    job_dir = JOBS_ROOT / job_id
    if not job_dir.exists():
        return jsonify({"error": "Job not found"}), 404

    zip_path = job_dir / "debug.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_path in job_dir.iterdir():
            if file_path.name == "debug.zip" or not file_path.is_file():
                continue
            archive.write(file_path, arcname=file_path.name)

    return send_file(zip_path, as_attachment=True, download_name=f"{job_id}-debug.zip")


if __name__ == "__main__":
    print(f"[START] Subtitle Service on port {PORT}", flush=True)
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
