import { useCallback, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { fetchCards } from './lib/cards'
import { type Card, isDue } from './lib/srs'
import Login from './components/Login'
import Home from './components/Home'
import ManageVocab from './components/ManageVocab'
import StudySession from './components/StudySession'

type View = 'home' | 'manage' | 'study'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    load()
  }, [load])

  const dueCards = cards.filter((c) => isDue(c))

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
            queue={dueCards}
            onExit={() => {
              setView('home')
              load()
            }}
            onReviewed={load}
          />
        ) : view === 'manage' ? (
          <ManageVocab cards={cards} onChanged={load} />
        ) : (
          <Home
            cards={cards}
            onStartLearning={() => dueCards.length > 0 && setView('study')}
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
