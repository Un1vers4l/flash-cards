import { useMemo } from 'react'
import { type Card, MAX_DUE, MAX_PHASE, isDue, phaseIntervalLabel } from '../lib/srs'

type Props = {
  cards: Card[]
  activationEnabled: boolean
  onStartLearning: () => void
  onStartPhase: (phase: number) => void
  onManage: () => void
}

/** Show at most MAX_DUE; anything beyond is displayed as "9999+". */
function formatDue(n: number): string {
  return n > MAX_DUE ? `${MAX_DUE}+` : String(n)
}

export default function Home({
  cards,
  activationEnabled,
  onStartLearning,
  onStartPhase,
  onManage,
}: Props) {
  const isActive = (c: Card) => !activationEnabled || c.active === true

  const dueCount = useMemo(
    () => cards.reduce((n, c) => (isActive(c) && isDue(c) ? n + 1 : n), 0),
    [cards, activationEnabled],
  )

  const inactiveCount = useMemo(
    () => (activationEnabled ? cards.reduce((n, c) => (c.active ? n : n + 1), 0) : 0),
    [cards, activationEnabled],
  )

  // Learn-by-phase only counts active cards.
  const phaseCounts = useMemo(() => {
    const counts = Array.from({ length: MAX_PHASE }, () => 0)
    for (const c of cards) if (isActive(c)) counts[c.phase - 1] += 1
    return counts
  }, [cards, activationEnabled])

  const maxCount = Math.max(1, ...phaseCounts)

  return (
    <div className="home">
      <section className={`today-card ${dueCount > 0 ? 'today-card-active' : 'today-card-clear'}`}>
        <div className="today-card-body">
          <span className="today-eyebrow">Today's review</span>
          {dueCount > 0 ? (
            <>
              <h2 className="today-count">
                {formatDue(dueCount)} <span>card{dueCount === 1 ? '' : 's'} due</span>
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
              <h2 className="today-count today-count-clear">All caught up</h2>
              <p className="today-sub">
                {cards.length === 0
                  ? 'Add some vocabularies to get started.'
                  : inactiveCount > 0
                    ? `Nothing due today. Activate some of your ${inactiveCount} inactive card${inactiveCount === 1 ? '' : 's'} to keep learning.`
                    : 'Nothing due today. Come back tomorrow or add more cards.'}
              </p>
              <button className="btn btn-secondary btn-lg" onClick={onManage}>
                {cards.length === 0
                  ? 'Add vocabularies'
                  : inactiveCount > 0
                    ? 'Activate cards'
                    : 'Manage cards'}
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
          <span className="stat-value">{formatDue(dueCount)}</span>
          <span className="stat-label">Due now</span>
        </div>
        <div className="stat">
          <span className="stat-value">{activationEnabled ? inactiveCount : phaseCounts[MAX_PHASE - 1]}</span>
          <span className="stat-label">{activationEnabled ? 'Inactive' : `Mastered (P${MAX_PHASE})`}</span>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel-title">Learn by phase</h2>
        <p className="import-hint">
          Study every card in one phase (regardless of when it's next due). Answers still
          count — correct moves a card up, wrong sends it back to phase 1. Tap a phase to start.
        </p>
        <div className="phase-chart">
          {phaseCounts.map((count, i) => (
            <button
              type="button"
              className="phase-bar-group"
              key={i}
              onClick={() => onStartPhase(i + 1)}
              disabled={count === 0}
              title={
                count === 0
                  ? `No cards in phase ${i + 1}`
                  : `Study ${count} card${count === 1 ? '' : 's'} in phase ${i + 1}`
              }
            >
              <div className="phase-bar-track">
                <div
                  className="phase-bar-fill"
                  style={{ height: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="phase-bar-count">{count}</span>
              <span className="phase-bar-label">P{i + 1}</span>
              <span className="phase-bar-interval">{phaseIntervalLabel(i + 1)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
