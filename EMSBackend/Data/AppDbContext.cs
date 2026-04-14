using EMSBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace EMSBackend.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<User> Users => Set<User>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Employee>()
            .Property(employee => employee.Name)
            .HasMaxLength(100);

        modelBuilder.Entity<User>()
            .HasIndex(user => user.Username)
            .IsUnique();

        modelBuilder.Entity<User>()
            .Property(user => user.Username)
            .HasMaxLength(50);

        modelBuilder.Entity<User>()
            .HasOne(user => user.Employee)
            .WithMany()
            .HasForeignKey(user => user.EmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TaskItem>()
            .Property(task => task.Title)
            .HasMaxLength(150);

        modelBuilder.Entity<TaskItem>()
            .HasOne(task => task.AssignedEmployee)
            .WithMany(employee => employee.Tasks)
            .HasForeignKey(task => task.AssignedEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
