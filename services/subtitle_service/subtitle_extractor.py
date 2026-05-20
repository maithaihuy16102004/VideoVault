import sys
import os
import argparse
import subprocess
import json
from faster_whisper import WhisperModel

import imageio_ffmpeg

# Path to local ffmpeg if available
try:
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_PATH = "ffmpeg"

def extract_audio(video_path, audio_path):
    cmd = [
        FFMPEG_PATH, "-y", "-i", video_path, 
        "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", 
        audio_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if not os.path.exists(audio_path):
        err = result.stderr.decode('utf-8', errors='ignore')
        raise Exception(f"FFmpeg failed to extract audio. Error: {err}")

def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def generate_srt(audio_path, srt_path):
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path, vad_filter=True)
    
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments, 1):
            start = format_timestamp(segment.start)
            end = format_timestamp(segment.end)
            f.write(f"{i}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{segment.text.strip()}\n\n")

def process_file(video_path, output_srt=None):
    if not output_srt:
        output_srt = os.path.splitext(video_path)[0] + ".srt"
    
    audio_path = os.path.splitext(video_path)[0] + ".wav"
    try:
        extract_audio(video_path, audio_path)
        generate_srt(audio_path, output_srt)
        return {"success": True, "srt_file": output_srt}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if os.path.exists(audio_path):
            try: os.remove(audio_path)
            except: pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path to video file")
    parser.add_argument("--output", help="Path to output SRT file")
    args = parser.parse_args()
    
    result = process_file(args.file, args.output)
    print(json.dumps(result))
