import os
from typing import List
from ..pipeline.models import PipelineJob, SpeechSegment
import logging

logger = logging.getLogger(__name__)

class SubtitleRenderer:
    def __init__(self):
        # TikTok style ASS template
        self.ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,2,30,30,300,1
Style: Emphasis,Arial,70,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,2,30,30,300,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def format_time(self, seconds: float) -> str:
        """Format seconds into ASS time format: H:MM:SS.cs"""
        h = int(seconds / 3600)
        m = int((seconds % 3600) / 60)
        s = int(seconds % 60)
        cs = int((seconds % 1) * 100)
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    def generate_ass(self, job: PipelineJob, output_path: str):
        """Generate an ASS subtitle file from the pipeline job segments."""
        logger.info(f"Generating ASS subtitles to {output_path}")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(self.ass_header)
            
            for seg in job.segments:
                if not seg.compressed_text and not seg.translated_text:
                    continue
                
                text = seg.compressed_text or seg.translated_text
                
                # Actual start/end taking speed factor into account
                actual_duration = seg.tts_raw_duration / seg.speed_factor if seg.speed_factor > 0 else seg.target_duration
                
                start_time = self.format_time(seg.start_time)
                end_time = self.format_time(seg.start_time + actual_duration)
                
                # Simple animation: fade in 150ms
                ass_text = f"{{\\fad(150,0)}}{text}"
                
                style = "Emphasis" if seg.emotion in ["EXCITED", "DRAMATIC"] else "Default"
                
                f.write(f"Dialogue: 0,{start_time},{end_time},{style},,0,0,300,,{ass_text}\n")
                
        logger.info("Subtitle generation complete")
        return output_path
