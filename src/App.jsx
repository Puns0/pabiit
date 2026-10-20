import React, { useRef, useState } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import prawaptedAudioUrl from './assets/Prawapted.mp3'

/*
 * ──────────────────────────────────────────────
 *  TEMPORARY MAINTENANCE MODE
 *  Original App.jsx saved as App.original.jsx
 *  To restore: copy App.original.jsx → App.jsx
 * ──────────────────────────────────────────────
 */

export default function App() {
  const audioRef = useRef(null)
  const [entered, setEntered] = useState(false)

  const handleEnter = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(prawaptedAudioUrl)
    }
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {})
    setEntered(true)
  }

  return (
    <div className="maint-root">
      <LayoutGroup>
        <div className={`maint-layout ${entered ? 'maint-layout--entered' : ''}`}>
          {/* Brand row — always centered horizontally, vertical position driven by flex */}
          <div className={`brand-row ${entered ? 'brand-row--top' : 'brand-row--center'}`}>
            <motion.div
              className={`brand-text ${entered ? 'brand-text--small' : ''}`}
              layoutId="pabit-brand"
              layout
              transition={{ layout: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] } }}
            >
              PABIT
            </motion.div>
          </div>

          {/* Enter button (before entering) */}
          {!entered && (
            <motion.div
              className="enter-area"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.button
                className="enter-btn"
                onClick={handleEnter}
                whileHover={{ scale: 1.06, boxShadow: '0 0 40px rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.96 }}
              >
                Enter
              </motion.button>
            </motion.div>
          )}

          {/* Maintenance content (after entering) */}
          {entered && (
            <motion.div
              className="maint-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <h1 className="maint-title">UNDER MAINTENANCE</h1>
              <div className="maint-divider" />
              <p className="maint-message">
                Wings are still accessible at{' '}
                <span className="maint-link">wings.pabit.in</span>{' '}
                with PABIT VPN
              </p>
            </motion.div>
          )}
        </div>
      </LayoutGroup>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        .maint-root {
          position: fixed;
          inset: 0;
          background: linear-gradient(145deg, #1a0000 0%, #5c0a0a 35%, #8b1a1a 60%, #a02020 80%, #6b0e0e 100%);
          overflow: hidden;
          font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
        }

        .maint-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 30% 20%, rgba(255,80,80,0.08) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 80%, rgba(120,0,0,0.15) 0%, transparent 50%);
          pointer-events: none;
        }

        /* ─── Full-screen flex column ─── */
        .maint-layout {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1;
        }

        /* ─── Brand row ─── */
        .brand-row {
          width: 100%;
          display: flex;
          justify-content: center;
          transition: padding 0.9s cubic-bezier(0.25, 0.1, 0.25, 1);
        }

        .brand-row--center {
          flex: 1;
          align-items: center;
        }

        .brand-row--top {
          flex: 0;
          align-items: flex-start;
          padding-top: 44px;
        }

        /* ─── Brand text ─── */
        .brand-text {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          letter-spacing: 0.25em;
          color: rgba(255, 255, 255, 0.92);
          text-shadow: 0 0 60px rgba(255, 100, 100, 0.35),
                       0 0 120px rgba(255, 50, 50, 0.12);
          font-size: clamp(2.4rem, 7vw, 4.5rem);
          transition: font-size 0.9s cubic-bezier(0.25, 0.1, 0.25, 1);
        }

        .brand-text--small {
          font-size: clamp(1.1rem, 2.5vw, 1.6rem);
        }

        /* ═══════════════════════════
           ENTER AREA
           ═══════════════════════════ */
        .enter-area {
          display: flex;
          justify-content: center;
          flex: 1;
          align-items: flex-start;
          padding-top: 0;
        }

        .enter-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.35);
          color: rgba(255, 255, 255, 0.9);
          font-family: 'JetBrains Mono', monospace;
          font-size: 1rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          padding: 16px 56px;
          cursor: pointer;
          border-radius: 2px;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        .enter-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.55);
        }

        /* ═══════════════════════════
           MAINTENANCE BODY
           ═══════════════════════════ */
        .maint-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          text-align: center;
          padding: 40px;
        }

        .maint-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(1.4rem, 4vw, 2.4rem);
          font-weight: 500;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.6);
        }

        .maint-divider {
          width: 180px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          margin: 8px 0;
        }

        .maint-message {
          font-family: 'Inter', sans-serif;
          font-size: clamp(0.8rem, 1.5vw, 1rem);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 0.04em;
          line-height: 1.6;
          max-width: 500px;
        }

        .maint-link {
          color: rgba(255, 255, 255, 0.85);
          font-weight: 500;
          border-bottom: 1px solid rgba(255, 255, 255, 0.25);
          padding-bottom: 1px;
        }
      `}</style>
    </div>
  )
}
