from typing import List
from pydantic import BaseModel
from ..pipeline.models import SpeechSegment
import logging

logger = logging.getLogger(__name__)

class OverlapViolation(BaseModel):
    segment_a: int
    segment_b: int
    overlap_ms: float
    suggested_fix: str

class AudioSafetySystem:
    def __init__(self, min_gap_ms: float = 50.0):
        self.min_gap_ms = min_gap_ms

    def validate_no_overlap(self, segments: List[SpeechSegment]) -> List[OverlapViolation]:
        """
        Check that no two consecutive segments overlap in time.
        """
        violations = []
        for i in range(len(segments) - 1):
            current = segments[i]
            next_seg = segments[i + 1]
            
            # Actual end time of current segment after speed adjustment
            actual_duration = current.tts_raw_duration / current.speed_factor if current.speed_factor > 0 else 0
            current_end = current.start_time + actual_duration
            
            gap_ms = (next_seg.start_time - current_end) * 1000.0
            
            if gap_ms < self.min_gap_ms:
                overlap = self.min_gap_ms - gap_ms
                fix = "compress_a" if current.target_duration > next_seg.target_duration else "compress_b"
                violations.append(OverlapViolation(
                    segment_a=current.index,
                    segment_b=next_seg.index,
                    overlap_ms=overlap,
                    suggested_fix=fix
                ))
                logger.warning(f"Overlap detected between {current.index} and {next_seg.index}: {overlap:.1f}ms")
                
        return violations
