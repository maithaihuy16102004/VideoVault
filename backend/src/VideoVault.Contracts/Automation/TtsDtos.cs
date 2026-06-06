namespace VideoVault.Contracts.Automation
{
    // ─── Voice Engine Registry DTOs ──────────────────────────────────────

    public class TtsEngineInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "offline"; // ready, offline, beta
        public List<string> Capabilities { get; set; } = new();
    }

    public class TtsVoiceInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string Accent { get; set; } = string.Empty;
        public string Engine { get; set; } = string.Empty;
        public int QualityScore { get; set; }
        public string Status { get; set; } = "offline";
        public List<string> Tags { get; set; } = new();
        public string Category { get; set; } = string.Empty;
    }

    public class TtsGenerateRequest
    {
        public string Text { get; set; } = string.Empty;
        public string VoiceId { get; set; } = "vi-VN-HoaiMyNeural";
        public string Engine { get; set; } = "edge-tts";
        public double Speed { get; set; } = 1.0;
        public double? MaxDuration { get; set; }
        public string? Emotion { get; set; }
        public bool PreserveAccent { get; set; } = true;
    }

    public class TtsPreviewRequest
    {
        public string Text { get; set; } = string.Empty;
        public string VoiceId { get; set; } = "vi-VN-HoaiMyNeural";
        public string Engine { get; set; } = "edge-tts";
    }

    public class VoiceCloneRequest
    {
        public string SourceAudioBase64 { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string TargetLanguage { get; set; } = "vi";
        public bool PreserveAccent { get; set; } = true;
    }

    public class TtsEngineRegistryResponse
    {
        public List<TtsEngineInfo> Engines { get; set; } = new();
        public List<TtsVoiceInfo> Voices { get; set; } = new();
        public string ActiveEngine { get; set; } = "edge-tts";
    }
}
