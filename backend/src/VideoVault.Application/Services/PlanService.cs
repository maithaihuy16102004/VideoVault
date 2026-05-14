using Microsoft.EntityFrameworkCore;
using VideoVault.Contracts.Plans;
using VideoVault.Infrastructure.Data;

namespace VideoVault.Application.Services;

public class PlanService
{
    private readonly AppDbContext _db;

    public PlanService(AppDbContext db) => _db = db;

    public async Task<List<PlanDto>> GetAllPlansAsync()
    {
        var plans = await _db.SubscriptionPlans
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder)
            .ToListAsync();

        return plans.Select(p => new PlanDto(
            p.Id, p.Name, p.DisplayName, p.Description,
            p.PriceMonthly, p.PriceYearly, p.QuotaLimit,
            p.QuotaPeriod, p.MaxVideoQuality,
            p.MaxConcurrentDownloads, p.Features
        )).ToList();
    }
}
