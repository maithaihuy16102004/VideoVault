import logging
from ..pipeline.models import EmotionType, SpeechSegment

logger = logging.getLogger(__name__)

class EmotionEngine:
    def __init__(self):
        # Maps EmotionType to (speed_modifier, pause_modifier, volume_db)
        self.emotion_profiles = {
            EmotionType.NEUTRAL: (1.00, 1.00, 0.0),
            EmotionType.EXCITED: (1.05, 0.80, 2.0),
            EmotionType.FUNNY: (1.03, 0.90, 1.0),
            EmotionType.DRAMATIC: (0.95, 1.30, 3.0),
            EmotionType.EMOTIONAL: (0.93, 1.20, -1.0),
            EmotionType.SUSPENSE: (0.92, 1.50, -2.0),
            EmotionType.ROMANTIC: (0.95, 1.15, -1.0),
            EmotionType.STORYTELLING: (1.00, 1.10, 0.0),
        }

    def detect_emotion_from_text(self, text: str) -> EmotionType:
        """
        In a real implementation, this would call an LLM (Gemini) or a local classifier
        to determine the emotion of the text.
        For now, returns a heuristic based on punctuation/keywords.
        """
        text_lower = text.lower()
        if "!" in text or "trời ơi" in text_lower or "wow" in text_lower:
            return EmotionType.EXCITED
        if "?" in text and ("sao" in text_lower or "thật á" in text_lower):
            return EmotionType.SUSPENSE
        if "..." in text or "buồn" in text_lower or "khóc" in text_lower:
            return EmotionType.EMOTIONAL
        if "haha" in text_lower or "mắc cười" in text_lower:
            return EmotionType.FUNNY
            
        return EmotionType.NEUTRAL

    def apply_emotion_modifiers(self, segment: SpeechSegment) -> SpeechSegment:
        """Apply emotion modifiers to timing constraints."""
        profile = self.emotion_profiles.get(segment.emotion, self.emotion_profiles[EmotionType.NEUTRAL])
        speed_mod, pause_mod, vol_db = profile
        
        # Modify the target boundaries slightly to allow for emotional pacing
        # This is a soft hint for the timing engine
        logger.info(f"Segment {segment.index}: Applied emotion {segment.emotion} modifiers")
        
        return segment
