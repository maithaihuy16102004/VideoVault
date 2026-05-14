using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoVault.Contracts.Common;
using VideoVault.Infrastructure.Data;

namespace VideoVault.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "admin")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnalyticsController(AppDbContext db) => _db = db;

    [HttpGet("platforms")]
    public async Task<IActionResult> GetPlatformStats()
    {
        // Query the materialized view created in schema.sql
        var stats = await _db.Database.SqlQueryRaw<PlatformStat>(
            "SELECT platform, total_downloads, successful, failed, avg_progress, total_size FROM mv_platform_stats"
        ).ToListAsync();

        return Ok(new ApiResponse<List<PlatformStat>>(true, stats));
    }

    [HttpGet("revenue")]
    public async Task<IActionResult> GetRevenueStats()
    {
        var stats = await _db.Database.SqlQueryRaw<RevenueStat>(
            "SELECT month, currency, total_transactions, total_revenue, total_refunds, unique_paying_users FROM mv_revenue_summary"
        ).ToListAsync();

        return Ok(new ApiResponse<List<RevenueStat>>(true, stats));
    }

    // DTOs for Raw SQL
    public record PlatformStat(string Platform, long Total_Downloads, long Successful, long Failed, double Avg_Progress, long? Total_Size);
    public record RevenueStat(DateTime Month, string Currency, long Total_Transactions, decimal Total_Revenue, decimal Total_Refunds, long Unique_Paying_Users);
}
