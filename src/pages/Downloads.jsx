import React, { useState } from 'react'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'
import Footer from '../components/Footer'

const APK_HASH = '222df35adf7163f4381eee5d95f675853f881d25ce3e174b7d29b06f96dc37f9'

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Downloads() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const handleDownload = async (e) => {
    e.preventDefault()
    if (unlocked) return

    const hash = await hashPassword(password)
    if (hash === APK_HASH) {
      setUnlocked(true)
      setError('')
      const link = document.createElement('a')
      link.href = '/sharp-focus-pabit.apk'
      link.download = 'sharp-focus-pabit.apk'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      setError('ACCESS DENIED')
      setShaking(true)
      setPassword('')
      setTimeout(() => setShaking(false), 400)
      setTimeout(() => setError(''), 2000)
    }
  }

  return (
    <PageTransition>
      <PageHeader title="Downloads" breadcrumb="DASHBOARD / DOWNLOADS" />
      <main className="page-content">
        <p className="page-description">
          Downloadable system configurations, assets, and JSON data files.
        </p>

        <div className="section-divider">// AVAILABLE DOWNLOADS</div>
        <div className="panels-grid">
          
          <div className="service-card" id="dl-sharp-focus">
            <div className="service-card-title">Sharp Focus APK</div>
            <div className="service-card-status" style={{ opacity: 1, marginTop: '8px' }}>
              {!unlocked ? (
                <form onSubmit={handleDownload} style={{ marginTop: '10px' }}>
                  <input
                    type="password"
                    className={`password-gate-input ${shaking ? 'shake' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ENTER PASSKEY"
                    style={{ width: '100%', marginBottom: '10px', fontSize: '0.9rem', padding: '8px', boxSizing: 'border-box' }}
                  />
                  <button
                    type="submit"
                    className="password-gate-btn"
                    style={{ width: '100%', display: 'block', textAlign: 'center', boxSizing: 'border-box' }}
                  >
                    UNLOCK & DOWNLOAD
                  </button>
                  {error && <div className="password-gate-error" style={{ marginTop: '5px', fontSize: '0.8rem' }}>{error}</div>}
                </form>
              ) : (
                <a
                  href="/sharp-focus-pabit.apk"
                  download="sharp-focus-pabit.apk"
                  className="password-gate-btn"
                  style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    marginTop: '10px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  DOWNLOAD AGAIN
                </a>
              )}
            </div>
          </div>

          <div className="service-card" id="dl-indoornavmap-ece">
            <div className="service-card-title">ECE Map Demo</div>
            <div className="service-card-status" style={{ opacity: 1, marginTop: '8px' }}>
              <a
                href="/indoor_nav_map_ece.json"
                download="indoor_nav_map_ece.json"
                className="password-gate-btn"
                style={{
                  display: 'inline-block',
                  textAlign: 'center',
                  textDecoration: 'none',
                  marginTop: '10px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                id="btn-download-indoornavmap-ece"
              >
                DOWNLOAD
              </a>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </PageTransition>
  )
}
