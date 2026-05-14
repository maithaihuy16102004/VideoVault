namespace VideoVault.Contracts.Plans;

public record PlanDto(
    Guid Id,
    string Name,
    string DisplayName,
    string? Description,
    decimal PriceMonthly,
    decimal? PriceYearly,
    int QuotaLimit,
    string QuotaPeriod,
    string MaxVideoQuality,
    int MaxConcurrentDownloads,
    string Features
);
