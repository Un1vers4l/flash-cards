import { useMemo } from 'react'
import { type Card, MAX_PHASE, isDue, phaseIntervalLabel } from '../lib/srs'

type Props = {
  cards: Card[]
  onStartLearning: () => void
  onManage: () => void
}

export default function Home({ cards, onStartLearning, onManage }: Props) {
  const due = useMemo(() => cards.filter((c) => isDue(c)), [cards])

  const phaseCounts = useMemo(() => {
    const counts = Array.from({ length: MAX_PHASE }, () => 0)
    for (const c of cards) counts[c.phase - 1] += 1
    return counts
  }, [cards])

  const maxCount = Math.max(1, ...phaseCounts)

  return (
    <div className="home">
      <section className={`today-card ${due.length > 0 ? 'today-card-active' : 'today-card-clear'}`}>
        <div className="today-card-body">
          <span className="today-eyebrow">Today's review</span>
          {due.length > 0 ? (
            <>
              <h2 className="today-count">
                {due.length} <span>card{due.length === 1 ? '' : 's'} due</span>
              </h2>
              <p className="today-sub">
                Cards you don't finish today simply stay due until you do.
              </p>
              <button className="btn btn-primary btn-lg" onClick={onStartLearning}>
                Start learning →
              </button>
            </>
          ) : (
            <>
              <h2 className="today-count today-count-clear">All caught up 🎈</h2>
              <p className="today-sub">
                {cards.length === 0
                  ? 'Add some vocabularies to get started.'
                  : 'Nothing due today. Come back tomorrow or add more cards.'}
              </p>
              <button className="btn btn-secondary btn-lg" onClick={onManage}>
                {cards.length === 0 ? 'Add vocabularies' : 'Manage cards'}
              </button>
            </>
          )}
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat-value">{cards.length}</span>
          <span className="stat-label">Total cards</span>
        </div>
        <div className="stat">
          <span className="stat-value">{due.length}</span>
          <span className="stat-label">Due now</span>
        </div>
        <div className="stat">
          <span className="stat-value">{phaseCounts[MAX_PHASE - 1]}</span>
          <span className="stat-label">Mastered (P{MAX_PHASE})</span>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel-title">Progress by phase</h2>
        <div className="phase-chart">
          {phaseCounts.map((count, i) => (
            <div className="phase-bar-group" key={i}>
              <div className="phase-bar-track">
                <div
                  className="phase-bar-fill"
                  style={{ height: `${(count / maxCount) * 100}%` }}
                  title={`${count} card${count === 1 ? '' : 's'}`}
                />
              </div>
              <span className="phase-bar-count">{count}</span>
              <span className="phase-bar-label">P{i + 1}</span>
              <span className="phase-bar-interval">{phaseIntervalLabel(i + 1)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
