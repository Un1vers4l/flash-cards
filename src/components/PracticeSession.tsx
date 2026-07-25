import { useState } from 'react'
import { type Card } from '../lib/srs'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Props = {
  cards: Card[]
  title: string
  onExit: () => void
}

// Manual practice: shuffle the chosen cards and flip through them endlessly until
// the user exits. No grading, no phase changes, no scheduling.
export default function PracticeSession({ cards, title, onExit }: Props) {
  const [order, setOrder] = useState<Card[]>(() => shuffle(cards))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [round, setRound] = useState(1)

  const card = order[index]

  function next() {
    setFlipped(false)
    if (index + 1 >= order.length) {
      setOrder(shuffle(cards)) // reshuffle and loop
      setIndex(0)
      setRound((r) => r + 1)
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (!card) {
    return (
      <div className="session-done">
        <h2>Nothing to practice</h2>
        <div className="session-done-rule" />
        <button className="btn btn-primary" onClick={onExit}>
          Back
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
          {title} · {index + 1} / {order.length}
          {round > 1 ? ` · round ${round}` : ''}
        </div>
      </div>

      <button
        type="button"
        className={`flashcard ${flipped ? 'is-flipped' : ''}`}
        onClick={() => (flipped ? next() : setFlipped(true))}
        aria-label={flipped ? 'Next card' : 'Reveal answer'}
      >
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            <span className="flashcard-lang">Deutsch</span>
            <span className="flashcard-word">{card.german}</span>
            <span className="flashcard-hint">Tap to reveal</span>
          </div>
          <div className="flashcard-face flashcard-back">
            <span className="flashcard-lang">{card.language}</span>
            <span className="flashcard-word">{card.translation}</span>
            <span className="flashcard-hint">Tap for next card</span>
          </div>
        </div>
      </button>

      <div className="grade-row">
        <button className="btn btn-primary btn-lg btn-block" onClick={next}>
          Next card →
        </button>
      </div>
    </div>
  )
}
