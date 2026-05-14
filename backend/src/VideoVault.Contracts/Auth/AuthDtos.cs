namespace VideoVault.Contracts.Auth;

public record RegisterRequest(string Email, string Username, string Password, string? FullName);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string RefreshToken, UserDto User);
public record UserDto(Guid Id, string Email, string Username, string? FullName, string Role, int QuotaUsed, int QuotaTotal);
