namespace VideoVault.Contracts.Automation
{
    public class PipelineJobRequest
    {
        public string VideoPath { get; set; } = string.Empty;
        public string TargetLanguage { get; set; } = "vi";
        public string CustomPrompt { get; set; } = string.Empty;
    }

    public class SubtitleSegment
    {
        public int Index { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public double DurationSeconds { get; set; }
        public string OriginalText { get; set; } = string.Empty;
        public string TranslatedText { get; set; } = string.Empty;
        public string AudioFilePath { get; set; } = string.Empty;
    }

    public class SubtitleExtractionResponse
    {
        public string JobId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int Progress { get; set; }
        public string Stage { get; set; } = string.Empty;
        public string SrtContent { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
    }
}
