import { ArrowUpRight } from 'lucide-react'

function Navbar() {
  const openAuth = () => {
    window.location.href = '/auth'
  }

  return (
    <header className="navbar">
      <a href="/" className="brand" aria-label="Aevyron home">
        <span className="brand-mark">
          <span />
          <span />
        </span>

        <span className="brand-name">Aevyron</span>
      </a>

      <nav className="nav-links" aria-label="Main navigation">
        <a href="#intelligence">Intelligence</a>
        <a href="#memory">Memory</a>
        <a href="#learning">Learning</a>
      </nav>

      <button
        className="nav-action"
        onClick={openAuth}
      >
        Enter Aevyron
        <ArrowUpRight size={16} strokeWidth={1.8} />
      </button>
    </header>
  )
}

export default Navbar