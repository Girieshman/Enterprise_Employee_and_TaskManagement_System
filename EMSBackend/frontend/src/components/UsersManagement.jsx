import { useEffect, useState } from 'react'
import { authFetch, formatApiError } from '../lib/api'

function UsersManagement({ user }) {
  const [users, setUsers] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [resettingUserId, setResettingUserId] = useState(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'Employee',
    employeeId: '',
  })

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [usersResponse, employeesResponse] = await Promise.all([
        authFetch(user, '/users'),
        authFetch(user, '/employees'),
      ])

      if (!usersResponse.ok || !employeesResponse.ok) {
        throw new Error('Unable to load user management data.')
      }

      const [usersData, employeesData] = await Promise.all([
        usersResponse.json(),
        employeesResponse.json(),
      ])

      setUsers(usersData)
      setEmployees(employeesData)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load user data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await authFetch(user, '/users', {
        method: 'POST',
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          role: form.role,
          employeeId: form.role === 'Admin' ? null : (form.employeeId ? Number(form.employeeId) : null),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, 'Unable to create user.'))
      }

      const createdUser = await response.json()
      setUsers((current) => [createdUser, ...current])
      setForm({
        username: '',
        password: '',
        role: 'Employee',
        employeeId: '',
      })
      setSuccessMessage('User created successfully.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create user.')
    } finally {
      setCreating(false)
    }
  }

  const handlePasswordReset = async (targetUserId) => {
    setError('')
    setSuccessMessage('')
    setResettingUserId(targetUserId)

    try {
      const response = await authFetch(user, `/users/${targetUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          password: resetPasswordValue,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, 'Unable to reset password.'))
      }

      setResetPasswordValue('')
      setSuccessMessage('Password reset successfully.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reset password.')
    } finally {
      setResettingUserId(null)
    }
  }

  return (
    <article className="panel panel-wide active-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Admin Only</p>
          <h2>Create users</h2>
        </div>
        <span className="panel-tag accent">{users.length} users</span>
      </div>

      <div className="employee-management-grid">
        <form className="employee-form" onSubmit={handleSubmit}>
          <label htmlFor="user-username">
            Username
            <input id="user-username" name="username" value={form.username} onChange={handleChange} placeholder="Enter username" />
          </label>

          <label htmlFor="user-password">
            Password
            <input id="user-password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Enter password" />
          </label>

          <label htmlFor="user-role">
            Role
            <select id="user-role" name="role" value={form.role} onChange={handleChange} className="form-select">
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
            </select>
          </label>

          {form.role !== 'Admin' ? (
            <label htmlFor="user-employee">
              Linked employee
              <select id="user-employee" name="employeeId" value={form.employeeId} onChange={handleChange} className="form-select">
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.department}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          {successMessage ? <p className="form-success">{successMessage}</p> : null}

          <button className="primary-button" type="submit" disabled={creating}>
            {creating ? 'Creating user...' : 'Create User'}
          </button>
        </form>

        <div className="employee-directory">
          <div className="directory-header">
            <h3>Existing users</h3>
            <button className="secondary-button" type="button" onClick={loadData}>Refresh</button>
          </div>

          <div className="password-reset-bar">
            <input
              className="toolbar-search"
              type="password"
              value={resetPasswordValue}
              onChange={(event) => setResetPasswordValue(event.target.value)}
              placeholder="Enter a new password for reset"
            />
          </div>

          {loading ? <p className="directory-state">Loading users...</p> : null}

          {!loading ? (
            <div className="employee-list">
              {users.map((item) => (
                <div className="employee-row" key={item.id}>
                  <div className="avatar">{item.username[0].toUpperCase()}</div>
                  <div className="employee-meta">
                    <strong>{item.username}</strong>
                    <span>{item.department ?? 'No linked department'}</span>
                  </div>
                  <div className="employee-dept">{item.role}</div>
                  <div className="record-actions">
                    <span className="status-pill">{item.employeeId ? 'Linked' : 'Global'}</span>
                    <button
                      className="mini-button"
                      type="button"
                      onClick={() => handlePasswordReset(item.id)}
                      disabled={resettingUserId === item.id || resetPasswordValue.trim().length === 0}
                    >
                      {resettingUserId === item.id ? 'Resetting...' : 'Reset Password'}
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

export default UsersManagement
