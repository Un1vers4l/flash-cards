import { useCallback, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { activateCards, fetchCards, setCardActive } from './lib/cards'
import { type Category, fetchCategories, isMissingTableError } from './lib/categories'
import {
  type Tense,
  type Verb,
  fetchVerbs,
  isMissingTableError as isVerbsTableMissing,
} from './lib/verbs'
import { type Card, MAX_DUE, isDue, todayKey } from './lib/srs'
import Login from './components/Login'
import Home from './components/Home'
import ManageVocab from './components/ManageVocab'
import CategoriesView from './components/CategoriesView'
import ConjugationView, { type DrillMode } from './components/ConjugationView'
import ConjugationSession from './components/ConjugationSession'
import StudySession from './components/StudySession'
import PracticeSession from './components/PracticeSession'

type View = 'home' | 'manage' | 'categories' | 'verbs' | 'study' | 'practice' | 'conjugate'

function ConfigWarning() {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="monogram">V</div>
        <h1 className="auth-title">Almost there</h1>
        <p className="auth-subtitle">
          Supabase isn't configured yet. Create a <code>.env</code> file with
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then
          restart the dev server. See the README for the full setup.
        </p>
      </div>
    </div>
  )
}

function Shell() {
  const { logout } = useAuth()
  const [view, setView] = useState<View>('home')
  const [cards, setCards] = useState<Card[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesMissing, setCategoriesMissing] = useState(false)
  const [verbs, setVerbs] = useState<Verb[]>([])
  const [verbsMissing, setVerbsMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The queue fed into a graded study session (today's review or a phase).
  const [studyQueue, setStudyQueue] = useState<Card[]>([])
  // The card set + label for a manual practice session.
  const [practice, setPractice] = useState<{ cards: Card[]; title: string }>({
    cards: [],
    title: '',
  })
  // The verbs + tenses + mode for a conjugation drill.
  const [conjDrill, setConjDrill] = useState<{ verbs: Verb[]; tenses: Tense[]; mode: DrillMode }>({
    verbs: [],
    tenses: [],
    mode: 'table',
  })

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchCards()
      setCards(data)
    } catch (err) {
      console.error(err)
      setError('Could not load your cards. Check the Supabase setup and table.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories()
      setCategories(data)
      setCategoriesMissing(false)
    } catch (err) {
      if (isMissingTableError(err)) setCategoriesMissing(true)
      else console.error(err)
    }
  }, [])

  const loadVerbs = useCallback(async () => {
    try {
      const data = await fetchVerbs()
      setVerbs(data)
      setVerbsMissing(false)
    } catch (err) {
      if (isVerbsTableMissing(err)) setVerbsMissing(true)
      else console.error(err)
    }
  }, [])

  useEffect(() => {
    load()
    loadCategories()
    loadVerbs()
  }, [load, loadCategories, loadVerbs])

  const patchCard = useCallback((id: string, changes: Partial<Card>) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...changes } : c)))
  }, [])

  const patchMany = useCallback((ids: Set<string>, changes: Partial<Card>) => {
    setCards((cs) => cs.map((c) => (ids.has(c.id) ? { ...c, ...changes } : c)))
  }, [])

  // The `active` column may not exist yet; if so, treat every card as active so
  // the app behaves as before until the migration is run.
  const activationEnabled = cards.some((c) => 'active' in c)
  const isCardActive = useCallback(
    (c: Card) => !activationEnabled || c.active === true,
    [activationEnabled],
  )

  const dueCards = cards.filter((c) => isCardActive(c) && isDue(c)).slice(0, MAX_DUE)

  function startDueStudy() {
    if (dueCards.length === 0) return
    setStudyQueue(dueCards)
    setView('study')
  }

  function startPhaseStudy(phase: number) {
    const queue = cards.filter((c) => isCardActive(c) && c.phase === phase).slice(0, MAX_DUE)
    if (queue.length === 0) return
    setStudyQueue(queue)
    setView('study')
  }

  function startPractice(practiceCards: Card[], title: string) {
    if (practiceCards.length === 0) return
    setPractice({ cards: practiceCards, title })
    setView('practice')
  }

  function startConjugation(drillVerbs: Verb[], tenses: Tense[], mode: DrillMode) {
    if (drillVerbs.length === 0 || tenses.length === 0) return
    setConjDrill({ verbs: drillVerbs, tenses, mode })
    setView('conjugate')
  }

  async function handleSetActive(card: Card, active: boolean) {
    const previous = { active: card.active, phase: card.phase, due_date: card.due_date }
    patchCard(card.id, active ? { active: true, phase: 1, due_date: todayKey() } : { active: false })
    try {
      await setCardActive(card.id, active)
    } catch (err) {
      console.error(err)
      patchCard(card.id, previous)
      alert('Could not change the card. Have you run the activation migration?')
    }
  }

  async function handleActivateMany(ids: string[]) {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    patchMany(idSet, { active: true, phase: 1, due_date: todayKey() })
    try {
      await activateCards(ids)
    } catch (err) {
      console.error(err)
      alert('Could not activate the cards. Have you run the activation migration?')
      load()
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}>
          <span className="brand-mark">V</span>
          <span className="brand-name">Vokabeltrainer</span>
        </button>
        <nav className="nav">
          <button
            className={`nav-link ${view === 'home' ? 'is-active' : ''}`}
            onClick={() => setView('home')}
          >
            Home
          </button>
          <button
            className={`nav-link ${view === 'manage' ? 'is-active' : ''}`}
            onClick={() => setView('manage')}
          >
            Cards
          </button>
          <button
            className={`nav-link ${view === 'categories' || view === 'practice' ? 'is-active' : ''}`}
            onClick={() => setView('categories')}
          >
            Practice
          </button>
          <button
            className={`nav-link ${view === 'verbs' || view === 'conjugate' ? 'is-active' : ''}`}
            onClick={() => setView('verbs')}
          >
            Verbs
          </button>
          <button className="nav-link" onClick={logout}>
            Sign out
          </button>
        </nav>
      </header>

      <main className="main">
        {loading ? (
          <div className="center-note">Loading…</div>
        ) : error ? (
          <div className="center-note error-note">
            {error}
            <button className="btn btn-secondary" onClick={load}>
              Retry
            </button>
          </div>
        ) : view === 'study' ? (
          <StudySession
            queue={studyQueue}
            onExit={() => {
              setView('home')
              load()
            }}
            onReviewed={load}
          />
        ) : view === 'practice' ? (
          <PracticeSession
            cards={practice.cards}
            title={practice.title}
            onExit={() => setView('categories')}
          />
        ) : view === 'conjugate' ? (
          <ConjugationSession
            verbs={conjDrill.verbs}
            tenses={conjDrill.tenses}
            mode={conjDrill.mode}
            onExit={() => setView('verbs')}
          />
        ) : view === 'verbs' ? (
          <ConjugationView verbs={verbs} tableMissing={verbsMissing} onStart={startConjugation} />
        ) : view === 'manage' ? (
          <ManageVocab
            cards={cards}
            activationEnabled={activationEnabled}
            onChanged={load}
            onCardPatched={patchCard}
            onSetActive={handleSetActive}
            onActivateMany={handleActivateMany}
          />
        ) : view === 'categories' ? (
          <CategoriesView
            cards={cards}
            categories={categories}
            tableMissing={categoriesMissing}
            onChanged={loadCategories}
            onPractice={startPractice}
          />
        ) : (
          <Home
            cards={cards}
            activationEnabled={activationEnabled}
            onStartLearning={startDueStudy}
            onStartPhase={startPhaseStudy}
            onManage={() => setView('manage')}
          />
        )}
      </main>
    </div>
  )
}

function Gate() {
  const { isAuthenticated } = useAuth()
  if (!isSupabaseConfigured) return <ConfigWarning />
  return isAuthenticated ? <Shell /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
