using Microsoft.EntityFrameworkCore;
using EMSBackend.Models;

namespace EMSBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }
    }
}