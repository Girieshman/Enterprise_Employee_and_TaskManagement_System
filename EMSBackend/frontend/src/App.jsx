import { useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'
import { formatApiError } from './lib/api'
import { API_BASE_URL, SESSION_STORAGE_KEY } from './lib/constants'

function App() {
  const [form, setForm] = useState({ username: 'admin', password: 'admin123' })
  const [user, setUser] = useState(() => {
    const savedUser = window.localStorage.getItem(SESSION_STORAGE_KEY)

    if (!savedUser) {
      return null
    }

    try {
      return JSON.parse(savedUser)
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid username or password.')
        }

        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, 'Login failed. Please try again.'))
      }

      const data = await response.json()
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
      setUser(data)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to connect to the backend.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    setUser(null)
  }

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  return (
    <LoginPage
      form={form}
      error={error}
      loading={loading}
      onChange={handleChange}
      onSubmit={handleLogin}
    />
  )
}

export default App
