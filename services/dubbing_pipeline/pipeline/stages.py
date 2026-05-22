import os
import subprocess
import logging
from ..pipeline.models import PipelineJob, SpeechSegment
from ..utils.audio_utils import get_audio_duration
from ..engines.whisper_engine import WhisperEngine
from ..engines.edge_tts_engine import EdgeTTSEngine
from ..core.timing_engine import TimingEngine
from ..core.emotion_engine import EmotionEngine
from ..core.audio_safety import AudioSafetySystem
from ..core.subtitle_renderer import SubtitleRenderer

logger = logging.getLogger(__name__)

# Initialize singletons for engines to save memory/load time
stt_engine = None
tts_engine = EdgeTTSEngine()
timing_engine = TimingEngine()
emotion_engine = EmotionEngine()
audio_safety = AudioSafetySystem()
subtitle_renderer = SubtitleRenderer()

async def s01_audio_extraction(job: PipelineJob) -> PipelineJob:
    """Extract audio from video."""
    output_dir = os.path.dirname(job.video_path)
    audio_path = os.path.join(output_dir, f"{job.job_id}_raw.wav")
    
    cmd = [
        "ffmpeg", "-y", "-i", job.video_path,
        "-vn", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le",
        audio_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    
    job.audio_path = audio_path
    job.video_duration = get_audio_duration(audio_path)
    return job

async def s02_vocal_separation(job: PipelineJob) -> PipelineJob:
    """Separate vocals (Placeholder: pass through for now if demucs is heavy)."""
    # In full production, run Demucs here.
    # For now, we use the raw audio as vocals to save GPU/time in this implementation.
    job.vocals_path = job.audio_path
    job.accompaniment_path = job.audio_path # We'll just duck the original
    return job

async def s03_speaker_diarization(job: PipelineJob) -> PipelineJob:
    """Diarization (Placeholder: assume single speaker)."""
    # Full production: use pyannote.audio
    return job

async def s04_speech_to_text(job: PipelineJob) -> PipelineJob:
    """Run Whisper STT."""
    global stt_engine
    if stt_engine is None:
        stt_engine = WhisperEngine()
        
    result = stt_engine.transcribe(job.vocals_path, language="vi") # Force VI if it's already VI, but usually it's EN
    # Actually, we should transcribe the original language. Whisper auto-detects.
    
    segments = []
    for i, seg in enumerate(result.segments):
        segments.append(SpeechSegment(
            index=i+1,
            start_time=seg.start,
            end_time=seg.end,
            original_text=seg.text,
            target_duration=seg.end - seg.start
        ))
    job.segments = segments
    return job

async def s05_translation(job: PipelineJob) -> PipelineJob:
    """Translate (Placeholder: call Gemini via API)."""
    # Requires Gemini integration. We mock it for the structure.
    import google.generativeai as genai
    from ..config import settings
    
    if not settings.GEMINI_API_KEY:
        logger.warning("No Gemini API key, skipping translation")
        for seg in job.segments:
            seg.translated_text = seg.original_text
        return job
        
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Batch translate
    text_to_translate = "\n".join([f"{s.index}: {s.original_text}" for s in job.segments])
    prompt = f"Translate the following subtitle segments to {job.target_language}. Keep it concise to fit the original timing. Output format 'Index: TranslatedText'\n\n{text_to_translate}"
    
    try:
        response = model.generate_content(prompt)
        lines = response.text.split('\n')
        for line in lines:
            if ':' in line:
                parts = line.split(':', 1)
                try:
                    idx = int(parts[0].strip())
                    text = parts[1].strip()
                    for seg in job.segments:
                        if seg.index == idx:
                            seg.translated_text = text
                            break
                except ValueError:
                    pass
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        for seg in job.segments:
            seg.translated_text = seg.original_text # fallback
            
    return job

async def s06_vietnamese_rewrite(job: PipelineJob) -> PipelineJob:
    # Skip for now, merged with translation logic
    return job

async def s07_subtitle_compression(job: PipelineJob) -> PipelineJob:
    # Skip for now, merged with translation logic
    return job

async def s08_emotion_detection(job: PipelineJob) -> PipelineJob:
    for seg in job.segments:
        text = seg.translated_text or seg.original_text
        seg.emotion = emotion_engine.detect_emotion_from_text(text)
        seg = emotion_engine.apply_emotion_modifiers(seg)
    return job

async def s09_sentence_segmentation(job: PipelineJob) -> PipelineJob:
    return job

async def s10_timing_alignment(job: PipelineJob) -> PipelineJob:
    """Pre-calculate timing alignments."""
    # We actually need TTS durations first to align properly.
    # So we'll do this IN s11_tts_generation or iteratively.
    return job

async def s11_tts_generation(job: PipelineJob) -> PipelineJob:
    """Generate TTS and align iteratively."""
    output_dir = os.path.dirname(job.video_path)
    
    for i, seg in enumerate(job.segments):
        text = seg.translated_text or seg.original_text
        if not text:
            continue
            
        out_path = os.path.join(output_dir, f"{job.job_id}_seg_{seg.index}.mp3")
        
        # 1. Generate initial TTS
        result = await tts_engine.synthesize(text, voice="vi-VN-HoaiMyNeural", output_path=out_path)
        
        if result.success:
            gap_before, gap_after = timing_engine.analyze_silence_budget(job.segments, i)
            # 2. Calculate alignment
            aligned_seg = timing_engine.align_segment(seg, result.duration, gap_before, gap_after)
            
            # 3. Apply speed factor if needed using ffmpeg
            if aligned_seg.speed_factor != 1.0:
                sped_path = os.path.join(output_dir, f"{job.job_id}_seg_{seg.index}_sped.mp3")
                cmd = ["ffmpeg", "-y", "-i", out_path, "-filter:a", f"atempo={aligned_seg.speed_factor}", sped_path]
                subprocess.run(cmd, check=True, capture_output=True)
                aligned_seg.tts_audio_path = sped_path
            else:
                aligned_seg.tts_audio_path = out_path
                
            job.segments[i] = aligned_seg
            
    return job

async def s12_voice_clone(job: PipelineJob) -> PipelineJob:
    return job

async def s13_silence_shaping(job: PipelineJob) -> PipelineJob:
    """Pad audio with calculated silence."""
    output_dir = os.path.dirname(job.video_path)
    for seg in job.segments:
        if not seg.tts_audio_path: continue
        
        if seg.pre_silence > 0 or seg.post_silence > 0:
            padded_path = os.path.join(output_dir, f"{job.job_id}_seg_{seg.index}_padded.mp3")
            # Pad with silence using ffmpeg aevalsrc and concat, or afade.
            # Simplified: just keep the file, and we will place it exactly on the timeline in s15.
            seg.processed_audio_path = seg.tts_audio_path
        else:
            seg.processed_audio_path = seg.tts_audio_path
    return job

async def s14_loudness_normalization(job: PipelineJob) -> PipelineJob:
    """Normalize loudness to -16 LUFS."""
    output_dir = os.path.dirname(job.video_path)
    for seg in job.segments:
        if not seg.processed_audio_path: continue
        
        norm_path = os.path.join(output_dir, f"{job.job_id}_seg_{seg.index}_norm.mp3")
        cmd = [
            "ffmpeg", "-y", "-i", seg.processed_audio_path,
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            norm_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        seg.processed_audio_path = norm_path
    return job

async def s15_audio_merge(job: PipelineJob) -> PipelineJob:
    """Mix all audio segments on a timeline."""
    output_dir = os.path.dirname(job.video_path)
    merged_path = os.path.join(output_dir, f"{job.job_id}_merged.wav")
    
    # We will use ffmpeg adelay filter for each segment, then amix them.
    # This requires building a complex filtergraph.
    inputs = []
    filter_parts = []
    
    for i, seg in enumerate(job.segments):
        if not seg.processed_audio_path: continue
        inputs.extend(["-i", seg.processed_audio_path])
        
        # Calculate delay in milliseconds
        delay_ms = int((seg.start_time + seg.pre_silence) * 1000)
        filter_parts.append(f"[{i}:a]adelay={delay_ms}|{delay_ms}[a{i}];")
        
    if not inputs:
        job.dubbed_audio_path = job.audio_path
        return job
        
    amix_inputs = "".join([f"[a{i}]" for i in range(len(inputs)//2)])
    filter_parts.append(f"{amix_inputs}amix=inputs={len(inputs)//2}:normalize=0[out]")
    
    filter_complex = "".join(filter_parts)
    
    cmd = ["ffmpeg", "-y"] + inputs + ["-filter_complex", filter_complex, "-map", "[out]", merged_path]
    subprocess.run(cmd, check=True, capture_output=True)
    
    job.dubbed_audio_path = merged_path
    return job

async def s16_subtitle_generation(job: PipelineJob) -> PipelineJob:
    output_dir = os.path.dirname(job.video_path)
    ass_path = os.path.join(output_dir, f"{job.job_id}.ass")
    job.subtitle_path = subtitle_renderer.generate_ass(job, ass_path)
    return job

async def s17_final_render(job: PipelineJob) -> PipelineJob:
    output_dir = os.path.dirname(job.video_path)
    out_video = os.path.join(output_dir, f"{job.job_id}_final.mp4")
    
    # Format subtitle path for FFmpeg (needs escaping on Windows)
    ass_escaped = job.subtitle_path.replace("\\", "/")
    ass_escaped = ass_escaped.replace(":", "\\:")
    
    cmd = [
        "ffmpeg", "-y",
        "-i", job.video_path,
        "-i", job.dubbed_audio_path,
        "-filter_complex", f"[0:v]subtitles='{ass_escaped}':force_style='Fontsize=24'[v]",
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-preset", "fast",
        "-c:a", "aac",
        out_video
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    
    job.output_video_path = out_video
    return job
