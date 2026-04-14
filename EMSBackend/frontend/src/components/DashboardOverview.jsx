import ScheduleFlow from './ScheduleFlow'
import { isAdmin, isManager } from '../lib/roles'

function DashboardOverview({ stats, user, onNavigate }) {
  const roleConfig = isAdmin(user)
    ? {
        eyebrow: 'Admin Control Center',
        title: `Welcome back, ${user.username}.`,
        description:
          'You can create users, manage employees, see every task in the system, and assign work across the organization.',
        primaryLabel: 'Open Tasks',
        primaryAction: () => onNavigate('tasks'),
        secondaryLabel: 'Create Users',
        secondaryAction: () => onNavigate('users'),
        snapshotTitle: 'Workspace Snapshot',
        snapshotSummary: 'Full organizational visibility with user, employee, and task control.',
        metricCards: [
          { label: 'Visible Employees', value: String(stats.employeeCount), change: `${stats.departmentCount} departments` },
          { label: 'Visible Tasks', value: String(stats.taskCount), change: `${stats.pendingTaskCount} pending` },
          { label: 'Completed Tasks', value: String(stats.completedTaskCount), change: `${stats.assignedTaskCount} assigned` },
          { label: 'Current Role', value: user.role, change: user.username },
        ],
      }
    : isManager(user)
      ? {
          eyebrow: 'Manager Workspace',
          title: `Team view for ${user.username}.`,
          description:
            'You can create tasks, assign work within your department, and monitor only the team tasks that fall under your scope.',
          primaryLabel: 'Open Tasks',
          primaryAction: () => onNavigate('tasks'),
          secondaryLabel: null,
          secondaryAction: null,
          snapshotTitle: 'Team Snapshot',
          snapshotSummary: 'Department-scoped execution view for planning, assigning, and tracking team work.',
          metricCards: [
            { label: 'Team Members', value: String(stats.employeeCount), change: `${user.department ?? 'Assigned'} department` },
            { label: 'Team Tasks', value: String(stats.taskCount), change: `${stats.pendingTaskCount} pending` },
            { label: 'Completed Tasks', value: String(stats.completedTaskCount), change: `${stats.assignedTaskCount} assigned` },
            { label: 'Current Role', value: user.role, change: user.username },
          ],
        }
      : {
          eyebrow: 'Employee Workspace',
          title: `Your assigned work, ${user.username}.`,
          description:
            'You can focus on the tasks assigned to you, track what is pending, and update status as work gets completed.',
          primaryLabel: 'View My Tasks',
          primaryAction: () => onNavigate('tasks'),
          secondaryLabel: null,
          secondaryAction: null,
          snapshotTitle: 'Personal Snapshot',
          snapshotSummary: 'Focused workspace for monitoring assigned work, due times, and completion progress.',
          metricCards: [
            { label: 'Assigned Tasks', value: String(stats.taskCount), change: `${stats.pendingTaskCount} pending` },
            { label: 'Completed Tasks', value: String(stats.completedTaskCount), change: `${stats.pendingTaskCount} active` },
            { label: 'Department', value: user.department ?? 'Assigned', change: 'Current scope' },
            { label: 'Current Role', value: user.role, change: user.username },
          ],
        }

  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">{roleConfig.eyebrow}</p>
          <h1>{roleConfig.title}</h1>
          <p className="hero-text">{roleConfig.description}</p>

          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={roleConfig.primaryAction}>
              {roleConfig.primaryLabel}
            </button>
            {roleConfig.secondaryLabel ? (
              <button className="secondary-button" type="button" onClick={roleConfig.secondaryAction}>
                {roleConfig.secondaryLabel}
              </button>
            ) : null}
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-header">
            <span><span className="pulse" aria-hidden="true"></span>{roleConfig.snapshotTitle}</span>
            <span className="panel-tag success">Signed In</span>
          </div>

          <p className="hero-card-summary">{roleConfig.snapshotSummary}</p>

          <div className="hero-grid hero-summary-grid">
            {roleConfig.metricCards.map((metric) => (
              <article className="metric-card summary-card" key={metric.label}>
                <p className="summary-label">{metric.label}</p>
                <strong className="summary-value">{metric.value}</strong>
                <span className="summary-meta">{metric.change}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel active-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Access</p>
              <h2>Session details</h2>
            </div>
            <span className="panel-tag success">Healthy</span>
          </div>

          <div className="health-grid">
            <div>
              <span>User</span>
              <strong>{user.username}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{user.role}</strong>
            </div>
            <div>
              <span>Department</span>
              <strong>{user.department ?? 'Global access'}</strong>
            </div>
            <div>
              <span>Task scope</span>
              <strong>{isAdmin(user) ? 'All' : isManager(user) ? 'Team' : 'Assigned only'}</strong>
            </div>
          </div>
        </article>

        <ScheduleFlow user={user} compact />
      </section>
    </>
  )
}

export default DashboardOverview
