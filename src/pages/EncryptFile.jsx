import React, { useState, useRef, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'
import Footer from '../components/Footer'

const MAGIC = new Uint8Array([0x50, 0x41, 0x42, 0x49, 0x54, 0x45, 0x4E, 0x43]) // "PABITENC"

async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function hasMagic(buffer) {
  const view = new Uint8Array(buffer, 0, 8)
  return MAGIC.every((b, i) => b === view[i])
}

async function encryptFile(file, password) {
  const data = new Uint8Array(await file.arrayBuffer())
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const result = new Uint8Array(MAGIC.length + salt.length + iv.length + cipher.byteLength)
  result.set(MAGIC, 0)
  result.set(salt, MAGIC.length)
  result.set(iv, MAGIC.length + salt.length)
  result.set(new Uint8Array(cipher), MAGIC.length + salt.length + iv.length)
  return result
}

async function decryptFile(file, password) {
  const data = new Uint8Array(await file.arrayBuffer())
  const salt = data.slice(MAGIC.length, MAGIC.length + 16)
  const iv = data.slice(MAGIC.length + 16, MAGIC.length + 16 + 12)
  const cipher = data.slice(MAGIC.length + 16 + 12)
  const key = await deriveKey(password, salt)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return new Uint8Array(plain)
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function EncryptFile() {
  const [file, setFile] = useState(null)
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null) // { type: 'success' | 'error' | 'info', msg }
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [resultBlob, setResultBlob] = useState(null)
  const [resultName, setResultName] = useState('')
  const inputRef = useRef()

  const handleFile = useCallback((f) => {
    if (!f) return
    setFile(f)
    setStatus(null)
    setResultBlob(null)
    setResultName('')
    const reader = new FileReader()
    reader.onload = () => {
      const encrypted = reader.result.byteLength >= 8 && hasMagic(reader.result)
      setIsEncrypted(encrypted)
      setStatus({
        type: 'info',
        msg: encrypted
          ? `ENCRYPTED FILE DETECTED — ${f.name} (${formatBytes(f.size)})`
          : `FILE READY — ${f.name} (${formatBytes(f.size)})`,
      })
    }
    reader.readAsArrayBuffer(f)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer?.files?.[0]
    handleFile(f)
  }, [handleFile])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setDragOver(false), [])

  const onBrowse = () => inputRef.current?.click()

  const onFileInput = (e) => {
    const f = e.target.files?.[0]
    handleFile(f)
  }

  const handleProcess = async () => {
    if (!file) {
      setStatus({ type: 'error', msg: 'NO FILE SELECTED' })
      return
    }
    if (!password) {
      setStatus({ type: 'error', msg: 'PASSWORD REQUIRED' })
      return
    }
    setProcessing(true)
    setStatus({ type: 'info', msg: isEncrypted ? 'DECRYPTING...' : 'ENCRYPTING...' })
    try {
      if (isEncrypted) {
        const plain = await decryptFile(file, password)
        const originalName = file.name.replace(/\.enc$/, '')
        const blob = new Blob([plain])
        setResultBlob(blob)
        setResultName(originalName)
        setStatus({ type: 'success', msg: `DECRYPTION COMPLETE — ${originalName} (${formatBytes(plain.byteLength)})` })
      } else {
        const cipher = await encryptFile(file, password)
        const encName = file.name + '.enc'
        const blob = new Blob([cipher])
        setResultBlob(blob)
        setResultName(encName)
        setStatus({ type: 'success', msg: `ENCRYPTION COMPLETE — ${encName} (${formatBytes(cipher.byteLength)})` })
      }
    } catch (err) {
      console.error(err)
      if (isEncrypted) {
        setStatus({ type: 'error', msg: 'DECRYPTION FAILED — WRONG PASSWORD OR CORRUPTED FILE' })
      } else {
        setStatus({ type: 'error', msg: 'ENCRYPTION FAILED — ' + (err.message || 'UNKNOWN ERROR') })
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = resultName
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setFile(null)
    setIsEncrypted(false)
    setPassword('')
    setStatus(null)
    setProcessing(false)
    setResultBlob(null)
    setResultName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <PageTransition>
      <PageHeader title="Encrypt File" breadcrumb="DASHBOARD / ENCRYPT FILE" />
      <main className="page-content">
        <p className="page-description">
          Encrypt or decrypt any file using AES-256-GCM with a password.
          Everything runs entirely in your browser — no data leaves your machine.
        </p>

        <div className="encrypt-container">
          {/* Drop Zone */}
          <div
            className={`encrypt-dropzone${dragOver ? ' encrypt-dropzone--active' : ''}${file ? ' encrypt-dropzone--has-file' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={onBrowse}
            id="encrypt-dropzone"
          >
            <input
              ref={inputRef}
              type="file"
              onChange={onFileInput}
              style={{ display: 'none' }}
              id="encrypt-file-input"
            />
            <div className="encrypt-dropzone-icon">
              {file ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  {isEncrypted && <rect x="8" y="12" width="8" height="6" rx="1" />}
                  {isEncrypted && <path d="M10 12V10a2 2 0 0 1 4 0v2" />}
                </svg>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </div>
            <div className="encrypt-dropzone-text">
              {file ? file.name : 'Drop file here or click to browse'}
            </div>
            <div className="encrypt-dropzone-hint">
              {file
                ? (isEncrypted ? '// ENCRYPTED — WILL DECRYPT' : '// PLAINTEXT — WILL ENCRYPT')
                : '// ANY FILE TYPE SUPPORTED'
              }
            </div>
          </div>

          {/* Controls */}
          <div className="encrypt-controls">
            <div className="encrypt-password-wrap">
              <label className="encrypt-label" htmlFor="encrypt-password">// PASSWORD</label>
              <input
                id="encrypt-password"
                type="password"
                className="password-gate-input"
                placeholder="ENTER PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
                autoComplete="off"
              />
            </div>

            <div className="encrypt-actions">
              <button
                className={`encrypt-btn encrypt-btn--primary${processing ? ' encrypt-btn--processing' : ''}`}
                onClick={handleProcess}
                disabled={processing}
                id="encrypt-action-btn"
              >
                {processing
                  ? (isEncrypted ? 'DECRYPTING...' : 'ENCRYPTING...')
                  : (isEncrypted ? '⬇ DECRYPT' : '⬆ ENCRYPT')
                }
              </button>

              {resultBlob && (
                <button
                  className="encrypt-btn encrypt-btn--download"
                  onClick={handleDownload}
                  id="encrypt-download-btn"
                >
                  ↓ DOWNLOAD {resultName}
                </button>
              )}

              {file && (
                <button
                  className="encrypt-btn encrypt-btn--reset"
                  onClick={handleReset}
                  id="encrypt-reset-btn"
                >
                  ✕ RESET
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          {status && (
            <div className={`encrypt-status encrypt-status--${status.type}`} id="encrypt-status">
              <span className="encrypt-status-dot" />
              {status.msg}
            </div>
          )}

          {/* Info */}
          <div className="encrypt-info">
            <div className="encrypt-info-title">// PROTOCOL DETAILS</div>
            <div className="encrypt-info-grid">
              <div className="encrypt-info-item">
                <span className="encrypt-info-key">Algorithm</span>
                <span className="encrypt-info-val">AES-256-GCM</span>
              </div>
              <div className="encrypt-info-item">
                <span className="encrypt-info-key">Key Derivation</span>
                <span className="encrypt-info-val">PBKDF2 · 100K iterations</span>
              </div>
              <div className="encrypt-info-item">
                <span className="encrypt-info-key">Hash</span>
                <span className="encrypt-info-val">SHA-256</span>
              </div>
              <div className="encrypt-info-item">
                <span className="encrypt-info-key">Processing</span>
                <span className="encrypt-info-val">Client-side only</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </PageTransition>
  )
}
