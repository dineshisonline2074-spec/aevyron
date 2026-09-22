import {
  Brain,
  Check,
  ChevronDown,
  CircleUserRound,
  FileText,
  Gauge,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

function WorkspaceSidebar({
  mobileOpen,
  onClose,
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onSignOut,
  signingOut,
  memories = [],
  onDeleteMemory,
  onOpenKnowledge,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [activeSection, setActiveSection] =
    useState('conversations')

  const [knowledgeFiles, setKnowledgeFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState(null)
  const [knowledgeError, setKnowledgeError] = useState('')

  const [insights, setInsights] = useState([])
  const [insightsLoading, setInsightsLoading] =
    useState(false)
  const [insightsError, setInsightsError] = useState('')
  const [deletingInsightId, setDeletingInsightId] =
    useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!editingId) {
      return
    }

    const input = document.querySelector(
      `.conversation-rename-input[data-conversation-id="${editingId}"]`,
    )

    if (input) {
      input.focus()
      input.select()
    }
  }, [editingId])

  useEffect(() => {
    const handleIntelligenceUpdated = () => {
      if (activeSection === 'insights') {
        loadInsights()
      }
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
  }, [activeSection])

  const startRename = (conversation) => {
    setEditingId(conversation.id)
    setEditingTitle(conversation.title || '')
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const saveRename = async (conversation) => {
    const trimmedTitle = editingTitle.trim()

    if (!trimmedTitle) {
      return
    }

    if (trimmedTitle === conversation.title) {
      cancelRename()
      return
    }

    const success = await onRenameConversation(
      conversation,
      trimmedTitle,
    )

    if (success) {
      cancelRename()
    }
  }

  const handleRenameKeyDown = (
    event,
    conversation,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveRename(conversation)
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  const loadKnowledgeFiles = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    const { data, error } = await supabase
      .from('knowledge_files')
      .select(
        'id, file_name, file_type, file_size, storage_path, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Failed to load knowledge files:',
        error,
      )

      setKnowledgeError(
        'Could not load your files.',
      )

      return
    }

    setKnowledgeError('')
    setKnowledgeFiles(data || [])
  }

  const loadInsights = async () => {
    setInsightsLoading(true)
    setInsightsError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setInsights([])
        return
      }

      const { data, error } = await supabase
        .from('insights')
        .select(
          'id, title, insight, category, confidence, source, created_at, updated_at',
        )
        .eq('user_id', user.id)
        .order('updated_at', {
          ascending: false,
        })
        .limit(30)

      if (error) {
        throw error
      }

      setInsights(data || [])
    } catch (error) {
      console.error(
        'Failed to load insights:',
        error,
      )

      setInsightsError(
        'Could not load your insights.',
      )
    } finally {
      setInsightsLoading(false)
    }
  }

  const handleSectionChange = (section) => {
    setActiveSection(section)

    if (section === 'knowledge') {
      loadKnowledgeFiles()
    }

    if (section === 'insights') {
      loadInsights()
    }
  }

  const handleDeleteInsight = async (
    insight,
  ) => {
    setDeletingInsightId(insight.id)
    setInsightsError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'You must be signed in.',
        )
      }

      const { error } = await supabase
        .from('insights')
        .delete()
        .eq('id', insight.id)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setInsights((current) =>
        current.filter(
          (item) => item.id !== insight.id,
        ),
      )
    } catch (error) {
      console.error(
        'Insight deletion failed:',
        error,
      )

      setInsightsError(
        error?.message ||
          'Could not delete this insight.',
      )
    } finally {
      setDeletingInsightId(null)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return '0 KB'
    }

    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatFileType = (fileType) => {
    if (!fileType) {
      return 'File'
    }

    if (fileType === 'application/pdf') {
      return 'PDF'
    }

    if (fileType === 'text/plain') {
      return 'TXT'
    }

    if (fileType === 'text/markdown') {
      return 'MD'
    }

    if (
      fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'DOCX'
    }

    return (
      fileType.split('/').pop()?.toUpperCase() ||
      'FILE'
    )
  }

  const formatInsightCategory = (
    category,
  ) => {
    if (!category) {
      return 'General'
    }

    return (
      category.charAt(0).toUpperCase() +
      category.slice(1)
    )
  }

  const formatConfidence = (
    confidence,
  ) => {
    const value = Number(confidence)

    if (Number.isNaN(value)) {
      return '50%'
    }

    return `${Math.round(
      Math.max(0, Math.min(1, value)) * 100,
    )}%`
  }

  const handleKnowledgeUpload = async (
    event,
  ) => {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    setKnowledgeError('')

    if (file.size > 10 * 1024 * 1024) {
      setKnowledgeError(
        'File is too large. Maximum size is 10 MB.',
      )
      return
    }

    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(file.type)) {
      setKnowledgeError(
        'Supported files: PDF, TXT, MD and DOCX.',
      )
      return
    }

    setUploading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'You must be signed in to upload a file.',
        )
      }

      const safeFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')

      const storagePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`

      const { error: uploadError } =
        await supabase.storage
          .from('knowledge')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType:
              file.type ||
              'application/octet-stream',
          })

      if (uploadError) {
        throw uploadError
      }

      const { data: metadata, error: metadataError } =
        await supabase
          .from('knowledge_files')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_type: file.type || null,
            file_size: file.size,
            storage_path: storagePath,
          })
          .select('id, storage_path')
          .single()

      if (metadataError) {
        await supabase.storage
          .from('knowledge')
          .remove([storagePath])

        throw metadataError
      }

      const { data: indexResult, error: indexError } =
        await supabase.functions.invoke('aevyron-chat', {
          body: {
            action: 'index_knowledge_file',
            knowledge_file_id: metadata.id,
          },
        })

      if (indexError) {
        await supabase
          .from('knowledge_files')
          .delete()
          .eq('id', metadata.id)
          .eq('user_id', user.id)

        await supabase.storage
          .from('knowledge')
          .remove([storagePath])

        throw indexError
      }

      if (indexResult?.error) {
        await supabase
          .from('knowledge_files')
          .delete()
          .eq('id', metadata.id)
          .eq('user_id', user.id)

        await supabase.storage
          .from('knowledge')
          .remove([storagePath])

        throw new Error(indexResult.error)
      }

      await loadKnowledgeFiles()
    } catch (error) {
      console.error(
        'Knowledge upload failed:',
        error,
      )

      setKnowledgeError(
        error?.message ||
          'Something went wrong while uploading.',
      )
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteKnowledgeFile = async (
    file,
  ) => {
    setDeletingFileId(file.id)
    setKnowledgeError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'You must be signed in.',
        )
      }

      const { data: deleteResult, error: indexDeleteError } =
        await supabase.functions.invoke('aevyron-chat', {
          body: {
            action: 'delete_knowledge_file',
            knowledge_file_id: file.id,
          },
        })

      if (indexDeleteError) {
        throw indexDeleteError
      }

      if (deleteResult?.error) {
        throw new Error(deleteResult.error)
      }

      const { error: storageError } =
        await supabase.storage
          .from('knowledge')
          .remove([file.storage_path])

      if (storageError) {
        throw storageError
      }

      const { error: databaseError } =
        await supabase
          .from('knowledge_files')
          .delete()
          .eq('id', file.id)
          .eq('user_id', user.id)

      if (databaseError) {
        throw databaseError
      }

      setKnowledgeFiles((current) =>
        current.filter(
          (item) => item.id !== file.id,
        ),
      )
    } catch (error) {
      console.error(
        'Knowledge deletion failed:',
        error,
      )

      setKnowledgeError(
        error?.message ||
          'Could not delete this file.',
      )
    } finally {
      setDeletingFileId(null)
    }
  }

  return (
    <>
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`workspace-sidebar ${
          mobileOpen ? 'open' : ''
        }`}
      >
        <div className="sidebar-top">
          <a
            href="/"
            className="workspace-brand"
          >
            <span className="brand-mark">
              <span />
              <span />
            </span>

            <span>Aevyron</span>
          </a>

          <button
            className="mobile-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <button
          className="new-chat-button"
          onClick={() => {
            handleSectionChange(
              'conversations',
            )
            onNewConversation()
          }}
        >
          <Plus size={17} />
          <span>New conversation</span>
        </button>

        <div className="sidebar-section">
          <span className="sidebar-label">
            Workspace
          </span>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-item ${
                activeSection ===
                'conversations'
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                handleSectionChange(
                  'conversations',
                )
              }
            >
              <MessageSquare size={17} />
              <span>Conversations</span>
            </button>

            <button
              className={`sidebar-item ${
                activeSection === 'memory'
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                handleSectionChange('memory')
              }
            >
              <Brain size={17} />
              <span>Memory</span>
            </button>

            <button
              className={`sidebar-item ${
                activeSection === 'knowledge'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                handleSectionChange('knowledge')
                onOpenKnowledge?.()
              }}
            >
              <FileText size={17} />
              <span>Knowledge</span>
            </button>

            <button
              className={`sidebar-item ${
                activeSection === 'insights'
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                handleSectionChange('insights')
              }
            >
              <Gauge size={17} />
              <span>Insights</span>
            </button>
          </nav>
        </div>

        {activeSection ===
        'conversations' ? (
          <div className="conversation-section">
            <div className="conversation-heading">
              <span className="sidebar-label">
                Recent
              </span>

              <button
                aria-label="Recent conversation options"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <div className="conversation-list">
              {conversations.map(
                (conversation) => {
                  const isEditing =
                    editingId ===
                    conversation.id

                  return (
                    <div
                      key={conversation.id}
                      className={`conversation-item-wrap ${
                        activeConversationId ===
                        conversation.id
                          ? 'active'
                          : ''
                      }`}
                    >
                      {isEditing ? (
                        <div className="conversation-rename-row">
                          <input
                            className="conversation-rename-input"
                            data-conversation-id={
                              conversation.id
                            }
                            value={editingTitle}
                            onChange={(
                              event,
                            ) =>
                              setEditingTitle(
                                event.target
                                  .value,
                              )
                            }
                            onKeyDown={(event) =>
                              handleRenameKeyDown(
                                event,
                                conversation,
                              )
                            }
                            maxLength={100}
                            aria-label="Conversation name"
                          />

                          <button
                            className="conversation-rename-save"
                            onClick={() =>
                              saveRename(
                                conversation,
                              )
                            }
                            aria-label="Save conversation name"
                            title="Save"
                          >
                            <Check size={14} />
                          </button>

                          <button
                            className="conversation-rename-cancel"
                            onClick={
                              cancelRename
                            }
                            aria-label="Cancel rename"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className={`conversation-item ${
                              activeConversationId ===
                              conversation.id
                                ? 'active'
                                : ''
                            }`}
                            onClick={() =>
                              onSelectConversation(
                                conversation,
                              )
                            }
                          >
                            <span>
                              {
                                conversation.title
                              }
                            </span>

                            <small>
                              {
                                conversation.date
                              }
                            </small>
                          </button>

                          <div className="conversation-actions">
                            <button
                              className="conversation-options"
                              aria-label={`Options for ${conversation.title}`}
                              title="Conversation options"
                            >
                              <MoreHorizontal
                                size={15}
                              />
                            </button>

                            <div className="conversation-menu">
                              <button
                                className="conversation-menu-item"
                                onClick={(
                                  event,
                                ) => {
                                  event.stopPropagation()

                                  startRename(
                                    conversation,
                                  )
                                }}
                              >
                                <Pencil
                                  size={14}
                                />

                                <span>
                                  Rename conversation
                                </span>
                              </button>

                              <button
                                className="conversation-menu-item delete"
                                onClick={(
                                  event,
                                ) => {
                                  event.stopPropagation()

                                  onDeleteConversation(
                                    conversation.id,
                                  )
                                }}
                              >
                                <X
                                  size={14}
                                />

                                <span>
                                  Delete conversation
                                </span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                },
              )}
            </div>
          </div>
        ) : activeSection ===
          'memory' ? (
          <div className="conversation-section memory-section">
            <div className="conversation-heading">
              <span className="sidebar-label">
                Remembered
              </span>

              <span className="memory-count">
                {memories.length}
              </span>
            </div>

            <div className="memory-list">
              {memories.length === 0 ? (
                <div className="memory-empty">
                  <div className="memory-empty-icon">
                    <Brain size={16} />
                  </div>

                  <strong>
                    Nothing remembered yet
                  </strong>

                  <span>
                    As you talk with Aevyron,
                    useful long-term details
                    will appear here.
                  </span>
                </div>
              ) : (
                memories.map((memory) => (
                  <div
                    className="memory-item"
                    key={memory.id}
                  >
                    <div className="memory-item-icon">
                      <Brain size={14} />
                    </div>

                    <div className="memory-item-content">
                      <span>
                        {memory.memory}
                      </span>

                      {memory.category && (
                        <small>
                          {memory.category}
                        </small>
                      )}
                    </div>

                    <button
                      className="memory-delete"
                      onClick={() =>
                        onDeleteMemory?.(
                          memory.id,
                        )
                      }
                      aria-label="Delete memory"
                      title="Delete memory"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeSection ===
          'knowledge' ? (
          <div className="conversation-section memory-section">
            <div className="conversation-heading">
              <span className="sidebar-label">
                Knowledge
              </span>

              <span className="memory-count">
                {knowledgeFiles.length}
              </span>
            </div>

            <button
              className="new-chat-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={uploading}
              style={{
                marginBottom: '10px',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Upload size={16} />
              <span>
                {uploading
                  ? 'Uploading...'
                  : 'Add knowledge'}
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx"
              onChange={handleKnowledgeUpload}
              style={{ display: 'none' }}
            />

            {knowledgeError && (
              <div
                style={{
                  margin: '0 2px 10px',
                  padding: '8px 9px',
                  border:
                    '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '9px',
                  background:
                    'rgba(255,255,255,0.035)',
                  color:
                    'rgba(255,255,255,0.45)',
                  fontSize: '10px',
                  lineHeight: 1.45,
                }}
              >
                {knowledgeError}
              </div>
            )}

            <div className="memory-list">
              {knowledgeFiles.length === 0 ? (
                <div className="memory-empty">
                  <div className="memory-empty-icon">
                    <FileText size={16} />
                  </div>

                  <strong>
                    No knowledge yet
                  </strong>

                  <span>
                    Upload files and Aevyron
                    will build your personal
                    knowledge space.
                  </span>
                </div>
              ) : (
                knowledgeFiles.map(
                  (file) => (
                    <div
                      className="memory-item"
                      key={file.id}
                    >
                      <div className="memory-item-icon">
                        <FileText
                          size={14}
                        />
                      </div>

                      <div className="memory-item-content">
                        <span
                          title={file.file_name}
                        >
                          {file.file_name}
                        </span>

                        <small>
                          {formatFileType(
                            file.file_type,
                          )}{' '}
                          ·{' '}
                          {formatFileSize(
                            file.file_size,
                          )}
                        </small>
                      </div>

                      <button
                        className="memory-delete"
                        onClick={() =>
                          handleDeleteKnowledgeFile(
                            file,
                          )
                        }
                        disabled={
                          deletingFileId ===
                          file.id
                        }
                        aria-label={`Delete ${file.file_name}`}
                        title="Delete file"
                      >
                        {deletingFileId ===
                        file.id ? (
                          <span
                            style={{
                              fontSize: '9px',
                            }}
                          >
                            …
                          </span>
                        ) : (
                          <X size={13} />
                        )}
                      </button>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        ) : (
          <div className="conversation-section">
            <div className="insights-panel">
              <div className="insights-header">
                <div className="insights-header-copy">
                  <h3 className="insights-header-title">
                    Personal intelligence
                  </h3>

                  <p className="insights-header-subtitle">
                    Patterns Aevyron has noticed
                    over time.
                  </p>
                </div>

                <span className="memory-count">
                  {insights.length}
                </span>
              </div>

              {insightsError && (
                <div className="insights-error">
                  {insightsError}
                </div>
              )}

              {insightsLoading ? (
                <div className="insights-empty">
                  <div className="insights-empty-icon">
                    <Gauge size={16} />
                  </div>

                  <strong>
                    Reading your patterns
                  </strong>

                  <span>
                    Aevyron is loading your
                    personal insights.
                  </span>
                </div>
              ) : insights.length === 0 ? (
                <div className="insights-empty">
                  <div className="insights-empty-icon">
                    <Gauge size={16} />
                  </div>

                  <strong>
                    Insights are building
                  </strong>

                  <span>
                    As Aevyron learns from
                    meaningful conversations,
                    useful patterns and
                    observations will appear
                    here.
                  </span>
                </div>
              ) : (
                insights.map((insight) => (
                  <article
                    className="insight-item"
                    key={insight.id}
                  >
                    <div className="insight-item-top">
                      <div className="insight-item-main">
                        <h4 className="insight-item-title">
                          {insight.title}
                        </h4>

                        <p className="insight-item-text">
                          {insight.insight}
                        </p>

                        <div className="insight-item-meta">
                          <span className="insight-category">
                            {formatInsightCategory(
                              insight.category,
                            )}
                          </span>

                          <span className="insight-confidence">
                            {formatConfidence(
                              insight.confidence,
                            )}{' '}
                            confidence
                          </span>
                        </div>
                      </div>

                      <button
                        className="insight-delete"
                        onClick={() =>
                          handleDeleteInsight(
                            insight,
                          )
                        }
                        disabled={
                          deletingInsightId ===
                          insight.id
                        }
                        aria-label="Delete insight"
                        title="Delete insight"
                      >
                        {deletingInsightId ===
                        insight.id ? (
                          <span
                            style={{
                              fontSize: '9px',
                            }}
                          >
                            …
                          </span>
                        ) : (
                          <X size={13} />
                        )}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        <div className="sidebar-bottom">
          <button className="sidebar-item">
            <Settings size={17} />
            <span>Settings</span>
          </button>

          <div className="sidebar-profile">
            <div className="profile-avatar">
              <CircleUserRound size={18} />
            </div>

            <div className="profile-info">
              <strong>Your profile</strong>
              <span>
                Personal workspace
              </span>
            </div>

            <button
              className={`profile-signout ${
                signingOut
                  ? 'signing-out'
                  : ''
              }`}
              onClick={onSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default WorkspaceSidebar