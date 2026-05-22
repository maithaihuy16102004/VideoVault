import logging
from typing import List
from ..pipeline.models import SpeechSegment

logger = logging.getLogger(__name__)

class TimingEngine:
    def __init__(self, min_speed: float = 0.92, max_speed: float = 1.08):
        self.min_speed = min_speed
        self.max_speed = max_speed
        self.min_gap_ms = 50  # 50ms absolute minimum gap

    def calculate_target_duration(self, segments: List[SpeechSegment], index: int) -> float:
        """Calculate the available duration for a segment."""
        current = segments[index]
        return current.end_time - current.start_time

    def analyze_silence_budget(self, segments: List[SpeechSegment], index: int) -> tuple[float, float]:
        """Calculate how much silence exists before and after this segment."""
        current = segments[index]
        
        gap_before = 0.0
        if index > 0:
            prev = segments[index - 1]
            gap_before = max(0.0, current.start_time - prev.end_time)
            
        gap_after = 0.0
        if index < len(segments) - 1:
            next_seg = segments[index + 1]
            gap_after = max(0.0, next_seg.start_time - current.end_time)
            
        return gap_before, gap_after

    def align_segment(self, segment: SpeechSegment, tts_duration: float, gap_before: float, gap_after: float) -> SpeechSegment:
        """Calculate alignment parameters (speed, pause borrowing) for a single segment."""
        available_duration = segment.target_duration
        segment.tts_raw_duration = tts_duration
        
        ratio = tts_duration / available_duration if available_duration > 0 else 1.0
        
        if ratio <= 1.0:
            # Vietnamese is shorter or equal - perfect
            excess = available_duration - tts_duration
            segment.speed_factor = 1.0
            segment.pre_silence = excess * 0.3
            segment.post_silence = excess * 0.7
            logger.info(f"Segment {segment.index}: ratio {ratio:.2f} <= 1.0, speed=1.0, added pauses")
            
        elif ratio <= self.max_speed:
            # Slightly too long - speed it up within acceptable bounds
            segment.speed_factor = ratio
            segment.pre_silence = 0.0
            segment.post_silence = 0.0
            logger.info(f"Segment {segment.index}: ratio {ratio:.2f} <= {self.max_speed}, applying speed_factor={segment.speed_factor:.2f}")
            
        else:
            # Too long - we need to borrow silence or compress
            # First, see how much we can borrow safely
            max_borrow_before = max(0.0, gap_before - (self.min_gap_ms / 1000.0)) * 0.3
            max_borrow_after = max(0.0, gap_after - (self.min_gap_ms / 1000.0)) * 0.3
            
            total_budget = available_duration + max_borrow_before + max_borrow_after
            new_ratio = tts_duration / total_budget if total_budget > 0 else 1.0
            
            if new_ratio <= self.max_speed:
                # We can fit it by borrowing silence!
                segment.speed_factor = max(1.0, new_ratio)
                logger.info(f"Segment {segment.index}: ratio {ratio:.2f} > max. Borrowed silence, new ratio {new_ratio:.2f}. speed={segment.speed_factor:.2f}")
            else:
                # Still too long even after borrowing silence.
                # It must be compressed (handled by outer loop invoking Gemini), but for now we clamp speed.
                segment.speed_factor = self.max_speed
                logger.warning(f"Segment {segment.index}: ratio {new_ratio:.2f} > {self.max_speed} even with borrowing. Clamped to {self.max_speed}. COMPRESSION NEEDED.")
                
        return segment
