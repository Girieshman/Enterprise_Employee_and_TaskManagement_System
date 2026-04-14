import { useEffect, useState } from 'react'
import DashboardOverview from './DashboardOverview'
import EmployeesManagement from './EmployeesManagement'
import ScheduleFlow from './ScheduleFlow'
import TasksManagement from './TasksManagement'
import UsersManagement from './UsersManagement'
import { authFetch } from '../lib/api'
import { emptyStats } from '../lib/constants'
import { getNavItems, isAdmin } from '../lib/roles'

function Dashboard({ user, onLogout }) {
  const navItems = getNavItems(user)
  const [activeView, setActiveView] = useState(navItems[0].id)
  const [stats, setStats] = useState(emptyStats)

  useEffect(() => {
    if (!navItems.some((item) => item.id === activeView)) {
      setActiveView(navItems[0].id)
    }
  }, [activeView, navItems])

  useEffect(() => {
    let cancelled = false

    const loadStats = async () => {
      try {
        const [taskResponse, employeeResponse] = await Promise.all([
          authFetch(user, '/tasks'),
          authFetch(user, '/employees'),
        ])

        const taskData = taskResponse.ok ? await taskResponse.json() : []
        const employeeData = employeeResponse.ok ? await employeeResponse.json() : []

        if (!cancelled) {
          setStats({
            employeeCount: employeeData.length,
            departmentCount: new Set(employeeData.map((employee) => employee.department)).size,
            taskCount: taskData.length,
            completedTaskCount: taskData.filter((task) => task.isCompleted).length,
            pendingTaskCount: taskData.filter((task) => !task.isCompleted).length,
            assignedTaskCount: taskData.filter((task) => task.assignedEmployeeId !== null).length,
            unassignedTaskCount: taskData.filter((task) => task.assignedEmployeeId === null).length,
          })
        }
      } catch {
        if (!cancelled) {
          setStats(emptyStats)
        }
      }
    }

    loadStats()

    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">EMS Workspace</p>
          <h1 className="topbar-title">Operations dashboard</h1>
        </div>

        <div className="topbar-user">
          <div className="topbar-user-copy">
            <strong>{user.username}</strong>
            <span>{user.role}</span>
          </div>
          <button className="secondary-button" type="button" onClick={onLogout}>Log Out</button>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="sidebar-brand-mark">
              <strong>EMS</strong>
              <small>OS</small>
            </span>
            <div>
              <strong>EMS Workspace</strong>
            </div>
          </div>

          <div className="sidebar-block">
            <p className="panel-kicker">Navigation</p>
            <nav className="nav-list" aria-label="Dashboard navigation">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === activeView ? 'nav-item active' : 'nav-item'}
                  onClick={() => setActiveView(item.id)}
                >
                  <strong>{item.label}</strong>
                </button>
              ))}
            </nav>
          </div>

          <div className="sidebar-block">
            <p className="panel-kicker">Logged in user</p>
            <div className="user-card">
              <div className="avatar large">{user.username[0].toUpperCase()}</div>
              <div className="employee-meta">
                <strong>{user.username}</strong>
                <span>{user.role}</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="workspace-main workspace-stage" key={activeView}>
          {activeView === 'overview' ? (
            <DashboardOverview stats={stats} user={user} onNavigate={setActiveView} />
          ) : null}

          <section className="content-grid">
            {activeView === 'users' && isAdmin(user) ? <UsersManagement user={user} /> : null}
            {activeView === 'employees' && isAdmin(user) ? (
              <EmployeesManagement user={user} onStatsChange={setStats} />
            ) : null}
            {activeView === 'tasks' ? (
              <TasksManagement user={user} onStatsChange={setStats} />
            ) : null}
            {activeView === 'schedule' ? <ScheduleFlow user={user} /> : null}
          </section>
        </div>
      </section>
    </main>
  )
}

export default Dashboard
