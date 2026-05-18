import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PROTECTED_HASH } from '../config/passwords'

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PasswordGate({ domainName, children }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const hash = await hashPassword(password)
    if (hash === PROTECTED_HASH) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('ACCESS DENIED')
      setShaking(true)
      setPassword('')
      setTimeout(() => {
        setShaking(false)
      }, 400)
      setTimeout(() => {
        setError('')
      }, 2000)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!authenticated ? (
        <motion.div
          key="gate"
          className="password-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          <div className="password-gate-domain" id={`gate-title-${domainName?.toLowerCase().replace(/\s+/g, '-')}`}>
            {domainName}
          </div>
          <div className="password-gate-label">// AUTHENTICATION REQUIRED</div>
          <form className="password-gate-form" onSubmit={handleSubmit}>
            <input
              type="password"
              className={`password-gate-input ${shaking ? 'shake' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER PASSKEY"
              autoFocus
              id={`gate-input-${domainName?.toLowerCase().replace(/\s+/g, '-')}`}
            />
            <button type="submit" className="password-gate-btn" id={`gate-confirm-${domainName?.toLowerCase().replace(/\s+/g, '-')}`}>
              CONFIRM
            </button>
            <div className="password-gate-error">{error}</div>
          </form>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
