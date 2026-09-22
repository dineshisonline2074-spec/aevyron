import { useEffect, useState } from 'react'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import Workspace from './pages/Workspace'
import { supabase } from './lib/supabase'

function getCurrentPath() {
  return window.location.pathname
}

function App() {
  const [session, setSession] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('Unable to restore Aevyron session:', error)
      }

      setSession(currentSession ?? null)
      setAuthChecked(true)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return

      setSession(currentSession ?? null)
      setAuthChecked(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authChecked) return

    const path = getCurrentPath()

    if (session && (path === '/' || path === '/auth')) {
      window.history.replaceState({}, '', '/workspace')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }

    if (!session && path === '/workspace') {
      window.history.replaceState({}, '', '/auth')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }, [authChecked, session])

  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#050507',
          color: 'rgba(255,255,255,0.6)',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: '13px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#8f7cff',
              boxShadow: '0 0 16px rgba(143,124,255,0.7)',
            }}
          />
          Restoring Aevyron...
        </div>
      </div>
    )
  }

  const path = getCurrentPath()

  if (session) {
    if (path === '/workspace' || path === '/' || path === '/auth') {
      return <Workspace />
    }

    return <Workspace />
  }

  if (path === '/auth' || path === '/workspace') {
    return <Auth />
  }

  return <Landing />
}

export default App
