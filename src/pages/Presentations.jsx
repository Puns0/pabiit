import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'
import Footer from '../components/Footer'
import { presentations } from '../config/presentations'

/* Generate deterministic geometric shapes from an ID string */
function seedFromId(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function GeoThumbnail({ id }) {
  const seed = useMemo(() => seedFromId(id), [id])
  const colors = ['var(--primary)', 'var(--alert)', 'var(--success)', 'var(--text)']

  const shapes = useMemo(() => {
    const s = []
    for (let i = 0; i < 5; i++) {
      const v = (seed * (i + 1) * 7919) % 10000
      const x = (v % 80) + 5
      const y = ((v * 3) % 70) + 10
      const size = ((v * 7) % 40) + 15
      const colorIdx = (v + i) % colors.length
      const isCircle = (v + i) % 3 === 0
      const rotation = (v * 13) % 360

      s.push({
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        borderColor: colors[colorIdx],
        borderRadius: isCircle ? '50%' : '2px',
        transform: `rotate(${rotation}deg)`,
        opacity: 0.25 + (i * 0.1),
      })
    }
    return s
  }, [seed])

  return (
    <div className="presentation-thumb">
      {/* Diagonal accent line */}
      <div style={{
        position: 'absolute',
        width: '140%',
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${colors[seed % colors.length]}, transparent)`,
        top: '50%',
        left: '-20%',
        transform: `rotate(${(seed % 30) - 15}deg)`,
        opacity: 0.3,
      }} />
      {/* Geometric shapes */}
      {shapes.map((style, i) => (
        <div
          key={i}
          className="geo-shape"
          style={style}
        />
      ))}
      {/* Corner accent */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        width: '30px',
        height: '30px',
        borderRight: `1px solid ${colors[(seed + 2) % colors.length]}`,
        borderBottom: `1px solid ${colors[(seed + 2) % colors.length]}`,
        opacity: 0.4,
      }} />
    </div>
  )
}

export default function Presentations() {
  return (
    <PageTransition>
      <PageHeader title="Presentations" breadcrumb="DASHBOARD / PRESENTATIONS" />
      <main className="page-content">
        <p className="page-description">
          View presentations, get your own presentation
        </p>

        <div className="presentation-actions" style={{ marginBottom: '40px' }}>
          <Link to="/request-presentation" className="request-presentation-btn" style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'var(--primary)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
            borderRadius: 'var(--radius)',
            fontWeight: 'bold',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            + Get Your Own Presentation
          </Link>
        </div>

        <div className="section-divider">// BRIEFINGS</div>
        <div className="panels-grid">
          {presentations.map((p) => (
            <a
              key={p.id}
              href={p.link}
              className="presentation-card"
              id={`presentation-${p.id}`}
              target={p.link !== '#' ? '_blank' : undefined}
              rel={p.link !== '#' ? 'noopener noreferrer' : undefined}
            >
              <GeoThumbnail id={p.id} />
              <div className="presentation-card-body">
                <div className="presentation-card-title">{p.title}</div>
              </div>
            </a>
          ))}
        </div>
      </main>
      <Footer />
    </PageTransition>
  )
}
