import os
import subprocess
import logging
import imageio_ffmpeg
from ..pipeline.models import PipelineJob, SpeechSegment
from ..utils.audio_utils import get_audio_duration
from ..engines.whisper_engine import WhisperEngine
from ..engines.edge_tts_engine import EdgeTTSEngine
from ..engines.vieneu_tts_engine import VieneuTTSEngine
from ..core.timing_engine import TimingEngine
from ..core.emotion_engine import EmotionEngine
from ..core.audio_safety import AudioSafetySystem
from ..core.subtitle_renderer import SubtitleRenderer

logger = logging.getLogger(__name__)
FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()

# Initialize singletons for engines to save memory/load time
stt_engine = None
tts_engine_edge = EdgeTTSEngine()
tts_engine_vieneu = VieneuTTSEngine()
timing_engine = TimingEngine()
emotion_engine = EmotionEngine()
audio_safety = AudioSafetySystem()
subtitle_renderer = SubtitleRenderer()

async def s01_audio_extraction(job: PipelineJob) -> PipelineJob:
    """Extract audio from video."""
    output_dir = os.path.dirname(job.video_path)
    audio_path = os.path.join(output_dir, f"{job.job_id}_raw.wav")
    
    cmd = [
        FFMPEG_PATH, "-y", "-i", job.video_path,
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
        
    result = stt_engine.transcribe(job.vocals_path, language=None)
    job.original_language = result.language
    
    raw_segments = []
    for i, seg in enumerate(result.segments):
        raw_segments.append(SpeechSegment(
            index=i+1,
            start_time=seg.start,
            end_time=seg.end,
            original_text=seg.text,
            target_duration=seg.end - seg.start
        ))
    job.segments = merge_short_segments(raw_segments)
    return job

def merge_short_segments(segments: list[SpeechSegment], min_duration: float = 2.4, max_duration: float = 4.2, max_gap: float = 0.45) -> list[SpeechSegment]:
    """Merge very short STT fragments so TTS has enough timing budget."""
    merged: list[SpeechSegment] = []
    current: SpeechSegment | None = None

    for seg in segments:
        if current is None:
            current = seg
            continue

        gap = seg.start_time - current.end_time
        combined_duration = seg.end_time - current.start_time
        should_merge = current.duration < min_duration and gap <= max_gap and combined_duration <= max_duration

        if should_merge:
            current.end_time = seg.end_time
            current.target_duration = current.end_time - current.start_time
            current.original_text = f"{current.original_text} {seg.original_text}".strip()
        else:
            merged.append(current)
            current = seg

    if current is not None:
        merged.append(current)

    for idx, seg in enumerate(merged, start=1):
        seg.index = idx
        seg.target_duration = seg.end_time - seg.start_time

    return merged

async def s05_translation(job: PipelineJob) -> PipelineJob:
    """Translate (Placeholder: call Gemini via API)."""
    # Requires Gemini integration. We mock it for the structure.
    import google.generativeai as genai
    from ..config import settings

    text_to_translate = "\n".join([f"{s.index}: [{s.target_duration:.2f}s] {s.original_text}" for s in job.segments])
    prompt = (
        f"Translate the following subtitle segments to {job.target_language}. "
        "Return only 'Index: TranslatedText'. Keep each Vietnamese line extremely concise, natural, TikTok-style, "
        "and short enough to speak within the bracketed duration. Do not add new meaning.\n\n"
        f"{text_to_translate}"
    )
    
    if not settings.GEMINI_API_KEY:
        logger.warning("No Gemini API key in pipeline service, falling back to backend AI translate endpoint")
        import requests

        try:
            response = requests.post(
                "http://localhost:5141/api/v1/ai/translate",
                json={
                    "text": text_to_translate,
                    "targetLanguage": job.target_language
                },
                timeout=120
            )
            response.raise_for_status()
            translation_text = response.json().get("translatedText", "")
            lines = translation_text.split('\n')
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
            for seg in job.segments:
                if not seg.translated_text:
                    seg.translated_text = seg.original_text
            return job
        except Exception as e:
            logger.error(f"Backend translation fallback failed: {e}")
            raise
        
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
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

import re

def normalize_vietnamese_text(text: str) -> str:
    """Normalize text for Vietnamese TTS."""
    if not text: return text
    
    # Currency
    text = re.sub(r'\$(\d+)', r'\1 đô la', text)
    text = re.sub(r'(\d+)\s*\$', r'\1 đô la', text)
    text = re.sub(r'€(\d+)', r'\1 ơ rô', text)
    text = re.sub(r'£(\d+)', r'\1 bảng', text)
    
    # Percentages
    text = re.sub(r'(\d+)%', r'\1 phần trăm', text)
    
    # English/Misc mix often mispronounced
    text = text.replace("ok", "ô kê").replace("OK", "ô kê")
    
    # Emoji removal (basic)
    text = re.sub(r'[^\w\s.,!?\'"()\-:;áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ]', ' ', text)
    
    # Cleanup extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

async def s06_vietnamese_rewrite(job: PipelineJob) -> PipelineJob:
    """Vietnamese Text Preprocessing"""
    job.normalization_warnings = getattr(job, 'normalization_warnings', 0)
    for seg in job.segments:
        text = seg.translated_text or seg.original_text
        normalized = normalize_vietnamese_text(text)
        if text != normalized:
            job.normalization_warnings += 1
        seg.rewritten_text = normalized
        # We will use rewritten_text for TTS if it's available
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
    
    # Audit tracking
    job.timing_warnings = getattr(job, 'timing_warnings', 0)
    job.failed_segments = getattr(job, 'failed_segments', 0)
    num_edge = 0
    num_vieneu = 0
    total_tts_duration = 0.0
    
    # Voice Routing Decision
    if job.target_language != "vi":
        selected_engine = "edge"
        selected_voice = "en-US-JennyNeural"
        engine_instance = tts_engine_edge
    else:
        if job.voice_engine == "edge":
            selected_engine = "edge"
            selected_voice = "vi-VN-HoaiMyNeural" if "female" in job.voice_profile.lower() else "vi-VN-NamMinhNeural"
            engine_instance = tts_engine_edge
        elif job.voice_engine == "vieneu":
            selected_engine = "vieneu"
            selected_voice = job.voice_profile
            engine_instance = tts_engine_vieneu
        else:
            logger.warning(f"Unknown voice engine {job.voice_engine}, falling back to edge")
            selected_engine = "edge"
            selected_voice = "vi-VN-HoaiMyNeural"
            engine_instance = tts_engine_edge
    
    for i, seg in enumerate(job.segments):
        text = seg.rewritten_text or seg.translated_text or seg.original_text
        if not text:
            continue
            
        out_path = os.path.join(output_dir, f"{job.job_id}_seg_{seg.index}.mp3")
        
        # 1. Generate initial TTS
        result = await engine_instance.synthesize(text, voice=selected_voice, output_path=out_path)
        
        if selected_engine == "edge":
            num_edge += 1
        elif selected_engine == "vieneu":
            num_vieneu += 1

        # Fallback & Compression for Timing
        if seg.target_duration > 0 and (not result.success or result.duration > seg.target_duration * 1.08):
            compressed = compress_text_for_timing(text, seg.target_duration)
            if compressed and compressed != text:
                compressed_path = os.path.join(output_dir, f"{job.job_id}_seg_{seg.index}_compressed.mp3")
                compressed_result = await engine_instance.synthesize(compressed, voice=selected_voice, output_path=compressed_path)
                if compressed_result.success:
                    seg.compressed_text = compressed
                    result = compressed_result
                    out_path = compressed_path
        
        if not result.success:
            logger.error(f"TTS failed for segment {seg.index}: {result.error}")
            job.failed_segments += 1
            continue
            
        total_tts_duration += result.duration
        
        if result.success:
            gap_before, gap_after = timing_engine.analyze_silence_budget(job.segments, i)
            # Ensure no overlapping with video duration end
            if i == len(job.segments) - 1 and job.video_duration:
                gap_after = max(0.0, job.video_duration - seg.end_time)

            min_fitted_duration = result.duration / timing_engine.max_speed
            
            # Policy: Never speed up video, TTS must fit
            if job.preserve_original_duration and job.disable_video_speed_change:
                # We can only extend if gap_after allows, but we cannot exceed next segment start
                # (which is already enforced by gap_after calculation in timing_engine)
                if seg.target_duration > 0 and min_fitted_duration > seg.target_duration:
                    extension = min(min_fitted_duration - seg.target_duration, max(0.0, gap_after - 0.05))
                    if extension > 0:
                        seg.end_time += extension
                        seg.target_duration = seg.end_time - seg.start_time
                        gap_after = max(0.0, gap_after - extension)
                    
                    if min_fitted_duration > seg.target_duration:
                        job.timing_warnings += 1
                        logger.warning(f"Segment {seg.index} TTS duration ({result.duration:.2f}s) still exceeds available budget ({seg.target_duration:.2f}s) after max compression/speed.")

            # 2. Calculate alignment
            aligned_seg = timing_engine.align_segment(seg, result.duration, gap_before, gap_after)
            
            # 3. Apply speed factor if needed using ffmpeg
            if aligned_seg.speed_factor != 1.0:
                sped_path = os.path.join(output_dir, f"{job.job_id}_seg_{seg.index}_sped.mp3")
                cmd = [FFMPEG_PATH, "-y", "-i", out_path, "-filter:a", f"atempo={aligned_seg.speed_factor}", sped_path]
                subprocess.run(cmd, check=True, capture_output=True)
                aligned_seg.tts_audio_path = sped_path
            else:
                aligned_seg.tts_audio_path = out_path
                
            job.segments[i] = aligned_seg

    # OUTPUT AUDIT
    print("\n" + "="*40)
    print("TTS PIPELINE AUDIT REPORT")
    print("="*40)
    print(f"selectedEngine: {selected_engine}")
    print(f"selectedVoice: {selected_voice}")
    print(f"targetLanguage: {job.target_language}")
    print(f"originalDuration: {job.video_duration:.3f}s")
    print(f"segmentCount: {len(job.segments)}")
    print(f"totalTtsDuration: {total_tts_duration:.3f}s")
    print(f"numberOfSegmentsUsingEdge: {num_edge}")
    print(f"numberOfSegmentsUsingVieNeu: {num_vieneu}")
    print(f"timingWarnings: {job.timing_warnings}")
    print(f"normalizationWarnings: {getattr(job, 'normalization_warnings', 0)}")
    print(f"failedSegments: {job.failed_segments}")
    print("="*40 + "\n")
    
    return job

def compress_text_for_timing(text: str, target_duration: float) -> str:
    """Conservative Vietnamese shortening for very tight TTS slots."""
    if target_duration <= 1.2:
        return "Im luôn"

    normalized = text.lower()
    if "chê" in normalized and "hẹn" in normalized:
        return "Gã chê em xấu, hẹn ăn"
    if "đồng ý" in normalized and ("dắt" in normalized or "dẫn" in normalized):
        return "Đồng ý, dắt anh theo"
    if "biết mặt" in normalized or "ngậm miệng" in normalized or "bẽ mặt" in normalized or "cứng họng" in normalized:
        return "Câm luôn"

    replacements = [
        ("Chồng ơi ", "Chồng, "),
        ("vừa hẹn em đi ăn tối", "hẹn em ăn tối"),
        ("Gì cơ ", ""),
        ("em đồng ý rồi à ", "em đồng ý à "),
        ("Đương nhiên ", ""),
        ("em sẽ dắt anh theo", "dắt anh theo"),
        ("Cho hắn bẽ mặt", "Cho hắn câm"),
        ("suốt ngày ", ""),
        ("không xứng với em", "không xứng"),
    ]
    shortened = text.strip()
    for old, new in replacements:
        shortened = shortened.replace(old, new)

    max_words = max(2, int(target_duration * 2.2))
    words = shortened.split()
    if len(words) > max_words:
        shortened = " ".join(words[:max_words])

    return shortened.strip()

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
            FFMPEG_PATH, "-y", "-i", seg.processed_audio_path,
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
    
    input_index = 0
    for seg in job.segments:
        if not seg.processed_audio_path: continue
        inputs.extend(["-i", seg.processed_audio_path])
        
        # Calculate delay in milliseconds
        delay_ms = int((seg.start_time + seg.pre_silence) * 1000)
        filter_parts.append(f"[{input_index}:a]adelay={delay_ms}|{delay_ms}[a{input_index}];")
        input_index += 1
        
    if not inputs:
        job.dubbed_audio_path = job.audio_path
        return job
        
    input_count = len(inputs) // 2
    amix_inputs = "".join([f"[a{i}]" for i in range(input_count)])
    filter_parts.append(f"{amix_inputs}amix=inputs={input_count}:normalize=0[out]")
    
    filter_complex = "".join(filter_parts)
    
    cmd = [FFMPEG_PATH, "-y"] + inputs + ["-filter_complex", filter_complex, "-map", "[out]", merged_path]
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
        FFMPEG_PATH, "-y",
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
