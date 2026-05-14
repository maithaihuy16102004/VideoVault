using Microsoft.AspNetCore.Mvc;
using VideoVault.Application.Services;
using VideoVault.Contracts.Auth;
using VideoVault.Contracts.Common;

namespace VideoVault.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService) => _authService = authService;

    /// <summary>Register a new user.</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            return Ok(new ApiResponse<AuthResponse>(true, result, "Registration successful."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<string>(false, null, ex.Message));
        }
    }

    /// <summary>Login with email and password.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return Ok(new ApiResponse<AuthResponse>(true, result, "Login successful."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ApiResponse<string>(false, null, ex.Message));
        }
    }

    /// <summary>Get current user profile (requires auth).</summary>
    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var user = await _authService.GetProfileAsync(userId.Value);
            return Ok(new ApiResponse<UserDto>(true, user));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new ApiResponse<string>(false, null, "User not found."));
        }
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : null;
    }
}
