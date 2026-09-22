import { useState } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'

import { supabase } from '../lib/supabase'

function AuthForm({ mode, onToggleMode }) {
  const isSignUp = mode === 'signup'

  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const clearMessages = () => {
    setStatusMessage('')
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    clearMessages()

    const cleanName = name.trim()
    const cleanEmail = email.trim()

    if (isSignUp && !cleanName) {
      setErrorMessage('Please enter your name.')
      return
    }

    if (!cleanEmail) {
      setErrorMessage('Please enter your email.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
            },
          },
        })

        if (error) {
          throw error
        }

        if (data.session) {
          window.location.href = '/workspace'
          return
        }

        setStatusMessage(
          'Account created. Check your email to confirm your account.',
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })

        if (error) {
          throw error
        }

        window.location.href = '/workspace'
        return
      }
    } catch (error) {
      setErrorMessage(
        error?.message || 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    clearMessages()

    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setErrorMessage('Enter your email first, then try again.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/auth`,
        },
      )

      if (error) {
        throw error
      }

      setStatusMessage(
        'Password reset instructions have been sent to your email.',
      )
    } catch (error) {
      setErrorMessage(
        error?.message || 'Unable to send the reset email.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleModeToggle = () => {
    clearMessages()
    setPassword('')
    onToggleMode()
  }

  return (
    <div className="auth-form-wrapper">
      <div className="auth-heading">
        <span className="auth-kicker">
          {isSignUp ? 'Begin your journey' : 'Welcome back'}
        </span>

        <h1>
          {isSignUp ? (
            <>
              Create your
              <span>Aevyron.</span>
            </>
          ) : (
            <>
              Welcome to
              <span>Aevyron.</span>
            </>
          )}
        </h1>

        <p>
          {isSignUp
            ? 'Create your personal intelligence space and start building an AI that evolves with you.'
            : 'Continue your journey with your personal intelligence system.'}
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {isSignUp && (
          <label className="auth-field">
            <span>Name</span>

            <div className="input-shell">
              <UserRound size={17} />

              <input
                type="text"
                placeholder="Your name"
                autoComplete="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  clearMessages()
                }}
                disabled={loading}
              />
            </div>
          </label>
        )}

        <label className="auth-field">
          <span>Email</span>

          <div className="input-shell">
            <Mail size={17} />

            <input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                clearMessages()
              }}
              disabled={loading}
            />
          </div>
        </label>

        <label className="auth-field">
          <span>Password</span>

          <div className="input-shell">
            <LockKeyhole size={17} />

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete={
                isSignUp ? 'new-password' : 'current-password'
              }
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearMessages()
              }}
              disabled={loading}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? 'Hide password' : 'Show password'
              }
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>
        </label>

        {!isSignUp && (
          <div className="auth-options">
            <label className="remember-option">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(event.target.checked)
                }
                disabled={loading}
              />

              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="forgot-button"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            style={{
              margin: '0 0 14px',
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#ff8f8f',
            }}
          >
            {errorMessage}
          </p>
        )}

        {statusMessage && (
          <p
            role="status"
            style={{
              margin: '0 0 14px',
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#9be7c4',
            }}
          >
            {statusMessage}
          </p>
        )}

        <button
          className="auth-submit"
          type="submit"
          disabled={loading}
        >
          <span>
            {loading
              ? 'Please wait...'
              : isSignUp
                ? 'Create account'
                : 'Continue'}
          </span>

          <ArrowRight size={17} />
        </button>
      </form>

      <div className="auth-divider">
        <span />
        <small>or</small>
        <span />
      </div>

      <button className="google-button" type="button">
        <span className="google-symbol">G</span>
        Continue with Google
      </button>

      <p className="auth-switch">
        {isSignUp
          ? 'Already have an account?'
          : "Don't have an account?"}

        <button type="button" onClick={handleModeToggle}>
          {isSignUp ? 'Sign in' : 'Create one'}
        </button>
      </p>
    </div>
  )
}

export default AuthForm