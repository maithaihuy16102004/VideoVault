import re

def count_vietnamese_syllables(text: str) -> int:
    """Estimate number of syllables in Vietnamese text."""
    # Simple estimation: count words (space-separated tokens)
    # Remove punctuation first
    clean_text = re.sub(r'[^\w\s]', '', text)
    tokens = [t for t in clean_text.split() if t.strip()]
    return max(1, len(tokens))

def estimate_speaking_duration(text: str, syllables_per_sec: float = 4.5) -> float:
    """Estimate speaking duration based on average speaking rate."""
    syllables = count_vietnamese_syllables(text)
    return syllables / syllables_per_sec

def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences using basic punctuation."""
    # Split on . ! ? followed by space
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]
