namespace VideoVault.Contracts.Ai
{
    public class RewriteRequest
    {
        public string Text { get; set; } = string.Empty;
        public string Tone { get; set; } = "viral"; // viral, emotional, sales, genz, professional
        public string TargetLanguage { get; set; } = "vi";
    }

    public class RewriteResponse
    {
        public string OriginalText { get; set; } = string.Empty;
        public string RewrittenText { get; set; } = string.Empty;
        public string Tone { get; set; } = string.Empty;
    }

    public class TranslateRequest
    {
        public string Text { get; set; } = string.Empty;
        public string TargetLanguage { get; set; } = "vi";
    }

    public class TranslateResponse
    {
        public string TranslatedText { get; set; } = string.Empty;
    }
}
