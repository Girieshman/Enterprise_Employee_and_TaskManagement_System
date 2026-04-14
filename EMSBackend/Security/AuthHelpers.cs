using EMSBackend.Data;
using Microsoft.EntityFrameworkCore;

namespace EMSBackend.Security;

public static class AuthHelpers
{
    public static async Task<RequestUserContext?> GetCurrentUserAsync(HttpContext httpContext, AppDbContext dbContext)
    {
        if (!httpContext.Request.Headers.TryGetValue("X-User-Id", out var userIdValues) ||
            !int.TryParse(userIdValues.FirstOrDefault(), out var userId))
        {
            return null;
        }

        return await dbContext.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => new RequestUserContext(
                user.Id,
                user.Username,
                user.Role,
                user.EmployeeId,
                user.Employee != null ? user.Employee.Department : null))
            .FirstOrDefaultAsync();
    }

    public static bool IsAdmin(RequestUserContext user) =>
        user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);

    public static bool IsManager(RequestUserContext user) =>
        user.Role.Equals("Manager", StringComparison.OrdinalIgnoreCase);

    public static bool IsEmployee(RequestUserContext user) =>
        user.Role.Equals("Employee", StringComparison.OrdinalIgnoreCase) ||
        user.Role.Equals("User", StringComparison.OrdinalIgnoreCase);
}

public sealed record RequestUserContext(
    int Id,
    string Username,
    string Role,
    int? EmployeeId,
    string? Department);
