import { useEffect, useState } from 'react'
import { authFetch, formatApiError } from '../lib/api'
import { formatScheduleDay, formatScheduleTime } from '../lib/schedule'

function ScheduleFlow({ user, compact = false }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSchedule = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await authFetch(user, '/tasks')
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(formatApiError(data, 'Unable to load schedule data.'))
      }

      const tasks = await response.json()
      const upcomingTasks = tasks
        .filter((task) => !task.isCompleted)
        .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
        .slice(0, compact ? 4 : 8)

      setItems(upcomingTasks)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load schedule data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
  }, [user.id])

  return (
    <article className={compact ? 'panel panel-wide' : 'panel panel-wide active-panel'}>
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Schedule</p>
          <h2>{compact ? 'Upcoming flow' : 'Live schedule flow'}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={loadSchedule}>
          Refresh
        </button>
      </div>

      {loading ? <p className="directory-state">Loading upcoming tasks...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="empty-state">No upcoming scheduled tasks are available right now.</p>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="timeline">
          {items.map((item) => (
            <div className="timeline-row" key={item.id}>
              <div className="timeline-time">
                <strong>{formatScheduleTime(item.dueDate)}</strong>
                <span>{formatScheduleDay(item.dueDate)}</span>
              </div>
              <div className="timeline-dot" aria-hidden="true"></div>
              <div className="timeline-copy">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <div className="task-assignment timeline-meta">
                  <span>{item.assignedEmployeeName ?? 'Unassigned task'}</span>
                  <span>{item.assignedEmployeeDepartment ?? 'General queue'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export default ScheduleFlow
