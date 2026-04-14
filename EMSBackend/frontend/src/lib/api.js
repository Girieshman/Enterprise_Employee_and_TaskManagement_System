import { API_BASE_URL } from './constants'

export async function authFetch(user, path, options = {}) {
  const headers = new Headers(options.headers ?? {})
  headers.set('X-User-Id', String(user.id))

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
}

export function formatApiError(data, fallbackMessage) {
  if (data?.errors) {
    const firstError = Object.values(data.errors)[0]
    if (Array.isArray(firstError) && firstError.length > 0) {
      return firstError[0]
    }
  }

  if (data?.message) {
    return data.message
  }

  return fallbackMessage
}
