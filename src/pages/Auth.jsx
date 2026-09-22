import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import AuthForm from '../components/AuthForm'
import './Auth.css'

function Auth() {
  const [mode, setMode] = useState('signin')

  const toggleMode = () => {
    setMode((currentMode) =>
      currentMode === 'signin' ? 'signup' : 'signin',
    )
  }

  return (
    <main className="auth-page">
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />
      <div className="auth-noise" />

      <a href="/" className="auth-back">
        <ArrowLeft size={16} />
        <span>Back</span>
      </a>

      <div className="auth-layout">
        <section className="auth-showcase">
          <div className="auth-brand">
            <span className="brand-mark">
              <span />
              <span />
            </span>

            <span>Aevyron</span>
          </div>

          <div className="showcase-content">
            <div className="showcase-orb">
              <div className="showcase-ring ring-one" />
              <div className="showcase-ring ring-two" />

              <div className="showcase-core">
                <div className="showcase-core-symbol">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="showcase-copy">
              <span>PERSONAL INTELLIGENCE</span>

              <h2>
                Intelligence
                <br />
                that grows
                <br />
                <em>with you.</em>
              </h2>

              <p>
                Your conversations become context.
                Your context becomes understanding.
              </p>
            </div>
          </div>

          <div className="showcase-footer">
            <ShieldCheck size={15} />
            <span>Your data. Your memory. Your control.</span>
          </div>
        </section>

        <section className="auth-panel">
          <AuthForm mode={mode} onToggleMode={toggleMode} />
        </section>
      </div>
    </main>
  )
}

export default Auth