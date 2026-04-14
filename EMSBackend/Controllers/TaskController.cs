using EMSBackend.Data;
using EMSBackend.Models;
using EMSBackend.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EMSBackend.Controllers;

[ApiController]
[Route("tasks")]
public class TaskController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IResult> GetTasks()
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        var taskQuery = dbContext.TaskItems.AsNoTracking().AsQueryable();

        if (AuthHelpers.IsManager(currentUser))
        {
            if (string.IsNullOrWhiteSpace(currentUser.Department))
            {
                return Forbidden("Manager account is not linked to a department.");
            }

            taskQuery = taskQuery.Where(task =>
                task.AssignedEmployeeId == null ||
                (task.AssignedEmployee != null && task.AssignedEmployee.Department == currentUser.Department));
        }
        else if (AuthHelpers.IsEmployee(currentUser))
        {
            if (!currentUser.EmployeeId.HasValue)
            {
                return Forbidden("Employee account is not linked to an employee profile.");
            }

            taskQuery = taskQuery.Where(task => task.AssignedEmployeeId == currentUser.EmployeeId.Value);
        }

        var tasks = await taskQuery
            .Select(task => new TaskResponse(
                task.Id,
                task.Title,
                task.Description,
                task.DueDate,
                task.IsCompleted,
                task.AssignedEmployeeId,
                task.AssignedEmployee != null ? task.AssignedEmployee.Name : null,
                task.AssignedEmployee != null ? task.AssignedEmployee.Department : null))
            .ToListAsync();

        return Results.Ok(tasks);
    }

    [HttpGet("{id:int}")]
    public async Task<IResult> GetTaskById(int id)
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        var task = await dbContext.TaskItems
            .AsNoTracking()
            .Where(task => task.Id == id)
            .Select(task => new TaskResponse(
                task.Id,
                task.Title,
                task.Description,
                task.DueDate,
                task.IsCompleted,
                task.AssignedEmployeeId,
                task.AssignedEmployee != null ? task.AssignedEmployee.Name : null,
                task.AssignedEmployee != null ? task.AssignedEmployee.Department : null))
            .FirstOrDefaultAsync();

        if (task is null)
        {
            return Results.NotFound();
        }

        if (AuthHelpers.IsManager(currentUser) &&
            task.AssignedEmployeeDepartment is not null &&
            !string.Equals(task.AssignedEmployeeDepartment, currentUser.Department, StringComparison.OrdinalIgnoreCase))
        {
            return Forbidden("Managers can only view team tasks.");
        }

        if (AuthHelpers.IsEmployee(currentUser) && currentUser.EmployeeId != task.AssignedEmployeeId)
        {
            return Forbidden("Employees can only view their assigned tasks.");
        }

        return Results.Ok(task);
    }

    [HttpPost]
    public async Task<IResult> CreateTask(CreateTaskRequest request)
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        if (AuthHelpers.IsEmployee(currentUser))
        {
            return Forbidden("Employees cannot create tasks.");
        }

        var validationErrors = ValidateTask(request.Title, request.Description, request.DueDate);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        Employee? assignedEmployee = null;
        if (request.AssignedEmployeeId.HasValue)
        {
            assignedEmployee = await dbContext.Employees.FindAsync(request.AssignedEmployeeId.Value);
            if (assignedEmployee is null)
            {
                return Results.BadRequest(new { message = "Assigned employee does not exist." });
            }

            if (AuthHelpers.IsManager(currentUser) &&
                !string.Equals(assignedEmployee.Department, currentUser.Department, StringComparison.OrdinalIgnoreCase))
            {
                return Forbidden("Managers can only assign tasks within their department.");
            }
        }

        var task = new TaskItem
        {
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            DueDate = request.DueDate,
            IsCompleted = request.IsCompleted,
            AssignedEmployeeId = request.AssignedEmployeeId
        };

        dbContext.TaskItems.Add(task);
        await dbContext.SaveChangesAsync();

        var createdTask = await dbContext.TaskItems
            .AsNoTracking()
            .Where(existingTask => existingTask.Id == task.Id)
            .Select(existingTask => new TaskResponse(
                existingTask.Id,
                existingTask.Title,
                existingTask.Description,
                existingTask.DueDate,
                existingTask.IsCompleted,
                existingTask.AssignedEmployeeId,
                existingTask.AssignedEmployee != null ? existingTask.AssignedEmployee.Name : null,
                existingTask.AssignedEmployee != null ? existingTask.AssignedEmployee.Department : null))
            .FirstAsync();

        return Results.Created($"/tasks/{task.Id}", createdTask);
    }

    [HttpPut("{id:int}")]
    public async Task<IResult> UpdateTask(int id, UpdateTaskRequest request)
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        var task = await dbContext.TaskItems.FindAsync(id);
        if (task is null)
        {
            return Results.NotFound();
        }

        if (AuthHelpers.IsEmployee(currentUser))
        {
            if (currentUser.EmployeeId != task.AssignedEmployeeId)
            {
                return Forbidden("Employees can only update the status of their assigned tasks.");
            }

            task.IsCompleted = request.IsCompleted;
            await dbContext.SaveChangesAsync();

            var employeeTask = await dbContext.TaskItems
                .AsNoTracking()
                .Where(existingTask => existingTask.Id == task.Id)
                .Select(existingTask => new TaskResponse(
                    existingTask.Id,
                    existingTask.Title,
                    existingTask.Description,
                    existingTask.DueDate,
                    existingTask.IsCompleted,
                    existingTask.AssignedEmployeeId,
                    existingTask.AssignedEmployee != null ? existingTask.AssignedEmployee.Name : null,
                    existingTask.AssignedEmployee != null ? existingTask.AssignedEmployee.Department : null))
                .FirstAsync();

            return Results.Ok(employeeTask);
        }

        var validationErrors = ValidateTask(request.Title, request.Description, request.DueDate);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        if (AuthHelpers.IsManager(currentUser) && task.AssignedEmployeeId.HasValue)
        {
            var currentAssignedEmployee = await dbContext.Employees.FindAsync(task.AssignedEmployeeId.Value);
            if (currentAssignedEmployee is not null &&
                !string.Equals(currentAssignedEmployee.Department, currentUser.Department, StringComparison.OrdinalIgnoreCase))
            {
                return Forbidden("Managers can only manage tasks within their department.");
            }
        }

        Employee? assignedEmployee = null;
        if (request.AssignedEmployeeId.HasValue)
        {
            assignedEmployee = await dbContext.Employees.FindAsync(request.AssignedEmployeeId.Value);
            if (assignedEmployee is null)
            {
                return Results.BadRequest(new { message = "Assigned employee does not exist." });
            }

            if (AuthHelpers.IsManager(currentUser) &&
                !string.Equals(assignedEmployee.Department, currentUser.Department, StringComparison.OrdinalIgnoreCase))
            {
                return Forbidden("Managers can only assign tasks within their department.");
            }
        }

        task.Title = request.Title.Trim();
        task.Description = request.Description.Trim();
        task.DueDate = request.DueDate;
        task.IsCompleted = request.IsCompleted;
        task.AssignedEmployeeId = request.AssignedEmployeeId;

        await dbContext.SaveChangesAsync();

        var updatedTask = await dbContext.TaskItems
            .AsNoTracking()
            .Where(existingTask => existingTask.Id == task.Id)
            .Select(existingTask => new TaskResponse(
                existingTask.Id,
                existingTask.Title,
                existingTask.Description,
                existingTask.DueDate,
                existingTask.IsCompleted,
                existingTask.AssignedEmployeeId,
                existingTask.AssignedEmployee != null ? existingTask.AssignedEmployee.Name : null,
                existingTask.AssignedEmployee != null ? existingTask.AssignedEmployee.Department : null))
            .FirstAsync();

        return Results.Ok(updatedTask);
    }

    [HttpDelete("{id:int}")]
    public async Task<IResult> DeleteTask(int id)
    {
        var currentUser = await AuthHelpers.GetCurrentUserAsync(HttpContext, dbContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        if (!AuthHelpers.IsAdmin(currentUser))
        {
            return Forbidden("Only admins can delete tasks.");
        }

        var task = await dbContext.TaskItems.FindAsync(id);
        if (task is null)
        {
            return Results.NotFound();
        }

        dbContext.TaskItems.Remove(task);
        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

    private static Dictionary<string, string[]> ValidateTask(string title, string description, DateTime dueDate)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(title))
        {
            errors["title"] = ["Title is required."];
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            errors["description"] = ["Description is required."];
        }

        if (dueDate == default)
        {
            errors["dueDate"] = ["Due date is required."];
        }

        return errors;
    }

    private static IResult Forbidden(string message) => Results.Json(
        new { message },
        statusCode: StatusCodes.Status403Forbidden);

    public record TaskResponse(
        int Id,
        string Title,
        string Description,
        DateTime DueDate,
        bool IsCompleted,
        int? AssignedEmployeeId,
        string? AssignedEmployeeName,
        string? AssignedEmployeeDepartment);

    public record CreateTaskRequest(
        string Title,
        string Description,
        DateTime DueDate,
        bool IsCompleted,
        int? AssignedEmployeeId);

    public record UpdateTaskRequest(
        string Title,
        string Description,
        DateTime DueDate,
        bool IsCompleted,
        int? AssignedEmployeeId);
}
