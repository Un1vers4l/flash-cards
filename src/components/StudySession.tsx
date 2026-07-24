import { useMemo, useState } from 'react'
import { type Card, answerCorrect, answerWrong, phaseIntervalLabel } from '../lib/srs'
import { applyReview } from '../lib/cards'

type Props = {
  queue: Card[]
  onExit: () => void
  onReviewed: () => void
}

export default function StudySession({ queue, onExit, onReviewed }: Props) {
  // Snapshot the queue once so it doesn't reshuffle as cards get updated.
  const cards = useMemo(() => queue, [queue])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [saving, setSaving] = useState(false)

  const card = cards[index]
  const done = index >= cards.length

  async function grade(correct: boolean) {
    if (!card || saving) return
    setSaving(true)
    const result = correct ? answerCorrect(card) : answerWrong(card)
    try {
      await applyReview(card.id, result)
      setStats((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }))
      onReviewed()
      setFlipped(false)
      setIndex((i) => i + 1)
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
        <div className="session-done-emoji">🎉</div>
        <h2>Session complete</h2>
        <p className="session-done-stats">
          <span className="pill pill-correct">{stats.correct} correct</span>
          <span className="pill pill-wrong">{stats.wrong} to review</span>
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
          {index + 1} / {cards.length}
        </div>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(index / cards.length) * 100}%` }}
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
            ✕ Wrong
          </button>
          <button
            className="btn btn-success btn-lg"
            onClick={() => grade(true)}
            disabled={saving}
          >
            ✓ Correct
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
