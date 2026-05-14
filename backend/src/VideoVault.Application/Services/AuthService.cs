using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using VideoVault.Contracts.Auth;
using VideoVault.Domain.Entities;
using VideoVault.Infrastructure.Data;

namespace VideoVault.Application.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Check if email or username exists
        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already in use.");
        if (await _db.Users.AnyAsync(u => u.Username == request.Username))
            throw new InvalidOperationException("Username already taken.");

        var freePlan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Name == "free");

        var user = new User
        {
            Email = request.Email,
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            SubscriptionPlanId = freePlan?.Id,
            QuotaTotal = freePlan?.QuotaLimit ?? 10,
            QuotaResetAt = DateTime.UtcNow.AddDays(1),
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        var refreshToken = Guid.NewGuid().ToString();

        return new AuthResponse(token, refreshToken, MapToDto(user));
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is suspended.");

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        var refreshToken = Guid.NewGuid().ToString();

        return new AuthResponse(token, refreshToken, MapToDto(user));
    }

    public async Task<UserDto> GetProfileAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) throw new KeyNotFoundException("User not found.");
        return MapToDto(user);
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _config["JWT:Key"] ?? "VideoVaultSuperSecretKeyThatShouldBeLongAndSecure123!"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
        };

        var token = new JwtSecurityToken(
            issuer: _config["JWT:Issuer"] ?? "VideoVault",
            audience: _config["JWT:Audience"] ?? "VideoVaultClient",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserDto MapToDto(User user) => new(
        user.Id, user.Email, user.Username, user.FullName,
        user.Role, user.QuotaUsed, user.QuotaTotal
    );
}
