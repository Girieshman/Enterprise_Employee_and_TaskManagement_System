export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5171'
export const SESSION_STORAGE_KEY = 'ems-auth-user'

export const emptyStats = {
  employeeCount: 0,
  departmentCount: 0,
  taskCount: 0,
  completedTaskCount: 0,
  pendingTaskCount: 0,
  assignedTaskCount: 0,
  unassignedTaskCount: 0,
}
