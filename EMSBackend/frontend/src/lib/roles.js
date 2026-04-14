export function isAdmin(user) {
  return user?.role === 'Admin'
}

export function isManager(user) {
  return user?.role === 'Manager'
}

export function isEmployee(user) {
  return user?.role === 'Employee' || user?.role === 'User'
}

export function getNavItems(user) {
  const items = [{ id: 'overview', label: 'Dashboard' }]

  if (isAdmin(user)) {
    items.push({ id: 'users', label: 'Users' })
    items.push({ id: 'employees', label: 'Employees' })
  }

  if (isAdmin(user) || isManager(user) || isEmployee(user)) {
    items.push({ id: 'tasks', label: 'Tasks' })
  }

  items.push({ id: 'schedule', label: 'Schedule' })
  return items
}
