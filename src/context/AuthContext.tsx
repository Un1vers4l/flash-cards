import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

// Predefined credentials come from env vars, with sensible dev defaults so the
// app is usable out of the box. This is a lightweight gate for a single-user
// personal app — not a security boundary.
const USERNAME = import.meta.env.VITE_APP_USERNAME || 'admin'
const PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'lernen'

const STORAGE_KEY = 'flashcards.auth'

type AuthContextValue = {
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === 'true',
  )

  const login = useCallback((username: string, password: string) => {
    const ok = username === USERNAME && password === PASSWORD
    if (ok) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setIsAuthenticated(true)
    }
    return ok
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
