import {
  ArrowRight,
  BrainCircuit,
  Sparkles,
} from 'lucide-react'

import Navbar from '../components/Navbar'
import './Landing.css'

function Landing() {
  const openAuth = () => {
    window.location.href = '/auth'
  }

  return (
    <div className="landing">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="noise" />

      <Navbar />

      <main className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" />
            <span>Intelligence that evolves</span>
          </div>

          <h1>
            AI that
            <span> learns with you.</span>
          </h1>

          <p className="hero-description">
            Aevyron is a personal intelligence system that remembers,
            understands, and continuously learns from the way you interact
            with it.
          </p>

          <div className="hero-actions">
            <button
              className="primary-action"
              onClick={openAuth}
            >
              Start with Aevyron
              <ArrowRight size={18} strokeWidth={2} />
            </button>

            <button
              className="secondary-action"
              onClick={openAuth}
            >
              <Sparkles size={17} strokeWidth={1.8} />
              Explore intelligence
            </button>
          </div>

          <div className="hero-meta">
            <span>
              <BrainCircuit size={15} />
              Personal AI
            </span>

            <span className="meta-divider" />

            <span>Built to evolve</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />

          <div className="core">
            <div className="core-inner">
              <div className="core-symbol">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <div className="signal signal-one">
            <span />
          </div>

          <div className="signal signal-two">
            <span />
          </div>

          <div className="signal signal-three">
            <span />
          </div>

          <div className="visual-label label-top">
            <span className="label-line" />
            <span>Learning</span>
          </div>

          <div className="visual-label label-bottom">
            <span>Memory</span>
            <span className="label-line" />
          </div>
        </div>
      </main>

      <section className="bottom-strip">
        <div>
          <span className="strip-number">01</span>
          <span>Understands context</span>
        </div>

        <div>
          <span className="strip-number">02</span>
          <span>Builds memory</span>
        </div>

        <div>
          <span className="strip-number">03</span>
          <span>Improves over time</span>
        </div>
      </section>
    </div>
  )
}

export default Landing