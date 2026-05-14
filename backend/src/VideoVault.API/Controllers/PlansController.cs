using Microsoft.AspNetCore.Mvc;
using VideoVault.Application.Services;
using VideoVault.Contracts.Common;
using VideoVault.Contracts.Plans;

namespace VideoVault.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PlansController : ControllerBase
{
    private readonly PlanService _planService;

    public PlansController(PlanService planService) => _planService = planService;

    /// <summary>Get all active subscription plans.</summary>
    [HttpGet]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await _planService.GetAllPlansAsync();
        return Ok(new ApiResponse<List<PlanDto>>(true, plans));
    }
}
