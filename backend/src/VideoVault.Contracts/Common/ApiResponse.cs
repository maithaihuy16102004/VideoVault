namespace VideoVault.Contracts.Common;

public record ApiResponse<T>(bool Success, T? Data, string? Message = null);
public record PaginatedResponse<T>(IEnumerable<T> Items, int TotalCount, int Page, int PageSize);
