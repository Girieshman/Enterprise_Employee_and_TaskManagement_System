namespace EMSBackend.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Employee";
    public int? EmployeeId { get; set; }
    public Employee? Employee { get; set; }
}
