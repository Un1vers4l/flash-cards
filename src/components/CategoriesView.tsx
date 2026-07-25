import { useMemo, useState } from 'react'
import { type Card } from '../lib/srs'
import { type Category, createCategory, deleteCategory, updateCategory } from '../lib/categories'

type Props = {
  cards: Card[]
  categories: Category[]
  tableMissing: boolean
  onChanged: () => void
  onPractice: (cards: Card[], title: string) => void
}

// Rendering thousands of selectable rows is wasteful; cap the visible list and
// nudge the user to search instead.
const MAX_VISIBLE = 400

const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1 1 0 01-1 1H7a1 1 0 01-1-1V7" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

export default function CategoriesView({
  cards,
  categories,
  tableMissing,
  onChanged,
  onPractice,
}: Props) {
  const cardById = useMemo(() => {
    const m = new Map<string, Card>()
    for (const c of cards) m.set(c.id, c)
    return m
  }, [cards])

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const resolveCards = (cat: Category): Card[] =>
    cat.card_ids.map((id) => cardById.get(id)).filter((c): c is Card => Boolean(c))

  function openNew() {
    setEditing(null)
    setName('')
    setSelected(new Set())
    setSearch('')
    setBuilderOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setName(cat.name)
    setSelected(new Set(cat.card_ids.filter((id) => cardById.has(id))))
    setSearch('')
    setBuilderOpen(true)
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cards
    return cards.filter(
      (c) => c.german.toLowerCase().includes(q) || c.translation.toLowerCase().includes(q),
    )
  }, [cards, search])
  const visible = filtered.slice(0, MAX_VISIBLE)

  const selectedCards = () =>
    [...selected].map((id) => cardById.get(id)).filter((c): c is Card => Boolean(c))

  async function save() {
    if (!name.trim() || selected.size === 0 || saving) return
    setSaving(true)
    try {
      const ids = [...selected]
      if (editing) await updateCategory(editing.id, { name, card_ids: ids })
      else await createCategory(name, ids)
      onChanged()
      setBuilderOpen(false)
    } catch (err) {
      alert('Could not save the category.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return
    try {
      await deleteCategory(cat.id)
      onChanged()
    } catch (err) {
      alert('Could not delete the category.')
      console.error(err)
    }
  }

  if (tableMissing) {
    return (
      <div className="manage">
        <section className="panel">
          <h2 className="panel-title">Practice</h2>
          <p className="import-hint">
            Categories need a one-time database setup. In your Supabase dashboard →{' '}
            <strong>SQL Editor</strong>, run the <code>categories</code> table block from{' '}
            <code>supabase/schema.sql</code>, then reload this page.
          </p>
        </section>
      </div>
    )
  }

  if (builderOpen) {
    return (
      <div className="manage">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{editing ? 'Edit category' : 'New category'}</h2>
            <button className="btn btn-ghost" onClick={() => setBuilderOpen(false)}>
              Cancel
            </button>
          </div>

          <label className="field">
            <span className="field-label">Category name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kitchen words"
              autoFocus
            />
          </label>

          <div className="builder-toolbar">
            <input
              className="input input-sm builder-search"
              placeholder="Search cards…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="builder-count">{selected.size} selected</span>
            <button
              className="btn btn-ghost"
              onClick={() =>
                setSelected((s) => {
                  const n = new Set(s)
                  visible.forEach((c) => n.add(c.id))
                  return n
                })
              }
            >
              Add shown
            </button>
            {selected.size > 0 && (
              <button className="btn btn-ghost" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="empty-hint">No cards match your search.</p>
          ) : (
            <ul className="pick-list">
              {visible.map((c) => {
                const on = selected.has(c.id)
                return (
                  <li
                    key={c.id}
                    className={`pick-row ${on ? 'is-selected' : ''}`}
                    onClick={() => toggle(c.id)}
                  >
                    <span className={`pick-check ${on ? 'is-on' : ''}`} aria-hidden="true" />
                    <span className="card-row-german">{c.german}</span>
                    <span className="card-row-arrow">→</span>
                    <span className="card-row-translation">{c.translation}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {filtered.length > MAX_VISIBLE && (
            <p className="empty-hint">
              Showing first {MAX_VISIBLE} of {filtered.length}. Search to narrow the list.
            </p>
          )}

          <div className="builder-actions">
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !name.trim() || selected.size === 0}
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onPractice(selectedCards(), name.trim() || 'Practice')}
              disabled={selected.size === 0}
            >
              Practice now
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="manage">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Practice categories</h2>
          <button className="btn btn-primary" onClick={openNew}>
            New category
          </button>
        </div>
        <p className="import-hint">
          Group cards into named sets and practice them in random order — no grading, just
          review until you exit.
        </p>

        {categories.length === 0 ? (
          <p className="empty-hint">No categories yet. Create one to start practicing.</p>
        ) : (
          <ul className="cat-list">
            {categories.map((cat) => {
              const cs = resolveCards(cat)
              return (
                <li key={cat.id} className="cat-row">
                  <div className="cat-info">
                    <span className="cat-name">{cat.name}</span>
                    <span className="cat-count">
                      {cs.length} card{cs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="cat-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onPractice(cs, cat.name)}
                      disabled={cs.length === 0}
                    >
                      Practice
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cat)}>
                      Edit
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => handleDelete(cat)}
                      aria-label="Delete category"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
