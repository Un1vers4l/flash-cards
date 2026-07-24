import { useState } from 'react'
import { type Card, answerCorrect, answerWrong, phaseIntervalLabel } from '../lib/srs'
import { applyReview } from '../lib/cards'

type Props = {
  queue: Card[]
  onExit: () => void
  onReviewed: () => void
}

export default function StudySession({ queue, onExit, onReviewed }: Props) {
  // Snapshot the starting queue once. The session then runs on its own local
  // state and keeps cycling until every card has been answered correctly.
  const [initialTotal] = useState(() => queue.length)
  const [remaining, setRemaining] = useState<Card[]>(() => queue)
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set())
  const [completed, setCompleted] = useState(0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [saving, setSaving] = useState(false)

  const card = remaining[0]
  const done = remaining.length === 0
  const isRetry = card ? failedIds.has(card.id) : false

  async function grade(correct: boolean) {
    if (!card || saving) return
    setSaving(true)
    // Correct → advance a phase. A phase-1 card (new or just-failed) graduates to
    // phase 2 and comes back tomorrow. Wrong → drop to phase 1, keep drilling today.
    const result = correct ? answerCorrect(card) : answerWrong(card)

    try {
      await applyReview(card.id, result)
      onReviewed()
      if (correct) {
        // Done for today: remove from the queue.
        setRemaining((q) => q.slice(1))
        setCompleted((c) => c + 1)
      } else {
        // Keep asking this card: mark it failed and send it to the back of the
        // queue. If it's the only card left, it simply comes up again next.
        setFailedIds((s) => new Set(s).add(card.id))
        setWrongAttempts((w) => w + 1)
        setRemaining((q) => [...q.slice(1), q[0]])
      }
      setFlipped(false)
    } catch (err) {
      alert('Could not save your answer. Check your connection and try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="session-done">
        <h2>All done for today</h2>
        <div className="session-done-rule" />
        <p className="session-done-stats">
          <span className="pill pill-correct">{completed} learned</span>
          {wrongAttempts > 0 && (
            <span className="pill pill-wrong">{wrongAttempts} slip{wrongAttempts === 1 ? '' : 's'} fixed</span>
          )}
        </p>
        <button className="btn btn-primary" onClick={onExit}>
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="session">
      <div className="session-top">
        <button className="btn btn-ghost" onClick={onExit}>
          ← Exit
        </button>
        <div className="session-progress">
          {completed} / {initialTotal} done
        </div>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(completed / initialTotal) * 100}%` }}
        />
      </div>

      <button
        type="button"
        className={`flashcard ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip card"
      >
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            {isRetry && <span className="retry-badge">Again</span>}
            <span className="flashcard-lang">Deutsch</span>
            <span className="flashcard-word">{card.german}</span>
            <span className="flashcard-hint">Tap to reveal · Phase {card.phase}</span>
          </div>
          <div className="flashcard-face flashcard-back">
            <span className="flashcard-lang">{card.language}</span>
            <span className="flashcard-word">{card.translation}</span>
            <span className="flashcard-hint">{phaseIntervalLabel(card.phase)}</span>
          </div>
        </div>
      </button>

      {flipped ? (
        <div className="grade-row">
          <button
            className="btn btn-danger btn-lg"
            onClick={() => grade(false)}
            disabled={saving}
          >
            Wrong
          </button>
          <button
            className="btn btn-success btn-lg"
            onClick={() => grade(true)}
            disabled={saving}
          >
            Correct
          </button>
        </div>
      ) : (
        <div className="grade-row">
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setFlipped(true)}>
            Show answer
          </button>
        </div>
      )}
    </div>
  )
}
