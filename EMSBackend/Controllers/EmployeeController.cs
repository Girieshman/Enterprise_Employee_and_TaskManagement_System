using EMSBackend.Data;
using EMSBackend.Models;
using EMSBackend.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EMSBackend.Controllers;

[ApiController]
[Route("employees")]
public class EmployeeController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IResult> GetEmployees()
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        var employeeQuery = dbContext.Employees.AsNoTracking().AsQueryable();

        if (AuthHelpers.IsManager(currentUser) && !string.IsNullOrWhiteSpace(currentUser.Department))
        {
            employeeQuery = employeeQuery.Where(employee => employee.Department == currentUser.Department);
        }
        else if (AuthHelpers.IsEmployee(currentUser))
        {
            if (!currentUser.EmployeeId.HasValue)
            {
                return Forbidden("Your account is not linked to an employee profile.");
            }

            employeeQuery = employeeQuery.Where(employee => employee.Id == currentUser.EmployeeId.Value);
        }

        var employees = await employeeQuery
            .Select(employee => new EmployeeResponse(
                employee.Id,
                employee.Name,
                employee.Email,
                employee.Department))
            .ToListAsync();

        return Results.Ok(employees);
    }

    [HttpGet("{id:int}")]
    public async Task<IResult> GetEmployeeById(int id)
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        var employee = await dbContext.Employees
            .AsNoTracking()
            .Where(employee => employee.Id == id)
            .Select(employee => new EmployeeDetailResponse(
                employee.Id,
                employee.Name,
                employee.Email,
                employee.Department,
                employee.Tasks.Select(task => new TaskSummaryResponse(
                    task.Id,
                    task.Title,
                    task.Description,
                    task.DueDate,
                    task.IsCompleted,
                    task.AssignedEmployeeId)).ToList()))
            .FirstOrDefaultAsync();

        if (employee is null)
        {
            return Results.NotFound();
        }

        if (AuthHelpers.IsManager(currentUser) &&
            !string.Equals(employee.Department, currentUser.Department, StringComparison.OrdinalIgnoreCase))
        {
            return Forbidden("Managers can only view employees in their own department.");
        }

        if (AuthHelpers.IsEmployee(currentUser) && currentUser.EmployeeId != employee.Id)
        {
            return Forbidden("Employees can only view their own profile.");
        }

        return Results.Ok(employee);
    }

    [HttpPost]
    public async Task<IResult> CreateEmployee(CreateEmployeeRequest request)
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        if (!AuthHelpers.IsAdmin(currentUser))
        {
            return Forbidden("Only admins can create employees.");
        }

        var validationErrors = ValidateEmployee(request.Name, request.Email, request.Department);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        var employee = new Employee
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Department = request.Department.Trim()
        };

        dbContext.Employees.Add(employee);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/employees/{employee.Id}", new EmployeeResponse(
            employee.Id,
            employee.Name,
            employee.Email,
            employee.Department));
    }

    [HttpPut("{id:int}")]
    public async Task<IResult> UpdateEmployee(int id, UpdateEmployeeRequest request)
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        if (!AuthHelpers.IsAdmin(currentUser))
        {
            return Forbidden("Only admins can update employees.");
        }

        var validationErrors = ValidateEmployee(request.Name, request.Email, request.Department);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        var employee = await dbContext.Employees.FindAsync(id);
        if (employee is null)
        {
            return Results.NotFound();
        }

        employee.Name = request.Name.Trim();
        employee.Email = request.Email.Trim();
        employee.Department = request.Department.Trim();

        await dbContext.SaveChangesAsync();

        return Results.Ok(new EmployeeResponse(
            employee.Id,
            employee.Name,
            employee.Email,
            employee.Department));
    }

    [HttpDelete("{id:int}")]
    public async Task<IResult> DeleteEmployee(int id)
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        if (!AuthHelpers.IsAdmin(currentUser))
        {
            return Forbidden("Only admins can delete employees.");
        }

        var employee = await dbContext.Employees.FindAsync(id);
        if (employee is null)
        {
            return Results.NotFound();
        }

        dbContext.Employees.Remove(employee);
        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

    private static Dictionary<string, string[]> ValidateEmployee(string name, string email, string department)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(name))
        {
            errors["name"] = ["Name is required."];
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            errors["email"] = ["Email is required."];
        }
        else if (!email.Contains('@') || !email.Contains('.'))
        {
            errors["email"] = ["Email must be a valid email address."];
        }

        if (string.IsNullOrWhiteSpace(department))
        {
            errors["department"] = ["Department is required."];
        }

        return errors;
    }

    private static IResult Forbidden(string message) => Results.Json(
        new { message },
        statusCode: StatusCodes.Status403Forbidden);

    public record EmployeeResponse(int Id, string Name, string Email, string Department);

    public record EmployeeDetailResponse(
        int Id,
        string Name,
        string Email,
        string Department,
        List<TaskSummaryResponse> Tasks);

    public record TaskSummaryResponse(
        int Id,
        string Title,
        string Description,
        DateTime DueDate,
        bool IsCompleted,
        int? AssignedEmployeeId);

    public record CreateEmployeeRequest(string Name, string Email, string Department);

    public record UpdateEmployeeRequest(string Name, string Email, string Department);
}
