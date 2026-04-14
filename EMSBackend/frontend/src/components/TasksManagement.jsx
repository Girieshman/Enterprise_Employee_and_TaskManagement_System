import { useEffect, useState } from 'react'
import { authFetch, formatApiError } from '../lib/api'
import { isAdmin, isEmployee, isManager } from '../lib/roles'

function TasksManagement({ user, onStatsChange }) {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [savingTaskId, setSavingTaskId] = useState(null)
  const [deletingTaskId, setDeletingTaskId] = useState(null)
  const [updatingTaskId, setUpdatingTaskId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    isCompleted: false,
    assignedEmployeeId: '',
  })

  const canCreate = isAdmin(user) || isManager(user)
  const canAssign = isAdmin(user) || isManager(user)
  const canDelete = isAdmin(user)
  const canEditTask = isAdmin(user) || isManager(user)
  const canToggleStatus = isAdmin(user) || isEmployee(user)

  const pushStats = (taskList) => {
    onStatsChange((current) => ({
      ...current,
      taskCount: taskList.length,
      completedTaskCount: taskList.filter((task) => task.isCompleted).length,
      pendingTaskCount: taskList.filter((task) => !task.isCompleted).length,
      assignedTaskCount: taskList.filter((task) => task.assignedEmployeeId !== null).length,
      unassignedTaskCount: taskList.filter((task) => task.assignedEmployeeId === null).length,
    }))
  }

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const taskResponse = await authFetch(user, '/tasks')
      if (!taskResponse.ok) {
        const data = await taskResponse.json().catch(() => null)
        throw new Error(formatApiError(data, 'Unable to load tasks.'))
      }

      const taskData = await taskResponse.json()
      setTasks(taskData)
      pushStats(taskData)

      if (canAssign) {
        const employeeResponse = await authFetch(user, '/employees')
        if (!employeeResponse.ok) {
          const data = await employeeResponse.json().catch(() => null)
          throw new Error(formatApiError(data, 'Unable to load employees for assignment.'))
        }

        const employeeData = await employeeResponse.json()
        setEmployees(employeeData)
      } else {
        setEmployees([])
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setEditingTaskId(null)
    setForm({
      title: '',
      description: '',
      dueDate: '',
      isCompleted: false,
      assignedEmployeeId: '',
    })
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const payload = {
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      isCompleted: form.isCompleted,
      assignedEmployeeId: canAssign ? (form.assignedEmployeeId ? Number(form.assignedEmployeeId) : null) : null,
    }

    if (editingTaskId === null) {
      setCreating(true)
    } else {
      setSavingTaskId(editingTaskId)
    }

    try {
      const response = await authFetch(user, editingTaskId === null ? '/tasks' : `/tasks/${editingTaskId}`, {
        method: editingTaskId === null ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, editingTaskId === null ? 'Unable to create task.' : 'Unable to update task.'))
      }

      const savedTask = await response.json()
      const nextTasks = editingTaskId === null
        ? [savedTask, ...tasks]
        : tasks.map((task) => (task.id === savedTask.id ? savedTask : task))

      setTasks(nextTasks)
      pushStats(nextTasks)
      setSuccessMessage(editingTaskId === null ? 'Task created successfully.' : 'Task updated successfully.')
      resetForm()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save task.')
    } finally {
      setCreating(false)
      setSavingTaskId(null)
    }
  }

  const startEdit = (task) => {
    setEditingTaskId(task.id)
    setForm({
      title: task.title,
      description: task.description,
      dueDate: new Date(task.dueDate).toISOString().slice(0, 16),
      isCompleted: task.isCompleted,
      assignedEmployeeId: task.assignedEmployeeId ?? '',
    })
    setError('')
    setSuccessMessage('')
  }

  const handleDelete = async (taskId) => {
    setDeletingTaskId(taskId)
    setError('')
    setSuccessMessage('')

    try {
      const response = await authFetch(user, `/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, 'Unable to delete task.'))
      }

      const nextTasks = tasks.filter((task) => task.id !== taskId)
      setTasks(nextTasks)
      pushStats(nextTasks)
      setSuccessMessage('Task deleted successfully.')
      if (editingTaskId === taskId) {
        resetForm()
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete task.')
    } finally {
      setDeletingTaskId(null)
    }
  }

  const handleStatusToggle = async (task) => {
    setUpdatingTaskId(task.id)
    setError('')
    setSuccessMessage('')

    try {
      const response = await authFetch(user, `/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          isCompleted: !task.isCompleted,
          assignedEmployeeId: task.assignedEmployeeId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, 'Unable to update task status.'))
      }

      const updatedTask = await response.json()
      const nextTasks = tasks.map((item) => (item.id === updatedTask.id ? updatedTask : item))
      setTasks(nextTasks)
      pushStats(nextTasks)
      setSuccessMessage('Task status updated successfully.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update task status.')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = [task.title, task.description, task.assignedEmployeeName ?? '']
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !task.isCompleted) ||
      (statusFilter === 'completed' && task.isCompleted)

    const matchesAssignment =
      assignmentFilter === 'all' ||
      (assignmentFilter === 'assigned' && task.assignedEmployeeId !== null) ||
      (assignmentFilter === 'unassigned' && task.assignedEmployeeId === null)

    return matchesSearch && matchesStatus && matchesAssignment
  })

  return (
    <article className="panel panel-wide active-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Task Management</p>
          <h2>{isEmployee(user) ? 'Assigned tasks' : 'Create and manage tasks'}</h2>
        </div>
        <span className="panel-tag accent">{filteredTasks.length} visible</span>
      </div>

      <div className="employee-management-grid">
        {canCreate ? (
          <form className="employee-form" onSubmit={handleSubmit}>
            <label htmlFor="task-title">
              Title
              <input id="task-title" name="title" value={form.title} onChange={handleChange} placeholder="Enter task title" />
            </label>

            <label htmlFor="task-description">
              Description
              <input id="task-description" name="description" value={form.description} onChange={handleChange} placeholder="Enter task description" />
            </label>

            <label htmlFor="task-dueDate">
              Due date
              <input id="task-dueDate" name="dueDate" type="datetime-local" value={form.dueDate} onChange={handleChange} />
            </label>

            {canAssign ? (
              <label htmlFor="task-assignee">
                Assign to employee
                <select id="task-assignee" name="assignedEmployeeId" value={form.assignedEmployeeId} onChange={handleChange} className="form-select">
                  <option value="">Unassigned</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.department}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {isAdmin(user) ? (
              <label className="checkbox-row" htmlFor="task-completed">
                <input id="task-completed" name="isCompleted" type="checkbox" checked={form.isCompleted} onChange={handleChange} />
                Mark as completed
              </label>
            ) : null}

            {error ? <p className="form-error">{error}</p> : null}
            {successMessage ? <p className="form-success">{successMessage}</p> : null}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={creating || savingTaskId !== null}>
                {editingTaskId === null
                  ? (creating ? 'Creating task...' : 'Create Task')
                  : (savingTaskId !== null ? 'Saving...' : 'Save Task')}
              </button>
              {editingTaskId !== null ? (
                <button className="secondary-button" type="button" onClick={resetForm}>Cancel</button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="employee-form employee-form-readonly">
            <p className="panel-kicker">Employee permissions</p>
            <h3>Update task status</h3>
            <p className="directory-state">
              Employees can view only their assigned tasks and update completion status.
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            {successMessage ? <p className="form-success">{successMessage}</p> : null}
          </div>
        )}

        <div className="employee-directory">
          <div className="directory-header">
            <h3>{isEmployee(user) ? 'Assigned tasks' : 'Visible tasks'}</h3>
            <button className="secondary-button" type="button" onClick={loadData}>Refresh</button>
          </div>

          <div className="toolbar">
            <input
              className="toolbar-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, description, or assignee"
            />
            <select className="form-select toolbar-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <select className="form-select toolbar-filter" value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)}>
              <option value="all">All assignments</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {loading ? <p className="directory-state">Loading tasks...</p> : null}
          {!loading && filteredTasks.length === 0 ? (
            <p className="empty-state">No tasks match your current search or filter.</p>
          ) : null}

          {!loading && filteredTasks.length > 0 ? (
            <div className="task-stack">
              {filteredTasks.map((task) => (
                <div className="task-card task-card-detailed" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.description}</p>
                    <div className="task-assignment">
                      <span>Assigned to: {task.assignedEmployeeName ?? 'Unassigned'}</span>
                      <span>Due: {new Date(task.dueDate).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="task-actions">
                    <span className={task.isCompleted ? 'status-pill' : 'panel-tag'}>
                      {task.isCompleted ? 'Completed' : 'Pending'}
                    </span>

                    {canEditTask ? (
                      <button className="mini-button" type="button" onClick={() => startEdit(task)}>
                        Edit
                      </button>
                    ) : null}

                    {canToggleStatus ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => handleStatusToggle(task)}
                        disabled={updatingTaskId === task.id}
                      >
                        {updatingTaskId === task.id
                          ? 'Updating...'
                          : task.isCompleted
                            ? 'Mark Pending'
                            : 'Mark Complete'}
                      </button>
                    ) : null}

                    {canDelete ? (
                      <button
                        className="mini-button danger"
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        disabled={deletingTaskId === task.id}
                      >
                        {deletingTaskId === task.id ? 'Deleting...' : 'Delete'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default TasksManagement
