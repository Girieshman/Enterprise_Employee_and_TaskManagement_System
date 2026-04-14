using EMSBackend.Data;
using EMSBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EMSBackend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext dbContext) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IResult> Register(RegisterRequest request)
    {
        var validationErrors = ValidateUser(request.Username, request.Password, request.Role, true);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        var username = request.Username.Trim();
        var exists = await dbContext.Users.AnyAsync(user => user.Username == username);
        if (exists)
        {
            return Results.Conflict(new { message = "Username already exists." });
        }

        var user = new User
        {
            Username = username,
            PasswordHash = request.Password.Trim(),
            Role = request.Role.Trim(),
            EmployeeId = request.EmployeeId
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var createdUser = await dbContext.Users
            .AsNoTracking()
            .Where(existingUser => existingUser.Id == user.Id)
            .Select(existingUser => new UserResponse(
                existingUser.Id,
                existingUser.Username,
                existingUser.Role,
                existingUser.EmployeeId,
                existingUser.Employee != null ? existingUser.Employee.Department : null))
            .FirstAsync();

        return Results.Created($"/users/{user.Id}", createdUser);
    }

    [HttpPost("login")]
    public async Task<IResult> Login(LoginRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors["username"] = ["Username is required."];
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            errors["password"] = ["Password is required."];
        }

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var username = request.Username.Trim();
        var password = request.Password.Trim();

        var user = await dbContext.Users
            .AsNoTracking()
            .Where(existingUser => existingUser.Username == username)
            .Select(existingUser => new
            {
                existingUser.Id,
                existingUser.Username,
                existingUser.PasswordHash,
                existingUser.Role,
                existingUser.EmployeeId,
                Department = existingUser.Employee != null ? existingUser.Employee.Department : null
            })
            .FirstOrDefaultAsync();

        if (user is null || user.PasswordHash != password)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(new UserResponse(
            user.Id,
            user.Username,
            user.Role,
            user.EmployeeId,
            user.Department));
    }

    private static Dictionary<string, string[]> ValidateUser(string username, string password, string role, bool requirePassword)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(username))
        {
            errors["username"] = ["Username is required."];
        }

        if (requirePassword && string.IsNullOrWhiteSpace(password))
        {
            errors["password"] = ["Password is required."];
        }
        else if (!string.IsNullOrWhiteSpace(password) && password.Trim().Length < 6)
        {
            errors["password"] = ["Password must be at least 6 characters long."];
        }

        if (string.IsNullOrWhiteSpace(role))
        {
            errors["role"] = ["Role is required."];
        }
        else if (!new[] { "Admin", "Manager", "Employee" }.Contains(role.Trim(), StringComparer.OrdinalIgnoreCase))
        {
            errors["role"] = ["Role must be Admin, Manager, or Employee."];
        }

        return errors;
    }

    public record RegisterRequest(string Username, string Password, string Role, int? EmployeeId);

    public record LoginRequest(string Username, string Password);

    public record UserResponse(int Id, string Username, string Role, int? EmployeeId, string? Department);
}
