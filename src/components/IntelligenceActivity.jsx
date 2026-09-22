import {
  Brain,
  Clock3,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import './IntelligenceActivity.css'

function formatActivityDate(value) {
  if (!value) return 'Recently'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  const now = new Date()
  const difference = now.getTime() - date.getTime()

  const minutes = Math.floor(difference / 60000)
  const hours = Math.floor(difference / 3600000)
  const days = Math.floor(difference / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

function IntelligenceActivity({
  memories = [],
  insights = [],
}) {
  const activities = [
    ...memories.map((memory) => ({
      id: `memory-${memory.id}`,
      type: 'memory',
      title: 'Memory stored',
      description: memory.memory,
      date: memory.updated_at || memory.created_at,
      icon: Brain,
    })),

    ...insights.map((insight) => ({
      id: `insight-${insight.id}`,
      type: 'insight',
      title: 'Insight discovered',
      description: insight.title,
      date: insight.updated_at || insight.created_at,
      icon: Lightbulb,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime(),
    )
    .slice(0, 8)

  return (
    <section className="intelligence-activity">
      <div className="intelligence-activity-header">
        <div className="intelligence-activity-heading">
          <div className="intelligence-activity-icon">
            <Sparkles size={16} />
          </div>

          <div>
            <h2>Recent activity</h2>
            <p>
              The latest changes to your personal
              intelligence.
            </p>
          </div>
        </div>

        {activities.length > 0 && (
          <span className="intelligence-activity-count">
            {activities.length}
          </span>
        )}
      </div>

      {activities.length > 0 ? (
        <div className="intelligence-activity-list">
          {activities.map((activity, index) => {
            const Icon = activity.icon

            return (
              <article
                className="intelligence-activity-item"
                key={activity.id}
                style={{
                  '--activity-delay': `${index * 45}ms`,
                }}
              >
                <div className="intelligence-activity-line">
                  <div
                    className={`intelligence-activity-dot ${activity.type}`}
                  >
                    <Icon size={13} />
                  </div>

                  {index < activities.length - 1 && (
                    <span className="intelligence-activity-connector" />
                  )}
                </div>

                <div className="intelligence-activity-content">
                  <div className="intelligence-activity-top">
                    <strong>{activity.title}</strong>

                    <span>
                      <Clock3 size={11} />
                      {formatActivityDate(activity.date)}
                    </span>
                  </div>

                  <p>{activity.description}</p>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="intelligence-activity-empty">
          <div>
            <Sparkles size={18} />
          </div>

          <strong>No intelligence activity yet</strong>

          <p>
            Activity will appear here as Aevyron learns
            from your conversations.
          </p>
        </div>
      )}
    </section>
  )
}

export default IntelligenceActivity