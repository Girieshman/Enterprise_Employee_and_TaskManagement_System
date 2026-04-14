using EMSBackend.Data;
using EMSBackend.Models;
using EMSBackend.Security;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var hasHttpsEndpoint =
    (builder.Configuration["ASPNETCORE_URLS"]?.Contains("https://", StringComparison.OrdinalIgnoreCase) ?? false) ||
    !string.IsNullOrWhiteSpace(builder.Configuration["ASPNETCORE_HTTPS_PORT"]) ||
    !string.IsNullOrWhiteSpace(builder.Configuration["HTTPS_PORT"]);

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();

    if (!await dbContext.Employees.AnyAsync())
    {
        var employees = new[]
        {
            new Employee
            {
                Name = "John Doe",
                Email = "john.doe@example.com",
                Department = "Human Resources"
            },
            new Employee
            {
                Name = "Priya Sharma",
                Email = "priya.sharma@example.com",
                Department = "Engineering"
            },
            new Employee
            {
                Name = "Arjun Mehta",
                Email = "arjun.mehta@example.com",
                Department = "Finance"
            },
            new Employee
            {
                Name = "Sneha Reddy",
                Email = "sneha.reddy@example.com",
                Department = "Marketing"
            },
            new Employee
            {
                Name = "Rahul Verma",
                Email = "rahul.verma@example.com",
                Department = "Operations"
            }
        };

        dbContext.Employees.AddRange(employees);
        await dbContext.SaveChangesAsync();
    }

    if (!await dbContext.Users.AnyAsync())
    {
        var employees = await dbContext.Employees
            .OrderBy(employee => employee.Id)
            .ToListAsync();

        var users = new[]
        {
            new User
            {
                Username = "admin",
                PasswordHash = "admin123",
                Role = "Admin"
            },
            new User
            {
                Username = "team.lead",
                PasswordHash = "lead1234",
                Role = "Manager",
                EmployeeId = employees.ElementAtOrDefault(1)?.Id
            },
            new User
            {
                Username = "employee.demo",
                PasswordHash = "user1234",
                Role = "Employee",
                EmployeeId = employees.ElementAtOrDefault(4)?.Id
            },
            new User
            {
                Username = "marketing.staff",
                PasswordHash = "market123",
                Role = "Employee",
                EmployeeId = employees.ElementAtOrDefault(3)?.Id
            }
        };

        dbContext.Users.AddRange(users);
        await dbContext.SaveChangesAsync();
    }

    if (!await dbContext.TaskItems.AnyAsync())
    {
        var employees = await dbContext.Employees
            .OrderBy(employee => employee.Id)
            .ToListAsync();
        var today = DateTime.UtcNow.Date;

        var tasks = new List<TaskItem>
        {
            new()
            {
                Title = "Executive operations review",
                Description = "Prepare the executive status deck for weekly operations review.",
                DueDate = today.AddHours(8),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(4)?.Id
            },
            new()
            {
                Title = "Candidate onboarding checklist",
                Description = "Finalize onboarding milestones and required documents for incoming hires.",
                DueDate = today.AddHours(9).AddMinutes(30),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(0)?.Id
            },
            new()
            {
                Title = "Platform reliability standup",
                Description = "Review backend incidents and API deployment readiness.",
                DueDate = today.AddHours(11),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(1)?.Id
            },
            new()
            {
                Title = "Quarterly budget sign-off",
                Description = "Validate cost centers and approve the quarterly finance summary.",
                DueDate = today.AddHours(14),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(2)?.Id
            },
            new()
            {
                Title = "Spring campaign launch review",
                Description = "Approve final campaign assets and publication calendar.",
                DueDate = today.AddHours(16).AddMinutes(30),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(3)?.Id
            },
            new()
            {
                Title = "Laptop inventory audit",
                Description = "Audit workstation inventory and confirm availability for new joiners.",
                DueDate = today.AddDays(1).AddHours(10),
                IsCompleted = true,
                AssignedEmployeeId = employees.ElementAtOrDefault(4)?.Id
            },
            new()
            {
                Title = "Leave policy handbook refresh",
                Description = "Update the employee handbook with the approved leave policy changes.",
                DueDate = today.AddDays(1).AddHours(13),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(0)?.Id
            },
            new()
            {
                Title = "Performance dashboard rollout",
                Description = "Ship the new employee performance dashboard to the staging environment.",
                DueDate = today.AddDays(2).AddHours(11),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(1)?.Id
            },
            new()
            {
                Title = "Marketing hiring pipeline review",
                Description = "Review recruitment funnel metrics and finalize next outreach actions.",
                DueDate = today.AddDays(2).AddHours(15),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(3)?.Id
            },
            new()
            {
                Title = "Compliance review prep",
                Description = "Prepare the checklist and meeting agenda for the monthly compliance review.",
                DueDate = today.AddDays(3).AddHours(10),
                IsCompleted = false,
                AssignedEmployeeId = null
            },
            new()
            {
                Title = "Department staffing alignment",
                Description = "Align department headcount plan with current task capacity and upcoming requests.",
                DueDate = today.AddDays(4).AddHours(12),
                IsCompleted = false,
                AssignedEmployeeId = employees.ElementAtOrDefault(4)?.Id
            }
        };

        dbContext.TaskItems.AddRange(tasks);
        await dbContext.SaveChangesAsync();
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

if (!app.Environment.IsDevelopment() || hasHttpsEndpoint)
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");
app.MapControllers();

var validateUser = (string username, string password, string role, bool requirePassword) =>
{
    var errors = new Dictionary<string, string[]>();
    var normalizedRole = role.Trim();

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
    else if (!new[] { "Admin", "Manager", "Employee" }.Contains(normalizedRole, StringComparer.OrdinalIgnoreCase))
    {
        errors["role"] = ["Role must be Admin, Manager, or Employee."];
    }

    return errors;
};

static IResult UnauthorizedResult() => Results.Unauthorized();

static IResult ForbiddenResult(string message) => Results.Json(
    new { message },
    statusCode: StatusCodes.Status403Forbidden);

app.MapGet("/users", async (HttpContext httpContext, AppDbContext dbContext) =>
{
    var currentUser = await AuthHelpers.GetCurrentUserAsync(httpContext, dbContext);
    if (currentUser is null)
    {
        return UnauthorizedResult();
    }

    if (!AuthHelpers.IsAdmin(currentUser))
    {
        return ForbiddenResult("Only admins can view users.");
    }

    var users = await dbContext.Users
        .AsNoTracking()
        .Select(user => new UserResponse(
            user.Id,
            user.Username,
            user.Role,
            user.EmployeeId,
            user.Employee != null ? user.Employee.Department : null))
        .ToListAsync();

    return Results.Ok(users);
})
.WithName("GetUsers")
.WithTags("Users");

app.MapGet("/users/{id:int}", async (int id, HttpContext httpContext, AppDbContext dbContext) =>
{
    var currentUser = await AuthHelpers.GetCurrentUserAsync(httpContext, dbContext);
    if (currentUser is null)
    {
        return UnauthorizedResult();
    }

    if (!AuthHelpers.IsAdmin(currentUser))
    {
        return ForbiddenResult("Only admins can view users.");
    }

    var user = await dbContext.Users
        .AsNoTracking()
        .Where(user => user.Id == id)
        .Select(user => new UserResponse(
            user.Id,
            user.Username,
            user.Role,
            user.EmployeeId,
            user.Employee != null ? user.Employee.Department : null))
        .FirstOrDefaultAsync();

    return user is null ? Results.NotFound() : Results.Ok(user);
})
.WithName("GetUserById")
.WithTags("Users");

app.MapPost("/users", async (CreateUserRequest request, HttpContext httpContext, AppDbContext dbContext) =>
{
    var currentUser = await AuthHelpers.GetCurrentUserAsync(httpContext, dbContext);
    if (currentUser is null)
    {
        return UnauthorizedResult();
    }

    if (!AuthHelpers.IsAdmin(currentUser))
    {
        return ForbiddenResult("Only admins can create users.");
    }

    var validationErrors = validateUser(request.Username, request.Password, request.Role, true);
    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    if (!AuthHelpers.IsAdmin(new RequestUserContext(0, string.Empty, request.Role.Trim(), request.EmployeeId, null)) &&
        !request.EmployeeId.HasValue)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["employeeId"] = ["Managers and employees must be linked to an employee profile."]
        });
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
})
.WithName("CreateUser")
.WithTags("Users");

app.MapPut("/users/{id:int}", async (int id, UpdateUserRequest request, HttpContext httpContext, AppDbContext dbContext) =>
{
    var currentUser = await AuthHelpers.GetCurrentUserAsync(httpContext, dbContext);
    if (currentUser is null)
    {
        return UnauthorizedResult();
    }

    if (!AuthHelpers.IsAdmin(currentUser))
    {
        return ForbiddenResult("Only admins can update users.");
    }

    var validationErrors = validateUser(request.Username, request.Password, request.Role, false);
    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    if (!AuthHelpers.IsAdmin(new RequestUserContext(0, string.Empty, request.Role.Trim(), request.EmployeeId, null)) &&
        !request.EmployeeId.HasValue)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["employeeId"] = ["Managers and employees must be linked to an employee profile."]
        });
    }

    var user = await dbContext.Users.FindAsync(id);
    if (user is null)
    {
        return Results.NotFound();
    }

    var username = request.Username.Trim();
    var exists = await dbContext.Users.AnyAsync(existingUser => existingUser.Id != id && existingUser.Username == username);
    if (exists)
    {
        return Results.Conflict(new { message = "Username already exists." });
    }

    user.Username = username;
    user.Role = request.Role.Trim();
    user.EmployeeId = request.EmployeeId;
    if (!string.IsNullOrWhiteSpace(request.Password))
    {
        user.PasswordHash = request.Password.Trim();
    }

    await dbContext.SaveChangesAsync();

    var updatedUser = await dbContext.Users
        .AsNoTracking()
        .Where(existingUser => existingUser.Id == user.Id)
        .Select(existingUser => new UserResponse(
            existingUser.Id,
            existingUser.Username,
            existingUser.Role,
            existingUser.EmployeeId,
            existingUser.Employee != null ? existingUser.Employee.Department : null))
        .FirstAsync();

    return Results.Ok(updatedUser);
})
.WithName("UpdateUser")
.WithTags("Users");

app.MapDelete("/users/{id:int}", async (int id, HttpContext httpContext, AppDbContext dbContext) =>
{
    var currentUser = await AuthHelpers.GetCurrentUserAsync(httpContext, dbContext);
    if (currentUser is null)
    {
        return UnauthorizedResult();
    }

    if (!AuthHelpers.IsAdmin(currentUser))
    {
        return ForbiddenResult("Only admins can delete users.");
    }

    var user = await dbContext.Users.FindAsync(id);
    if (user is null)
    {
        return Results.NotFound();
    }

    dbContext.Users.Remove(user);
    await dbContext.SaveChangesAsync();

    return Results.NoContent();
})
.WithName("DeleteUser")
.WithTags("Users");

app.MapPost("/users/{id:int}/reset-password", async (int id, ResetPasswordRequest request, HttpContext httpContext, AppDbContext dbContext) =>
{
    var currentUser = await AuthHelpers.GetCurrentUserAsync(httpContext, dbContext);
    if (currentUser is null)
    {
        return UnauthorizedResult();
    }

    if (!AuthHelpers.IsAdmin(currentUser))
    {
        return ForbiddenResult("Only admins can reset passwords.");
    }

    if (string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["password"] = ["Password is required."]
        });
    }

    if (request.Password.Trim().Length < 6)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["password"] = ["Password must be at least 6 characters long."]
        });
    }

    var user = await dbContext.Users.FindAsync(id);
    if (user is null)
    {
        return Results.NotFound();
    }

    user.PasswordHash = request.Password.Trim();
    await dbContext.SaveChangesAsync();

    return Results.Ok(new { message = "Password reset successfully." });
})
.WithName("ResetUserPassword")
.WithTags("Users");

app.Run();

record UserResponse(int Id, string Username, string Role, int? EmployeeId, string? Department);

record CreateUserRequest(string Username, string Password, string Role, int? EmployeeId);

record UpdateUserRequest(string Username, string Password, string Role, int? EmployeeId);

record ResetPasswordRequest(string Password);
