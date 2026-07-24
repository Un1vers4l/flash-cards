import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = login(username, password)
    if (!ok) setError(true)
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">📚</div>
        <h1 className="auth-title">Vokabeltrainer</h1>
        <p className="auth-subtitle">Sign in to keep learning</p>

        <label className="field">
          <span className="field-label">Username</span>
          <input
            className="input"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setError(false)
            }}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
          />
        </label>

        {error && <p className="auth-error">Wrong username or password.</p>}

        <button className="btn btn-primary btn-block" type="submit">
          Sign in
        </button>
      </form>
    </div>
  )
}
