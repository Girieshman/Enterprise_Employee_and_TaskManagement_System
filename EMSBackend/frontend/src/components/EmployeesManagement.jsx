import { useEffect, useState } from 'react'
import { authFetch, formatApiError } from '../lib/api'

function EmployeesManagement({ user, onStatsChange }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState(null)
  const [savingEmployeeId, setSavingEmployeeId] = useState(null)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
  })

  const pushStats = (employeeList) => {
    onStatsChange((current) => ({
      ...current,
      employeeCount: employeeList.length,
      departmentCount: new Set(employeeList.map((employee) => employee.department)).size,
    }))
  }

  const loadEmployees = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await authFetch(user, '/employees')
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, 'Unable to load employees.'))
      }

      const data = await response.json()
      setEmployees(data)
      pushStats(data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load employees.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setEditingEmployeeId(null)
    setForm({
      name: '',
      email: '',
      department: '',
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const isEdit = editingEmployeeId !== null
    if (isEdit) {
      setSavingEmployeeId(editingEmployeeId)
    } else {
      setCreating(true)
    }

    try {
      const response = await authFetch(user, isEdit ? `/employees/${editingEmployeeId}` : '/employees', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, isEdit ? 'Unable to update employee.' : 'Unable to create employee.'))
      }

      const savedEmployee = await response.json()
      const nextEmployees = isEdit
        ? employees.map((employee) => (employee.id === savedEmployee.id ? savedEmployee : employee))
        : [savedEmployee, ...employees]

      setEmployees(nextEmployees)
      pushStats(nextEmployees)
      setSuccessMessage(isEdit ? 'Employee updated successfully.' : 'Employee created successfully.')
      resetForm()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save employee.')
    } finally {
      setCreating(false)
      setSavingEmployeeId(null)
    }
  }

  const startEdit = (employee) => {
    setEditingEmployeeId(employee.id)
    setForm({
      name: employee.name,
      email: employee.email,
      department: employee.department,
    })
    setError('')
    setSuccessMessage('')
  }

  const handleDelete = async (employeeId) => {
    setDeletingEmployeeId(employeeId)
    setError('')
    setSuccessMessage('')

    try {
      const response = await authFetch(user, `/employees/${employeeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, 'Unable to delete employee.'))
      }

      const nextEmployees = employees.filter((employee) => employee.id !== employeeId)
      setEmployees(nextEmployees)
      pushStats(nextEmployees)
      if (editingEmployeeId === employeeId) {
        resetForm()
      }
      setSuccessMessage('Employee deleted successfully.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete employee.')
    } finally {
      setDeletingEmployeeId(null)
    }
  }

  const departmentOptions = ['all', ...new Set(employees.map((employee) => employee.department))]
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = [employee.name, employee.email, employee.department]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter
    return matchesSearch && matchesDepartment
  })

  return (
    <article className="panel panel-wide active-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Admin Only</p>
          <h2>Employee management</h2>
        </div>
        <span className="panel-tag accent">{filteredEmployees.length} visible</span>
      </div>

      <div className="employee-management-grid">
        <form className="employee-form" onSubmit={handleSubmit}>
          <label htmlFor="employee-name">
            Full name
            <input id="employee-name" name="name" value={form.name} onChange={handleChange} placeholder="Enter employee name" />
          </label>

          <label htmlFor="employee-email">
            Email
            <input id="employee-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter employee email" />
          </label>

          <label htmlFor="employee-department">
            Department
            <input id="employee-department" name="department" value={form.department} onChange={handleChange} placeholder="Enter department" />
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          {successMessage ? <p className="form-success">{successMessage}</p> : null}

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={creating || savingEmployeeId !== null}>
              {editingEmployeeId === null
                ? (creating ? 'Adding employee...' : 'Add Employee')
                : (savingEmployeeId !== null ? 'Saving...' : 'Save Employee')}
            </button>
            {editingEmployeeId !== null ? (
              <button className="secondary-button" type="button" onClick={resetForm}>Cancel</button>
            ) : null}
          </div>
        </form>

        <div className="employee-directory">
          <div className="directory-header">
            <h3>View employees</h3>
            <button className="secondary-button" type="button" onClick={loadEmployees}>Refresh</button>
          </div>

          <div className="toolbar toolbar-two">
            <input
              className="toolbar-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or department"
            />
            <select
              className="form-select toolbar-filter"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              {departmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All departments' : option}
                </option>
              ))}
            </select>
          </div>

          {loading ? <p className="directory-state">Loading employees...</p> : null}
          {!loading && filteredEmployees.length === 0 ? (
            <p className="empty-state">No employees match your current search or filter.</p>
          ) : null}

          {!loading && filteredEmployees.length > 0 ? (
            <div className="employee-list">
              {filteredEmployees.map((employee) => (
                <div className="employee-row" key={employee.id}>
                  <div className="avatar">{employee.name[0]}</div>
                  <div className="employee-meta">
                    <strong>{employee.name}</strong>
                    <span>{employee.email}</span>
                  </div>
                  <div className="employee-dept">{employee.department}</div>
                  <div className="record-actions">
                    <button className="mini-button" type="button" onClick={() => startEdit(employee)}>Edit</button>
                    <button
                      className="mini-button danger"
                      type="button"
                      onClick={() => handleDelete(employee.id)}
                      disabled={deletingEmployeeId === employee.id}
                    >
                      {deletingEmployeeId === employee.id ? 'Deleting...' : 'Delete'}
                    </button>
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

export default EmployeesManagement
