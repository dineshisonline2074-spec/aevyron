import {
  ArrowUp,
  Brain,
  Check,
  Copy,
  RotateCcw,
  FilePlus2,
  Menu,
  Mic,
  MoreHorizontal,
  PanelRight,
  Paperclip,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import WorkspaceSidebar from '../components/WorkspaceSidebar'
import IntelligenceDashboard from '../components/IntelligenceDashboard'
import KnowledgeHub from '../components/KnowledgeHub'
import './Workspace.css'

const suggestionPrompts = {
  think: 'Help me think through an idea from a new perspective.',
  teach: 'Teach me something interesting and explain it simply.',
  analyze:
    'Help me analyze something and understand the important details.',
}

function formatConversationDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()

  const isToday =
    date.toDateString() === now.toDateString()

  if (isToday) {
    return 'Today'
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [intelligenceOpen, setIntelligenceOpen] =
    useState(false)
  const [knowledgeOpen, setKnowledgeOpen] =
    useState(false)
  const [conversationMenuOpen, setConversationMenuOpen] =
    useState(false)

  const [message, setMessage] = useState('')
  const [drafts, setDrafts] = useState({})

  const [activeConversation, setActiveConversation] =
    useState(null)

  const [conversations, setConversations] = useState([])

  const [messages, setMessages] = useState([])

  const [memories, setMemories] = useState([])

  const [user, setUser] = useState(null)

  const [loadingWorkspace, setLoadingWorkspace] =
    useState(true)

  const [conversationLoading, setConversationLoading] =
    useState(false)

  const [sending, setSending] = useState(false)

  const [signingOut, setSigningOut] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState(null)
  const [sendError, setSendError] = useState('')
  const [newAssistantMessageId, setNewAssistantMessageId] = useState(null)
  const [messageSources, setMessageSources] = useState({})
  const [retrievalMode, setRetrievalMode] =
    useState('auto')
  const [retrievalMenuOpen, setRetrievalMenuOpen] =
    useState(false)

  const messageListRef = useRef(null)
  const composerRef = useRef(null)

  /*
   * LOAD USER MEMORIES
   */

  const loadMemories = async (currentUser) => {
    if (!currentUser) {
      return
    }

    const { data, error } = await supabase
      .from('memories')
      .select(
        'id, memory, category, created_at, updated_at',
      )
      .eq('user_id', currentUser.id)
      .order('updated_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Failed to load memories:',
        error,
      )

      return
    }

    setMemories(data || [])
  }

  /*
   * LOAD WORKSPACE
   */

  useEffect(() => {
    const loadWorkspace = async () => {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !currentUser) {
        window.location.href = '/auth'
        return
      }

      setUser(currentUser)

      const {
        data: conversationData,
        error: conversationError,
      } = await supabase
        .from('conversations')
        .select(
          'id, title, created_at, updated_at',
        )
        .eq('user_id', currentUser.id)
        .order('updated_at', {
          ascending: false,
        })

      if (conversationError) {
        console.error(
          'Failed to load conversations:',
          conversationError,
        )
      } else {
        setConversations(
          conversationData || [],
        )
      }

      await loadMemories(currentUser)

      setLoadingWorkspace(false)
    }

    loadWorkspace()
  }, [])

  /*
   * KNOWLEDGE HUB EVENT
   */

  useEffect(() => {
    const handleOpenKnowledge = () => {
      setKnowledgeOpen(true)
      setIntelligenceOpen(false)
      setSidebarOpen(false)
    }

    window.addEventListener(
      'aevyron-open-knowledge',
      handleOpenKnowledge,
    )

    return () => {
      window.removeEventListener(
        'aevyron-open-knowledge',
        handleOpenKnowledge,
      )
    }
  }, [])

  /*
   * SMOOTH CHAT SCROLL
   */

  useEffect(() => {
    const messageList = messageListRef.current

    if (!messageList) {
      return
    }

    requestAnimationFrame(() => {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: 'smooth',
      })
    })
  }, [messages, sending])

  /*
   * DELETE CONVERSATION
   */

  const deleteConversation = async (
    conversationId,
  ) => {
    if (!user) {
      return
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id)

    if (error) {
      console.error(
        'Failed to delete conversation:',
        error,
      )

      return
    }

    setConversations((current) =>
      current.filter(
        (item) => item.id !== conversationId,
      ),
    )

    if (
      activeConversation?.id ===
      conversationId
    ) {
      setActiveConversation(null)
      setMessages([])
      setMessage('')
      setMessageSources({})
    }
  }

  /*
   * RENAME CONVERSATION
   */

  const renameConversation = async (
    conversation,
    newTitle,
  ) => {
    if (
      !user ||
      !conversation ||
      !newTitle
    ) {
      return false
    }

    const trimmedTitle = newTitle.trim()

    if (!trimmedTitle) {
      return false
    }

    if (
      trimmedTitle ===
      conversation.title
    ) {
      return true
    }

    const { data, error } = await supabase
      .from('conversations')
      .update({
        title: trimmedTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id)
      .eq('user_id', user.id)
      .select(
        'id, title, created_at, updated_at',
      )
      .single()

    if (error) {
      console.error(
        'Failed to rename conversation:',
        error,
      )

      return false
    }

    setConversations((current) =>
      current
        .map((item) =>
          item.id === conversation.id
            ? data
            : item,
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at) -
            new Date(a.updated_at),
        ),
    )

    if (
      activeConversation?.id ===
      conversation.id
    ) {
      setActiveConversation(data)
    }

    return true
  }

  /*
   * DELETE MEMORY
   */

  const deleteMemory = async (memoryId) => {
    if (!user || !memoryId) {
      return
    }

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', user.id)

    if (error) {
      console.error(
        'Failed to delete memory:',
        error,
      )

      return
    }

    setMemories((current) =>
      current.filter(
        (memory) => memory.id !== memoryId,
      ),
    )
  }

  /*
   * SIGN OUT
   */

  const handleSignOut = async () => {
    if (signingOut) {
      return
    }

    setSigningOut(true)

    try {
      const { error } =
        await supabase.auth.signOut()

      if (error) {
        throw error
      }

      window.location.href = '/auth'
    } catch (error) {
      console.error(
        'Failed to sign out:',
        error,
      )

      setSigningOut(false)
    }
  }

  /*
   * NEW CONVERSATION
   */

  const startNewConversation = () => {
    setConversationMenuOpen(false)
    setRetrievalMenuOpen(false)
    setConversationLoading(false)
    setActiveConversation(null)
    setMessages([])
    setMessage(drafts.new || '')
    setMessageSources({})
    setSendError('')
    setSidebarOpen(false)
  }

  /*
   * OPEN CONVERSATION
   */

  const openConversation = async (
    conversation,
  ) => {
    if (!user) {
      return
    }

    if (
      conversation.id === activeConversation?.id &&
      !conversationLoading
    ) {
      setSidebarOpen(false)
      return
    }

    setConversationMenuOpen(false)
    setRetrievalMenuOpen(false)
    setConversationLoading(true)
    setSendError('')
    setSidebarOpen(false)

    const { data, error } = await supabase
      .from('messages')
      .select(
        'id, role, content, sources, created_at',
      )
      .eq(
        'conversation_id',
        conversation.id,
      )
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Failed to load messages:',
        error,
      )

      setConversationLoading(false)
      setSendError(
        'Could not load this conversation. Please try again.',
      )
      return
    }

    setActiveConversation(conversation)
    setMessages(data || [])

    const persistedSources = {}
    ;(data || []).forEach((item) => {
      if (
        item.role === 'assistant' &&
        Array.isArray(item.sources) &&
        item.sources.length > 0
      ) {
        persistedSources[item.id] = item.sources
      }
    })

    setMessageSources(persistedSources)
    setMessage(drafts[conversation.id] || '')
    setConversationLoading(false)
  }


  /*
   * SUGGESTION
   */

  const handleSuggestion = (prompt) => {
    setMessage(prompt)

    setDrafts((current) => ({
      ...current,
      [activeConversation?.id || 'new']: prompt,
    }))
  }

  const resizeComposer = (textarea) => {
    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
  }

  useEffect(() => {
    if (composerRef.current) {
      resizeComposer(composerRef.current)
    }
  }, [message])

  const copyMessage = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      window.setTimeout(() => {
        setCopiedMessageId((current) =>
          current === messageId ? null : current,
        )
      }, 1600)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  /*
   * CREATE CONVERSATION
   */

  const createConversation = async (title) => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title,
      })
      .select(
        'id, title, created_at, updated_at',
      )
      .single()

    if (error) {
      throw error
    }

    setActiveConversation(data)

    setConversations((current) => [
      data,
      ...current,
    ])

    return data
  }

  /*
   * SAVE MESSAGE
   */

  const saveMessage = async (
    conversationId,
    role,
    content,
    sources = [],
  ) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
        sources: Array.isArray(sources)
          ? sources
          : [],
      })
      .select(
        'id, role, content, sources, created_at',
      )
      .single()

    if (error) {
      throw error
    }

    return data
  }

  /*
   * UPDATE CONVERSATION TIMESTAMP
   */

  const updateConversationTimestamp =
    async (conversationId) => {
      const { data, error } =
        await supabase
          .from('conversations')
          .update({
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', conversationId)
          .eq('user_id', user.id)
          .select(
            'id, title, created_at, updated_at',
          )
          .single()

      if (error) {
        console.error(
          'Failed to update conversation:',
          error,
        )

        return
      }

      setActiveConversation(data)

      setConversations((current) =>
        [
          data,
          ...current.filter(
            (item) =>
              item.id !== data.id,
          ),
        ].sort(
          (a, b) =>
            new Date(b.updated_at) -
            new Date(a.updated_at),
        ),
      )
    }

  /*
   * ASK AEVYRON
   */

  const askAevyron = async (
    conversationMessages,
  ) => {
    const { data, error } =
      await supabase.functions.invoke(
        'aevyron-chat',
        {
          body: {
            messages:
              conversationMessages.map(
                (item) => ({
                  role: item.role,
                  content: item.content,
                }),
              ),
            retrieval_mode: retrievalMode,
            conversation_id: activeConversation?.id || null,
          },
        },
      )

    if (error) {
      console.error(
        'Aevyron function error:',
        error,
      )

      throw new Error(
        error.message ||
          'Aevyron could not generate a response.',
      )
    }

    if (!data?.response) {
      throw new Error(
        'Aevyron returned an empty response.',
      )
    }

    return {
      response: data.response,
      sources: Array.isArray(data.sources)
        ? data.sources
        : [],
      retrieval: data.retrieval || {
        web: false,
        knowledge: false,
      },
    }
  }

  const renderMessageSources = (messageId) => {
    const sources = messageSources[messageId]

    if (!sources?.length) {
      return null
    }

    const webSources = sources.filter(
      (source) => source.type === 'web',
    )

    const knowledgeSources = sources.filter(
      (source) => source.type === 'knowledge',
    )

    return (
      <div
        className="message-sources"
        style={{
          marginTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '620px',
        }}
      >
        <div
          className="message-sources-label"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            opacity: 0.62,
          }}
        >
          <Sparkles size={11} />
          Sources
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '7px',
          }}
        >
          {webSources.map((source, index) => (
            <a
              key={`web-${source.url || index}`}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="message-source-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                minHeight: '32px',
                maxWidth: '100%',
                padding: '7px 10px',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'rgba(255,255,255,0.035)',
                fontSize: '12px',
                lineHeight: 1.25,
              }}
              title={source.url}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'currentColor',
                  opacity: 0.65,
                  flex: '0 0 auto',
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {source.title || 'Web source'}
              </span>
            </a>
          ))}

          {knowledgeSources.map((source, index) => (
            <div
              key={`knowledge-${source.file_id || index}`}
              className="message-source-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                minHeight: '32px',
                maxWidth: '100%',
                padding: '7px 10px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'rgba(255,255,255,0.035)',
                fontSize: '12px',
                lineHeight: 1.25,
              }}
              title="Retrieved from your Knowledge Hub"
            >
              <span
                aria-hidden="true"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'currentColor',
                  opacity: 0.65,
                  flex: '0 0 auto',
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {source.title || 'Knowledge document'}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const retrievalOptions = [
    {
      id: 'auto',
      label: 'Auto',
      description: 'Aevyron decides when retrieval helps.',
    },
    {
      id: 'web',
      label: 'Web',
      description: 'Use live web search for this answer.',
    },
    {
      id: 'knowledge',
      label: 'Knowledge',
      description: 'Use your uploaded Knowledge Hub.',
    },
    {
      id: 'both',
      label: 'Both',
      description: 'Use Web + Knowledge when available.',
    },
    {
      id: 'none',
      label: 'None',
      description: 'Answer without Web or Knowledge retrieval.',
    },
  ]

  const activeRetrievalOption =
    retrievalOptions.find(
      (option) => option.id === retrievalMode,
    ) || retrievalOptions[0]

  /*
   * SEND MESSAGE
   */

  const handleSend = async () => {
    const trimmedMessage = message.trim()

    if (
      !trimmedMessage ||
      !user ||
      sending
    ) {
      return
    }

    const draftKey =
      activeConversation?.id || 'new'

    setSending(true)
    setSendError('')
    setMessage('')

    try {
      let conversation =
        activeConversation

      if (!conversation) {
        const title =
          trimmedMessage.length > 32
            ? `${trimmedMessage.slice(
                0,
                32,
              )}...`
            : trimmedMessage

        conversation =
          await createConversation(title)
      }

      const userMessage =
        await saveMessage(
          conversation.id,
          'user',
          trimmedMessage,
        )

      const updatedMessages = [
        ...messages,
        userMessage,
      ]

      setMessages(updatedMessages)

      await updateConversationTimestamp(
        conversation.id,
      )

      const assistantResult =
        await askAevyron(
          updatedMessages,
        )

      const assistantMessage =
        await saveMessage(
          conversation.id,
          'assistant',
          assistantResult.response,
          assistantResult.sources,
        )

      setMessages((current) => [
        ...current,
        assistantMessage,
      ])

      if (assistantMessage.sources?.length > 0) {
        setMessageSources((current) => ({
          ...current,
          [assistantMessage.id]:
            assistantMessage.sources,
        }))
      }

      setNewAssistantMessageId(assistantMessage.id)
      window.setTimeout(() => {
        setNewAssistantMessageId((current) =>
          current === assistantMessage.id ? null : current,
        )
      }, 700)

      await updateConversationTimestamp(
        conversation.id,
      )

      /*
       * Refresh memories after Aevyron
       * finishes processing the conversation.
       */

      await loadMemories(user)

      /*
       * Tell the intelligence dashboard
       * and sidebar that Aevyron's personal
       * intelligence has changed.
       */

      setDrafts((current) => {
        const next = { ...current }
        delete next[draftKey]
        delete next[conversation.id]
        return next
      })

      window.dispatchEvent(
        new CustomEvent(
          'aevyron-intelligence-updated',
        ),
      )
    } catch (error) {
      console.error(
        'Failed to send message:',
        error,
      )

      setMessage(trimmedMessage)
      setDrafts((current) => ({
        ...current,
        [draftKey]: trimmedMessage,
      }))
      setSendError(
        error?.message ||
          'Aevyron could not complete that response. Please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  /*
   * COMPOSER KEYBOARD
   */

  const handleComposerKeyDown = (event) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()
      handleSend()
    }
  }

  const isConversationActive =
    messages.length > 0

  /*
   * LOADING
   */

  if (loadingWorkspace) {
    return (
      <main className="workspace">
        <section className="workspace-main">
          <div className="workspace-content">
            <section className="welcome">
              <div className="welcome-symbol">
                <div className="welcome-glow" />

                <div className="welcome-core">
                  <Brain
                    size={24}
                    strokeWidth={1.5}
                  />
                </div>
              </div>

              <span className="welcome-kicker">
                PERSONAL INTELLIGENCE
              </span>

              <h1>
                Preparing your
                <span> workspace.</span>
              </h1>

              <p>
                Aevyron is loading your
                personal intelligence space.
              </p>
            </section>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="workspace">
      <WorkspaceSidebar
        mobileOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
        conversations={conversations.map(
          (conversation) => ({
            ...conversation,
            date: formatConversationDate(
              conversation.updated_at ||
                conversation.created_at,
            ),
          }),
        )}
        activeConversationId={
          activeConversation?.id
        }
        onNewConversation={
          startNewConversation
        }
        onSelectConversation={
          openConversation
        }
        onDeleteConversation={
          deleteConversation
        }
        onRenameConversation={
          renameConversation
        }
        onSignOut={handleSignOut}
        signingOut={signingOut}
        memories={memories}
        onDeleteMemory={deleteMemory}
        onOpenKnowledge={() => {
          setKnowledgeOpen(true)
          setIntelligenceOpen(false)
          setSidebarOpen(false)
        }}
      />

      <section className="workspace-main">
        <header className="workspace-header">
          <button
            className="mobile-menu"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div
            className={`workspace-status ${
              sending ? 'thinking' : ''
            }`}
          >
            <span className="status-pulse" />

            <span>
              {conversationLoading
                ? 'Loading conversation'
                : sending
                  ? 'Aevyron is thinking'
                  : 'Aevyron is ready'}
            </span>
          </div>

          <div className="header-right-controls">
            <button
              className="header-context-button"
              type="button"
              onClick={() =>
                setIntelligenceOpen(true)
              }
              aria-label="Open personal context"
            >
              <PanelRight size={14} />
              <span>Context</span>
            </button>

            <button
              className={`header-ai-button ${
                intelligenceOpen
                  ? 'active'
                  : ''
              }`}
            onClick={() =>
              setIntelligenceOpen(true)
            }
            aria-label="Open personal intelligence"
            aria-haspopup="dialog"
            aria-expanded={
              intelligenceOpen
            }
            >
              <Sparkles size={15} />
              <span>Intelligence</span>
            </button>
          </div>
        </header>

        <div
          className={`workspace-content ${
            isConversationActive
              ? 'conversation-active'
              : ''
          }`}
        >
          {!isConversationActive ? (
            <>
              <section className="welcome">
                <div className="welcome-symbol">
                  <div className="welcome-glow" />

                  <div className="welcome-core">
                    <Brain
                      size={24}
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                <span className="welcome-kicker">
                  PERSONAL INTELLIGENCE
                </span>

                <h1>
                  What should we
                  <span>
                    {' '}
                    explore together?
                  </span>
                </h1>

                <p>
                  Ask Aevyron anything. It can
                  reason through ideas, learn
                  from your conversations, and
                  build context over time.
                </p>
              </section>

              <section className="suggestions">
                <button
                  className="suggestion-card"
                  onClick={() =>
                    handleSuggestion(
                      suggestionPrompts.think,
                    )
                  }
                >
                  <span className="suggestion-icon">
                    <WandSparkles size={17} />
                  </span>

                  <span>
                    <strong>
                      Help me think
                    </strong>

                    <small>
                      Explore an idea from a
                      new perspective.
                    </small>
                  </span>
                </button>

                <button
                  className="suggestion-card"
                  onClick={() =>
                    handleSuggestion(
                      suggestionPrompts.teach,
                    )
                  }
                >
                  <span className="suggestion-icon">
                    <Brain size={17} />
                  </span>

                  <span>
                    <strong>
                      Teach me something
                    </strong>

                    <small>
                      Learn a concept through
                      conversation.
                    </small>
                  </span>
                </button>

                <button
                  className="suggestion-card"
                  onClick={() =>
                    handleSuggestion(
                      suggestionPrompts.analyze,
                    )
                  }
                >
                  <span className="suggestion-icon">
                    <FilePlus2 size={17} />
                  </span>

                  <span>
                    <strong>
                      Analyze something
                    </strong>

                    <small>
                      Bring your own knowledge
                      into the conversation.
                    </small>
                  </span>
                </button>
              </section>
            </>
          ) : (
            <section className="chat-view">
              <div className="chat-heading">
                <div className="chat-heading-main">
                  <div className="chat-heading-label">
                    <span className="chat-heading-status" />
                    <span className="welcome-kicker">
                      CONVERSATION
                    </span>
                  </div>

                  <h1>
                    {activeConversation?.title ||
                      'New conversation'}
                  </h1>

                  {activeConversation && (
                    <span className="chat-heading-meta">
                      {messages.length > 0
                        ? `${messages.length} ${
                            messages.length === 1
                              ? 'message'
                              : 'messages'
                          }`
                        : 'New conversation'}
                    </span>
                  )}
                </div>

                {activeConversation && (
                  <div className="chat-heading-actions">
                    <button
                      className="chat-header-control"
                      onClick={() =>
                        setConversationMenuOpen(
                          (current) => !current,
                        )
                      }
                      aria-label="Conversation options"
                      aria-haspopup="menu"
                      aria-expanded={
                        conversationMenuOpen
                      }
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {conversationMenuOpen && (
                      <div
                        className="chat-header-menu"
                        role="menu"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setConversationMenuOpen(false)
                            navigator.clipboard?.writeText(
                              activeConversation.title || '',
                            )
                          }}
                        >
                          Copy conversation title
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setConversationMenuOpen(false)
                            startNewConversation()
                          }}
                        >
                          New conversation
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div
                ref={messageListRef}
                className="message-list"
              >
                {conversationLoading ? (
                  <div className="conversation-loading">
                    <div className="conversation-loading-avatar">
                      <Brain size={15} strokeWidth={1.6} />
                    </div>

                    <div className="conversation-loading-content">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ) : (
                  messages.map((item) => (
                  <div
                    key={item.id}
                    className={`message-row ${item.role} ${
                      newAssistantMessageId === item.id
                        ? 'message-arrival'
                        : ''
                    }`}
                  >
                    <div className="message-avatar">
                      {item.role ===
                      'assistant' ? (
                        <Brain
                          size={15}
                          strokeWidth={1.6}
                        />
                      ) : (
                        <span>Y</span>
                      )}
                    </div>

                    <div className="message-content">
                      <div className="message-meta">
                        <span className="message-role">
                          {item.role ===
                          'assistant'
                            ? 'Aevyron'
                            : 'You'}
                        </span>

                        <time>
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>

                      <p>{item.content}</p>

                      {item.role === 'assistant' &&
                        newAssistantMessageId === item.id && (
                          <span className="context-cue">
                            <Sparkles size={10} />
                            Personal context considered
                          </span>
                        )}

                      {item.role === 'assistant' &&
                        renderMessageSources(item.id)}

                      {item.role === 'assistant' && (
                        <button
                          className="message-copy"
                          onClick={() =>
                            copyMessage(item.content, item.id)
                          }
                          aria-label="Copy Aevyron response"
                        >
                          {copiedMessageId === item.id ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>
                            {copiedMessageId === item.id
                              ? 'Copied'
                              : 'Copy'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  ))
                )}

                {sendError && (
                  <div className="chat-error" role="alert">
                    <div>
                      <strong>Something went wrong</strong>
                      <span>{sendError}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSendError('')
                        handleSend()
                      }}
                      disabled={sending}
                    >
                      <RotateCcw size={13} />
                      Retry
                    </button>
                  </div>
                )}

                {sending && (
                  <div className="message-row assistant thinking-row">
                    <div className="message-avatar thinking-avatar">
                      <Brain
                        size={15}
                        strokeWidth={1.6}
                      />
                    </div>

                    <div className="message-content thinking-content">
                      <div className="thinking-label">
                        <span className="message-role">
                          Aevyron
                        </span>
                        <span>Thinking through your context</span>
                      </div>

                      <div className="thinking-indicator">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="composer-area">
            {retrievalMenuOpen && (
              <button
                className="retrieval-backdrop"
                type="button"
                aria-label="Close retrieval options"
                onClick={() =>
                  setRetrievalMenuOpen(false)
                }
              />
            )}

            {retrievalMenuOpen && (
              <div
                className="retrieval-menu"
                role="menu"
                aria-label="Retrieval mode"
              >
                <div className="retrieval-menu-header">
                  <div>
                    <strong>Retrieval</strong>
                    <span>
                      Choose how Aevyron should gather information.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="retrieval-menu-close"
                    onClick={() =>
                      setRetrievalMenuOpen(false)
                    }
                    aria-label="Close retrieval options"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>

                <div className="retrieval-options">
                  {retrievalOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={
                        retrievalMode === option.id
                      }
                      className={`retrieval-option ${
                        retrievalMode === option.id
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => {
                        setRetrievalMode(option.id)
                        setRetrievalMenuOpen(false)
                      }}
                    >
                      <span className="retrieval-option-check">
                        {retrievalMode === option.id ? '✓' : ''}
                      </span>

                      <span className="retrieval-option-copy">
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="composer">
              <textarea
                ref={composerRef}
                value={message}
                onChange={(event) => {
                  const nextMessage = event.target.value
                  const draftKey =
                    activeConversation?.id || 'new'

                  setMessage(nextMessage)
                  setDrafts((current) => ({
                    ...current,
                    [draftKey]: nextMessage,
                  }))
                }}
                onKeyDown={handleComposerKeyDown}
                placeholder="Talk to Aevyron..."
                rows={1}
                aria-label="Message Aevyron"
                disabled={
                  sending || conversationLoading
                }
              />

              <div className="composer-bottom">
                <div className="composer-tools">
                  <button
                    aria-label="Attach file"
                  >
                    <Paperclip size={17} />
                  </button>

                  <button
                    aria-label="Add file"
                  >
                    <FilePlus2 size={17} />
                  </button>

                  <button
                    type="button"
                    className={`retrieval-trigger ${
                      retrievalMenuOpen ? 'active' : ''
                    }`}
                    onClick={() =>
                      setRetrievalMenuOpen(
                        (current) => !current,
                      )
                    }
                    aria-label="Choose retrieval mode"
                    aria-haspopup="menu"
                    aria-expanded={
                      retrievalMenuOpen
                    }
                    title="Choose retrieval mode"
                  >
                    <Sparkles size={15} />
                    <span>
                      {activeRetrievalOption.label}
                    </span>
                  </button>

                  <span className="composer-hint">
                    Enter to send · Shift + Enter for a new line
                  </span>
                </div>

                <div className="composer-actions">
                  <button
                    className="voice-button"
                    aria-label="Voice input"
                  >
                    <Mic size={17} />
                  </button>

                  <button
                    className={`send-button ${
                      message.trim()
                        ? 'active'
                        : ''
                    }`}
                    onClick={handleSend}
                    aria-label="Send message"
                    disabled={
                      !message.trim() ||
                      sending ||
                      conversationLoading
                    }
                  >
                    <ArrowUp size={17} />
                  </button>
                </div>
              </div>
            </div>

            <p className="composer-disclaimer">
              Aevyron may make mistakes. Check
              important information.
            </p>
          </div>
        </div>
      </section>

      {knowledgeOpen && (
        <KnowledgeHub
          onClose={() =>
            setKnowledgeOpen(false)
          }
          onAskAboutFile={(file) => {
            setKnowledgeOpen(false)
            setMessage(
              `Using my uploaded knowledge, explain the key information from "${file.file_name}".`,
            )
            setDrafts((current) => ({
              ...current,
              [activeConversation?.id || 'new']:
                `Using my uploaded knowledge, explain the key information from "${file.file_name}".`,
            }))
          }}
          onAskAboutAll={() => {
            setKnowledgeOpen(false)
            setMessage(
              'Using my uploaded knowledge, summarize the most important information across my files.',
            )
            setDrafts((current) => ({
              ...current,
              [activeConversation?.id || 'new']:
                'Using my uploaded knowledge, summarize the most important information across my files.',
            }))
          }}
        />
      )}

      {intelligenceOpen && (
        <IntelligenceDashboard
          onClose={() =>
            setIntelligenceOpen(false)
          }
        />
      )}
    </main>
  )
}

export default Workspace