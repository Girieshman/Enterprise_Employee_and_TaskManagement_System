namespace EMSBackend.Models
{
    public class TaskItem
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Status { get; set; }

        public int EmployeeId { get; set; }
        public Employee Employee { get; set; }
    }
}