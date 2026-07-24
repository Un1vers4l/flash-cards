import { useMemo, useState, type FormEvent } from 'react'
import { type Card, phaseIntervalLabel } from '../lib/srs'
import { createCard, deleteCard } from '../lib/cards'

type Props = {
  cards: Card[]
  onChanged: () => void
}

// A short list of common defaults; the field is free-text so any language works.
const LANGUAGE_SUGGESTIONS = ['English', 'Français', 'Español', 'Italiano', 'Nederlands']

export default function ManageVocab({ cards, onChanged }: Props) {
  const [german, setGerman] = useState('')
  const [translation, setTranslation] = useState('')
  const [language, setLanguage] = useState(
    () => localStorage.getItem('flashcards.lastLanguage') || 'English',
  )
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!german.trim() || !translation.trim() || !language.trim() || saving) return
    setSaving(true)
    try {
      await createCard({ german, translation, language })
      localStorage.setItem('flashcards.lastLanguage', language.trim())
      setGerman('')
      setTranslation('')
      onChanged()
    } catch (err) {
      alert('Could not save the card.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(card: Card) {
    if (!confirm(`Delete "${card.german}"?`)) return
    try {
      await deleteCard(card.id)
      onChanged()
    } catch (err) {
      alert('Could not delete the card.')
      console.error(err)
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return cards
    return cards.filter(
      (c) =>
        c.german.toLowerCase().includes(q) ||
        c.translation.toLowerCase().includes(q) ||
        c.language.toLowerCase().includes(q),
    )
  }, [cards, filter])

  return (
    <div className="manage">
      <section className="panel">
        <h2 className="panel-title">Add a vocabulary</h2>
        <form className="add-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">German</span>
            <input
              className="input"
              value={german}
              onChange={(e) => setGerman(e.target.value)}
              placeholder="das Haus"
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">Translation</span>
            <input
              className="input"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="the house"
            />
          </label>

          <label className="field">
            <span className="field-label">Language asked</span>
            <input
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              list="language-suggestions"
              placeholder="English"
            />
            <datalist id="language-suggestions">
              {LANGUAGE_SUGGESTIONS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>

          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add card'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            All cards <span className="count-badge">{cards.length}</span>
          </h2>
          {cards.length > 0 && (
            <input
              className="input input-sm"
              placeholder="Search…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="empty-hint">
            {cards.length === 0 ? 'No cards yet. Add your first one above.' : 'No matches.'}
          </p>
        ) : (
          <ul className="card-list">
            {filtered.map((c) => (
              <li key={c.id} className="card-row">
                <div className="card-row-main">
                  <span className="card-row-german">{c.german}</span>
                  <span className="card-row-arrow">→</span>
                  <span className="card-row-translation">{c.translation}</span>
                </div>
                <div className="card-row-meta">
                  <span className="tag">{c.language}</span>
                  <span className="tag tag-phase" title={phaseIntervalLabel(c.phase)}>
                    Phase {c.phase}
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() => handleDelete(c)}
                    aria-label="Delete card"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
