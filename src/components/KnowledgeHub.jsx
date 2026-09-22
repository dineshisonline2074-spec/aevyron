import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileText,
  FileType2,
  FileUp,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import './KnowledgeHub.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_TYPES = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  if (!value) return 'Unknown date'

  const date = new Date(value)

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getFileLabel(fileType) {
  return ALLOWED_TYPES[fileType] || 'FILE'
}

function KnowledgeHub({
  onClose,
  onAskAboutFile,
  onAskAboutAll,
}) {
  const fileInputRef = useRef(null)

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const loadFiles = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      if (!user) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const { data, error: queryError } = await supabase
        .from('knowledge_files')
        .select(
          'id, file_name, file_type, file_size, storage_path, created_at',
        )
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        })

      if (queryError) throw queryError

      const fileIds = (data || []).map((file) => file.id)

      let indexMap = {}

      if (fileIds.length > 0) {
        const { data: indexFiles, error: indexError } = await supabase
          .from('knowledge_index_files')
          .select(
            'knowledge_file_id, status, last_error',
          )
          .eq('user_id', user.id)
          .in('knowledge_file_id', fileIds)

        if (indexError) {
          console.error(
            'Failed to load knowledge index status:',
            indexError,
          )
        } else {
          indexMap = Object.fromEntries(
            (indexFiles || []).map((item) => [
              item.knowledge_file_id,
              item,
            ]),
          )
        }
      }

      setFiles(
        (data || []).map((file) => ({
          ...file,
          indexStatus:
            indexMap[file.id]?.status || 'not_indexed',
          indexError:
            indexMap[file.id]?.last_error || '',
        })),
      )
    } catch (loadError) {
      console.error('Failed to load knowledge files:', loadError)
      setError(
        loadError?.message || 'Unable to load your knowledge files.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadFiles()

    const handleKnowledgeUpdated = () => {
      loadFiles(true)
    }

    window.addEventListener(
      'aevyron-knowledge-updated',
      handleKnowledgeUpdated,
    )

    return () => {
      window.removeEventListener(
        'aevyron-knowledge-updated',
        handleKnowledgeUpdated,
      )
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return files

    return files.filter((file) =>
      file.file_name?.toLowerCase().includes(query),
    )
  }, [files, search])

  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + Number(file.file_size || 0), 0),
    [files],
  )

  const processFile = async (file) => {
    if (!file) return

    setError('')
    setSuccess('')

    if (!ALLOWED_TYPES[file.type]) {
      setError('Supported files are PDF, TXT, MD and DOCX.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('That file is larger than the 10 MB limit.')
      return
    }

    setUploading(true)

    let uploadedMetadata = null

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      if (!user) {
        throw new Error('You must be signed in to upload knowledge.')
      }

      const safeFileName =
        file.name
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/-+/g, '-') || 'knowledge-file'

      const storagePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from('knowledge')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      const { data: metadata, error: metadataError } = await supabase
        .from('knowledge_files')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
        })
        .select(
          'id, file_name, file_type, file_size, storage_path, created_at',
        )
        .single()

      if (metadataError) {
        await supabase.storage
          .from('knowledge')
          .remove([storagePath])

        throw metadataError
      }

      uploadedMetadata = metadata

      const { data: indexResult, error: indexError } =
        await supabase.functions.invoke('aevyron-chat', {
          body: {
            action: 'index_knowledge_file',
            knowledge_file_id: metadata.id,
          },
        })

      if (indexError) throw indexError

      if (indexResult?.error) {
        throw new Error(indexResult.error)
      }

      setFiles((current) => [
        {
          ...metadata,
          indexStatus: 'completed',
          indexError: '',
        },
        ...current,
      ])

      setSuccess(
        `${file.name} is uploaded and ready for Aevyron.`,
      )

      window.dispatchEvent(
        new CustomEvent('aevyron-knowledge-updated'),
      )
    } catch (uploadError) {
      console.error('Knowledge upload failed:', uploadError)

      if (uploadedMetadata?.id) {
        try {
          await supabase
            .from('knowledge_files')
            .delete()
            .eq('id', uploadedMetadata.id)
        } catch (cleanupError) {
          console.error(
            'Failed to clean up knowledge metadata:',
            cleanupError,
          )
        }

        try {
          await supabase.storage
            .from('knowledge')
            .remove([uploadedMetadata.storage_path])
        } catch (cleanupError) {
          console.error(
            'Failed to clean up knowledge storage:',
            cleanupError,
          )
        }
      }

      setError(
        uploadError?.message || 'Something went wrong while uploading.',
      )
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    await processFile(file)
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setDragging(false)

    const file = event.dataTransfer.files?.[0]

    if (file) {
      await processFile(file)
    }
  }

  const handleDelete = async (file) => {
    if (!file || deletingId) return

    const confirmed = window.confirm(
      `Remove "${file.file_name}" from your knowledge?`,
    )

    if (!confirmed) return

    setDeletingId(file.id)
    setError('')
    setSuccess('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      if (!user) {
        throw new Error('You must be signed in.')
      }

      const { data: deleteResult, error: indexDeleteError } =
        await supabase.functions.invoke('aevyron-chat', {
          body: {
            action: 'delete_knowledge_file',
            knowledge_file_id: file.id,
          },
        })

      if (indexDeleteError) throw indexDeleteError

      if (deleteResult?.error) {
        throw new Error(deleteResult.error)
      }

      const { error: storageError } = await supabase.storage
        .from('knowledge')
        .remove([file.storage_path])

      if (storageError) throw storageError

      const { error: databaseError } = await supabase
        .from('knowledge_files')
        .delete()
        .eq('id', file.id)
        .eq('user_id', user.id)

      if (databaseError) throw databaseError

      setFiles((current) =>
        current.filter((item) => item.id !== file.id),
      )

      setSuccess(`${file.file_name} was removed.`)

      window.dispatchEvent(
        new CustomEvent('aevyron-knowledge-updated'),
      )
    } catch (deleteError) {
      console.error('Knowledge deletion failed:', deleteError)
      setError(
        deleteError?.message || 'Could not remove this file.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="knowledge-hub-shell" role="dialog" aria-modal="true">
      <button
        className="knowledge-hub-backdrop"
        type="button"
        onClick={onClose}
        aria-label="Close knowledge hub"
      />

      <section className="knowledge-hub">
        <header className="knowledge-hub-header">
          <div className="knowledge-hub-heading">
            <div className="knowledge-hub-eyebrow">
              <span className="knowledge-hub-live-dot" />
              PRIVATE KNOWLEDGE
            </div>

            <h1>Your knowledge space</h1>

            <p>
              Give Aevyron documents it can use as context when you ask
              questions, summarize material, or explore your own information.
            </p>
          </div>

          <button
            className="knowledge-hub-close"
            type="button"
            onClick={onClose}
            aria-label="Close knowledge hub"
          >
            <X size={18} />
          </button>
        </header>

        <div className="knowledge-hub-body">
          <section
            className={`knowledge-dropzone ${
              dragging ? 'dragging' : ''
            } ${uploading ? 'uploading' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) {
                setDragging(false)
              }
            }}
            onDrop={handleDrop}
          >
            <div className="knowledge-drop-icon">
              {uploading ? (
                <LoaderCircle className="knowledge-spin" size={22} />
              ) : (
                <UploadCloud size={22} />
              )}
            </div>

            <div className="knowledge-drop-copy">
              <strong>
                {uploading
                  ? 'Adding to your knowledge…'
                  : 'Drop a document here'}
              </strong>

              <span>
                PDF, DOCX, TXT or MD · up to 10 MB per file
              </span>
            </div>

            <button
              className="knowledge-upload-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <FileUp size={15} />
              {uploading ? 'Uploading' : 'Choose file'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx"
              onChange={handleFileInput}
              hidden
            />
          </section>

          {(error || success) && (
            <div
              className={`knowledge-feedback ${
                error ? 'error' : 'success'
              }`}
              role={error ? 'alert' : 'status'}
            >
              {error ? (
                <AlertCircle size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>{error || success}</span>
            </div>
          )}

          <section className="knowledge-overview">
            <div className="knowledge-stat">
              <span>FILES</span>
              <strong>{files.length}</strong>
            </div>

            <div className="knowledge-stat">
              <span>STORED</span>
              <strong>{formatBytes(totalBytes)}</strong>
            </div>

            <div className="knowledge-stat">
              <span>FORMATS</span>
              <strong>4</strong>
            </div>

            <button
              className="knowledge-ask-all"
              type="button"
              onClick={onAskAboutAll}
              disabled={files.length === 0}
            >
              <Sparkles size={15} />
              Ask about all knowledge
            </button>
          </section>

          <section className="knowledge-library">
            <div className="knowledge-library-header">
              <div>
                <span className="knowledge-section-kicker">
                  LIBRARY
                </span>
                <h2>Your documents</h2>
              </div>

              <div className="knowledge-library-actions">
                <div className="knowledge-search">
                  <Search size={14} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search files"
                    aria-label="Search knowledge files"
                  />
                </div>

                <button
                  className="knowledge-refresh"
                  type="button"
                  onClick={() => loadFiles(true)}
                  disabled={refreshing || uploading}
                  aria-label="Refresh knowledge files"
                >
                  <LoaderCircle
                    size={15}
                    className={refreshing ? 'knowledge-spin' : ''}
                  />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="knowledge-file-skeletons">
                {[1, 2, 3].map((item) => (
                  <div className="knowledge-file-skeleton" key={item}>
                    <span />
                    <div>
                      <i />
                      <i />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="knowledge-empty">
                <div className="knowledge-empty-icon">
                  <BookOpen size={20} />
                </div>

                <strong>
                  {search ? 'No matching files' : 'Your library is empty'}
                </strong>

                <span>
                  {search
                    ? 'Try a different file name.'
                    : 'Upload your first document and Aevyron can use it as private context.'}
                </span>
              </div>
            ) : (
              <div className="knowledge-file-list">
                {filteredFiles.map((file) => (
                  <article className="knowledge-file-card" key={file.id}>
                    <div className="knowledge-file-icon">
                      <FileType2 size={19} />
                    </div>

                    <div className="knowledge-file-main">
                      <div className="knowledge-file-title-row">
                        <h3 title={file.file_name}>
                          {file.file_name}
                        </h3>

                        <span className="knowledge-file-type">
                          {getFileLabel(file.file_type)}
                        </span>
                      </div>

                      <div className="knowledge-file-meta">
                        <span>{formatBytes(file.file_size)}</span>
                        <span>•</span>
                        <span>Added {formatDate(file.created_at)}</span>
                      </div>

                      <div className="knowledge-file-status">
                        {file.indexStatus === 'in_progress' ? (
                          <>
                            <LoaderCircle
                              size={12}
                              className="knowledge-spin"
                            />
                            <span>Indexing for Aevyron</span>
                          </>
                        ) : file.indexStatus === 'failed' ? (
                          <>
                            <AlertCircle size={12} />
                            <span>Indexing failed</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Ready for Aevyron</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="knowledge-file-actions">
                      <button
                        className="knowledge-file-ask"
                        type="button"
                        onClick={() => onAskAboutFile?.(file)}
                      >
                        <Sparkles size={14} />
                        Ask
                      </button>

                      <button
                        className="knowledge-file-delete"
                        type="button"
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.id}
                        aria-label={`Delete ${file.file_name}`}
                        title="Delete file"
                      >
                        {deletingId === file.id ? (
                          <LoaderCircle
                            size={15}
                            className="knowledge-spin"
                          />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="knowledge-note">
            <div className="knowledge-note-icon">
              <FileText size={15} />
            </div>

            <div>
              <strong>How Aevyron uses this</strong>
              <span>
                Your uploaded files stay scoped to your account. When you
                chat, Aevyron can use the available knowledge files as
                document context. Deleting a file removes both its stored
                document and its knowledge record.
              </span>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default KnowledgeHub
