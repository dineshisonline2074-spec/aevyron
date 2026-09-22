import {
  Activity,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import IntelligenceActivity from './IntelligenceActivity'
import './IntelligenceDashboard.css'

function formatDate(value) {
  if (!value) return 'Recently'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCategory(category) {
  if (!category) return 'General'

  return category
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function clampConfidence(value) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return 0.5
  }

  return Math.min(1, Math.max(0, numericValue))
}

function IntelligenceDashboard({ onClose }) {
  const [user, setUser] = useState(null)

  const [memories, setMemories] = useState([])
  const [insights, setInsights] = useState([])

  const [conversationCount, setConversationCount] = useState(0)
  const [knowledgeCount, setKnowledgeCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  const [memoryPage, setMemoryPage] = useState(1)
  const [insightPage, setInsightPage] = useState(1)

  const [deleteTarget, setDeleteTarget] = useState(null)

  const deleteCancelRef = useRef(null)
  const deleteConfirmRef = useRef(null)

  const itemsPerPage = 5

  useEffect(() => {
    let mounted = true

    async function initialize() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!mounted) return

      if (!currentUser) {
        setError('Your session has expired. Please sign in again.')
        setLoading(false)
        return
      }

      setUser(currentUser)
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [])

  async function loadIntelligence(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!currentUser) {
        throw new Error('No authenticated user found.')
      }

      setUser(currentUser)

      const [
        memoriesResult,
        insightsResult,
        conversationsResult,
        knowledgeResult,
      ] = await Promise.all([
        supabase
          .from('memories')
          .select(
            'id, memory, category, created_at, updated_at',
          )
          .eq('user_id', currentUser.id)
          .order('updated_at', {
            ascending: false,
          }),

        supabase
          .from('insights')
          .select(
            'id, title, insight, category, confidence, source, created_at, updated_at',
          )
          .eq('user_id', currentUser.id)
          .order('updated_at', {
            ascending: false,
          }),

        supabase
          .from('conversations')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('user_id', currentUser.id),

        supabase
          .from('knowledge_files')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('user_id', currentUser.id),
      ])

      if (memoriesResult.error) {
        throw memoriesResult.error
      }

      if (insightsResult.error) {
        throw insightsResult.error
      }

      if (conversationsResult.error) {
        throw conversationsResult.error
      }

      if (knowledgeResult.error) {
        throw knowledgeResult.error
      }

      setMemories(memoriesResult.data || [])
      setInsights(insightsResult.data || [])
      setConversationCount(
        conversationsResult.count || 0,
      )
      setKnowledgeCount(
        knowledgeResult.count || 0,
      )

      setMemoryPage(1)
      setInsightPage(1)
    } catch (loadError) {
      console.error(
        'Failed to load intelligence:',
        loadError,
      )

      setError(
        loadError?.message ||
          'Unable to load your personal intelligence.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadIntelligence()
  }, [])

  useEffect(() => {
    const handleIntelligenceUpdated = () => {
      loadIntelligence(true)
    }

    window.addEventListener(
      'aevyron-intelligence-updated',
      handleIntelligenceUpdated,
    )

    return () => {
      window.removeEventListener(
        'aevyron-intelligence-updated',
        handleIntelligenceUpdated,
      )
    }
  }, [])

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== 'Escape') return

      if (deleteTarget) {
        setDeleteTarget(null)
        return
      }

      onClose?.()
    }

    document.addEventListener(
      'keydown',
      handleEscape,
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape,
      )
    }
  }, [deleteTarget, onClose])

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!deleteTarget) return

    const timeout = window.setTimeout(() => {
      deleteConfirmRef.current?.focus()
    }, 50)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [deleteTarget])

  const averageConfidence = useMemo(() => {
    if (!insights.length) {
      return 0
    }

    const total = insights.reduce(
      (sum, insight) =>
        sum + clampConfidence(insight.confidence),
      0,
    )

    return total / insights.length
  }, [insights])

  const intelligenceLevel = useMemo(() => {
    const memoryScore = Math.min(
      memories.length / 10,
      1,
    )

    const insightScore = Math.min(
      insights.length / 10,
      1,
    )

    const conversationScore = Math.min(
      conversationCount / 20,
      1,
    )

    const knowledgeScore = Math.min(
      knowledgeCount / 5,
      1,
    )

    const total =
      memoryScore * 0.3 +
      insightScore * 0.35 +
      conversationScore * 0.2 +
      knowledgeScore * 0.15

    if (total >= 0.8) {
      return 'Deep'
    }

    if (total >= 0.55) {
      return 'Growing'
    }

    if (total >= 0.3) {
      return 'Developing'
    }

    return 'Starting'
  }, [
    memories.length,
    insights.length,
    conversationCount,
    knowledgeCount,
  ])

  const paginatedMemories = useMemo(() => {
    const start =
      (memoryPage - 1) * itemsPerPage

    return memories.slice(
      start,
      start + itemsPerPage,
    )
  }, [memories, memoryPage])

  const paginatedInsights = useMemo(() => {
    const start =
      (insightPage - 1) * itemsPerPage

    return insights.slice(
      start,
      start + itemsPerPage,
    )
  }, [insights, insightPage])

  const memoryPageCount = Math.max(
    1,
    Math.ceil(
      memories.length / itemsPerPage,
    ),
  )

  const insightPageCount = Math.max(
    1,
    Math.ceil(
      insights.length / itemsPerPage,
    ),
  )

  async function performDelete() {
    if (!deleteTarget) return

    const {
      type,
      id,
    } = deleteTarget

    setDeletingId(id)
    setError('')

    try {
      const table =
        type === 'memory'
          ? 'memories'
          : 'insights'

      const { error: deleteError } =
        await supabase
          .from(table)
          .delete()
          .eq('id', id)
          .eq(
            'user_id',
            user?.id,
          )

      if (deleteError) {
        throw deleteError
      }

      if (type === 'memory') {
        setMemories((current) =>
          current.filter(
            (item) => item.id !== id,
          ),
        )

        setMemoryPage((current) =>
          Math.min(
            current,
            Math.max(
              1,
              Math.ceil(
                (memories.length - 1) /
                  itemsPerPage,
              ),
            ),
          ),
        )
      } else {
        setInsights((current) =>
          current.filter(
            (item) => item.id !== id,
          ),
        )

        setInsightPage((current) =>
          Math.min(
            current,
            Math.max(
              1,
              Math.ceil(
                (insights.length - 1) /
                  itemsPerPage,
              ),
            ),
          ),
        )
      }

      setDeleteTarget(null)
    } catch (deleteError) {
      console.error(
        'Failed to delete intelligence item:',
        deleteError,
      )

      setError(
        deleteError?.message ||
          'Unable to delete this item.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  function requestDelete(type, item) {
    setDeleteTarget({
      type,
      id: item.id,
      title:
        type === 'memory'
          ? item.memory
          : item.title,
    })
  }

  function handleRetry() {
    loadIntelligence()
  }

  if (loading) {
    return (
      <div
        className="intelligence-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Personal intelligence"
      >
        <div className="intelligence-panel intelligence-loading-panel">
          <div className="intelligence-header">
            <div className="intelligence-header-left">
              <div className="intelligence-header-icon">
                <Sparkles size={17} />
              </div>

              <div>
                <h1>Personal Intelligence</h1>
                <p>
                  Loading your intelligence...
                </p>
              </div>
            </div>

            <button
              className="intelligence-icon-button"
              type="button"
              onClick={onClose}
              aria-label="Close personal intelligence"
            >
              <X size={17} />
            </button>
          </div>

          <div className="intelligence-loading-content">
            <div className="intelligence-skeleton intelligence-skeleton-large" />
            <div className="intelligence-skeleton intelligence-skeleton-medium" />

            <div className="intelligence-skeleton-grid">
              <div className="intelligence-skeleton intelligence-skeleton-card" />
              <div className="intelligence-skeleton intelligence-skeleton-card" />
              <div className="intelligence-skeleton intelligence-skeleton-card" />
              <div className="intelligence-skeleton intelligence-skeleton-card" />
            </div>

            <div className="intelligence-skeleton intelligence-skeleton-section" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="intelligence-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intelligence-title"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose?.()
        }
      }}
    >
      <div className="intelligence-panel">
        <header className="intelligence-header">
          <div className="intelligence-header-left">
            <div className="intelligence-header-icon">
              <Sparkles size={17} />
            </div>

            <div>
              <h1 id="intelligence-title">
                Personal Intelligence
              </h1>

              <p>
                A private view of what Aevyron
                remembers and notices.
              </p>
            </div>
          </div>

          <div className="intelligence-header-actions">
            <button
              className={`intelligence-refresh-button ${
                refreshing ? 'is-refreshing' : ''
              }`}
              type="button"
              onClick={() =>
                loadIntelligence(true)
              }
              disabled={refreshing}
              aria-label="Refresh personal intelligence"
            >
              <RefreshCw size={14} />
              <span>
                {refreshing
                  ? 'Refreshing'
                  : 'Refresh'}
              </span>
            </button>

            <button
              className="intelligence-icon-button"
              type="button"
              onClick={onClose}
              aria-label="Close personal intelligence"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="intelligence-scroll-area">
          {error && (
            <div
              className="intelligence-error"
              role="alert"
            >
              <div className="intelligence-error-icon">
                <Activity size={15} />
              </div>

              <div className="intelligence-error-copy">
                <strong>
                  Something went wrong
                </strong>

                <span>{error}</span>
              </div>

              <button
                type="button"
                onClick={handleRetry}
              >
                Retry
              </button>
            </div>
          )}

          <section className="intelligence-overview">
            <div className="intelligence-overview-copy">
              <div className="intelligence-eyebrow">
                <span className="intelligence-live-dot" />
                Intelligence status
              </div>

              <h2>
                Your personal intelligence is{' '}
                <span>
                  {intelligenceLevel.toLowerCase()}
                </span>
                .
              </h2>

              <p>
                Aevyron builds a private layer of
                memories and observations from your
                conversations, while keeping those
                two types of information separate.
              </p>
            </div>

            <div className="intelligence-overview-mark">
              <div className="intelligence-overview-orbit">
                <div className="intelligence-overview-core">
                  <Brain size={23} />
                </div>
              </div>
            </div>
          </section>

          <section className="intelligence-stats">
            <article className="intelligence-stat-card">
              <div className="intelligence-stat-icon memory">
                <Brain size={16} />
              </div>

              <div className="intelligence-stat-copy">
                <span>Memories</span>
                <strong>
                  {memories.length}
                </strong>
              </div>
            </article>

            <article className="intelligence-stat-card">
              <div className="intelligence-stat-icon insight">
                <Lightbulb size={16} />
              </div>

              <div className="intelligence-stat-copy">
                <span>Insights</span>
                <strong>
                  {insights.length}
                </strong>
              </div>
            </article>

            <article className="intelligence-stat-card">
              <div className="intelligence-stat-icon conversation">
                <MessageSquare size={16} />
              </div>

              <div className="intelligence-stat-copy">
                <span>Conversations</span>
                <strong>
                  {conversationCount}
                </strong>
              </div>
            </article>

            <article className="intelligence-stat-card">
              <div className="intelligence-stat-icon knowledge">
                <FileText size={16} />
              </div>

              <div className="intelligence-stat-copy">
                <span>Knowledge files</span>
                <strong>
                  {knowledgeCount}
                </strong>
              </div>
            </article>
          </section>

          <section className="intelligence-section">
            <div className="intelligence-section-header">
              <div className="intelligence-section-heading">
                <div className="intelligence-section-icon memory">
                  <Brain size={15} />
                </div>

                <div>
                  <h2>Memory</h2>
                  <p>
                    Facts you've explicitly shared
                    that can help Aevyron stay
                    consistent.
                  </p>
                </div>
              </div>

              {memories.length > 0 && (
                <span className="intelligence-section-count">
                  {memories.length}
                </span>
              )}
            </div>

            {paginatedMemories.length > 0 ? (
              <div className="intelligence-items">
                {paginatedMemories.map(
                  (memory, index) => (
                    <article
                      className="intelligence-item-card"
                      key={memory.id}
                      style={{
                        '--item-delay': `${
                          index * 45
                        }ms`,
                      }}
                    >
                      <div className="intelligence-item-main">
                        <div className="intelligence-item-top">
                          <span className="intelligence-item-category">
                            {formatCategory(
                              memory.category,
                            )}
                          </span>

                          <span className="intelligence-item-date">
                            {formatDate(
                              memory.updated_at ||
                                memory.created_at,
                            )}
                          </span>
                        </div>

                        <p>
                          {memory.memory}
                        </p>
                      </div>

                      <button
                        className="intelligence-item-delete"
                        type="button"
                        onClick={() =>
                          requestDelete(
                            'memory',
                            memory,
                          )
                        }
                        disabled={
                          deletingId ===
                          memory.id
                        }
                        aria-label="Delete memory"
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ),
                )}
              </div>
            ) : (
              <div className="intelligence-empty">
                <div className="intelligence-empty-icon">
                  <Brain size={18} />
                </div>

                <strong>
                  No memories yet
                </strong>

                <p>
                  Explicit facts you share with
                  Aevyron can appear here over time.
                </p>
              </div>
            )}

            {memoryPageCount > 1 && (
              <div className="intelligence-pagination">
                <span>
                  Page {memoryPage} of{' '}
                  {memoryPageCount}
                </span>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setMemoryPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                    disabled={memoryPage === 1}
                    aria-label="Previous memory page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMemoryPage(
                        (current) =>
                          Math.min(
                            memoryPageCount,
                            current + 1,
                          ),
                      )
                    }
                    disabled={
                      memoryPage ===
                      memoryPageCount
                    }
                    aria-label="Next memory page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="intelligence-section">
            <div className="intelligence-section-header">
              <div className="intelligence-section-heading">
                <div className="intelligence-section-icon insight">
                  <Lightbulb size={15} />
                </div>

                <div>
                  <h2>Insights</h2>
                  <p>
                    Repeated patterns Aevyron has
                    identified from your conversations.
                  </p>
                </div>
              </div>

              <div className="intelligence-insight-summary">
                {insights.length > 0 && (
                  <span className="intelligence-section-count">
                    {insights.length}
                  </span>
                )}

                {insights.length > 0 && (
                  <span className="intelligence-confidence-summary">
                    {Math.round(
                      averageConfidence * 100,
                    )}
                    % avg.
                  </span>
                )}
              </div>
            </div>

            {paginatedInsights.length > 0 ? (
              <div className="intelligence-items">
                {paginatedInsights.map(
                  (insight, index) => {
                    const confidence =
                      clampConfidence(
                        insight.confidence,
                      )

                    return (
                      <article
                        className="intelligence-item-card intelligence-insight-card"
                        key={insight.id}
                        style={{
                          '--item-delay': `${
                            index * 45
                          }ms`,
                        }}
                      >
                        <div className="intelligence-item-main">
                          <div className="intelligence-item-top">
                            <span className="intelligence-item-category">
                              {formatCategory(
                                insight.category,
                              )}
                            </span>

                            <span className="intelligence-item-date">
                              {formatDate(
                                insight.updated_at ||
                                  insight.created_at,
                              )}
                            </span>
                          </div>

                          <h3>
                            {insight.title}
                          </h3>

                          <p>
                            {insight.insight}
                          </p>

                          <div className="intelligence-confidence">
                            <div className="intelligence-confidence-header">
                              <span>
                                Confidence
                              </span>

                              <strong>
                                {Math.round(
                                  confidence *
                                    100,
                                )}
                                %
                              </strong>
                            </div>

                            <div className="intelligence-confidence-track">
                              <span
                                style={{
                                  width: `${confidence * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          className="intelligence-item-delete"
                          type="button"
                          onClick={() =>
                            requestDelete(
                              'insight',
                              insight,
                            )
                          }
                          disabled={
                            deletingId ===
                            insight.id
                          }
                          aria-label="Delete insight"
                        >
                          <Trash2 size={14} />
                        </button>
                      </article>
                    )
                  },
                )}
              </div>
            ) : (
              <div className="intelligence-empty">
                <div className="intelligence-empty-icon">
                  <Lightbulb size={18} />
                </div>

                <strong>
                  No insights yet
                </strong>

                <p>
                  Insights appear when repeated
                  patterns become supported by enough
                  conversation evidence.
                </p>
              </div>
            )}

            {insightPageCount > 1 && (
              <div className="intelligence-pagination">
                <span>
                  Page {insightPage} of{' '}
                  {insightPageCount}
                </span>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setInsightPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                    disabled={insightPage === 1}
                    aria-label="Previous insight page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInsightPage(
                        (current) =>
                          Math.min(
                            insightPageCount,
                            current + 1,
                          ),
                      )
                    }
                    disabled={
                      insightPage ===
                      insightPageCount
                    }
                    aria-label="Next insight page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>

          <IntelligenceActivity
            memories={memories}
            insights={insights}
          />

          <section className="intelligence-how">
            <div className="intelligence-section-header">
              <div className="intelligence-section-heading">
                <div className="intelligence-section-icon">
                  <Target size={15} />
                </div>

                <div>
                  <h2>How it works</h2>
                  <p>
                    Aevyron keeps personal intelligence
                    deliberately structured.
                  </p>
                </div>
              </div>
            </div>

            <div className="intelligence-principles">
              <article className="intelligence-principle">
                <div className="intelligence-principle-icon">
                  <CheckCircle2 size={15} />
                </div>

                <div>
                  <strong>
                    Memory stays factual
                  </strong>

                  <p>
                    Memories represent stable
                    information you explicitly shared,
                    rather than assumptions about you.
                  </p>
                </div>
              </article>

              <article className="intelligence-principle">
                <div className="intelligence-principle-icon">
                  <Lightbulb size={15} />
                </div>

                <div>
                  <strong>
                    Insights need evidence
                  </strong>

                  <p>
                    Observations are based on repeated
                    patterns instead of a single
                    conversation or isolated statement.
                  </p>
                </div>
              </article>

              <article className="intelligence-principle">
                <div className="intelligence-principle-icon">
                  <Sparkles size={15} />
                </div>

                <div>
                  <strong>
                    Your intelligence evolves
                  </strong>

                  <p>
                    New information can strengthen,
                    update, or replace older
                    observations as your conversations
                    change.
                  </p>
                </div>
              </article>
            </div>
          </section>

          <footer className="intelligence-footer">
            <div>
              <Sparkles size={13} />
              <span>
                Personal intelligence is private to
                your account.
              </span>
            </div>

            <span>
              {user?.email || 'Authenticated user'}
            </span>
          </footer>
        </div>

        {deleteTarget && (
          <div
            className="intelligence-confirm-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setDeleteTarget(null)
              }
            }}
          >
            <div
              className="intelligence-confirm-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="intelligence-delete-title"
              aria-describedby="intelligence-delete-description"
            >
              <div className="intelligence-confirm-icon">
                <Trash2 size={18} />
              </div>

              <div className="intelligence-confirm-copy">
                <h2 id="intelligence-delete-title">
                  Delete{' '}
                  {deleteTarget.type ===
                  'memory'
                    ? 'memory'
                    : 'insight'}
                  ?
                </h2>

                <p id="intelligence-delete-description">
                  This will permanently remove this
                  item from your personal intelligence.
                </p>

                <div className="intelligence-confirm-preview">
                  {deleteTarget.title}
                </div>
              </div>

              <div className="intelligence-confirm-actions">
                <button
                  ref={deleteCancelRef}
                  type="button"
                  className="intelligence-confirm-cancel"
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  disabled={Boolean(
                    deletingId,
                  )}
                >
                  Cancel
                </button>

                <button
                  ref={deleteConfirmRef}
                  type="button"
                  className="intelligence-confirm-delete"
                  onClick={performDelete}
                  disabled={Boolean(
                    deletingId,
                  )}
                >
                  {deletingId ===
                  deleteTarget.id
                    ? 'Deleting...'
                    : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IntelligenceDashboard