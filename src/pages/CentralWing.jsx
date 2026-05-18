import React from 'react'
import { useNavigate } from 'react-router-dom'
import PasswordGate from '../components/PasswordGate'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'

const subSections = [
  { title: 'Metro Routes', status: '// CLASSIFIED' },
  { title: 'Malls', status: '// PENDING DATA' },
  { title: 'Popular Areas / Places', status: '// CLASSIFIED' },
  { title: 'Familiar Addresses', status: '// CLASSIFIED' },
]

export default function CentralWing() {
  const navigate = useNavigate()

  return (
    <PasswordGate domainName="CENTRAL WING">
      <PageTransition>
        <PageHeader title="Central Wing" breadcrumb="DASHBOARD / CENTRAL WING" />
        <main className="page-content">
          <p className="page-description">
            Operations wing for central region of the city. Handles all information,
            monitoring, and other operations.
          </p>

          <div className="section-divider">// SUBSYSTEMS</div>
          <div className="panels-grid">
            {subSections.map((s) => (
              <div className="panel-card" key={s.title} id={`panel-${s.title.toLowerCase().replace(/[\s\/]+/g, '-')}`}>
                <div className="panel-card-title">{s.title}</div>
                <div className="panel-card-status">{s.status}</div>
              </div>
            ))}

            {/* PRAWAPTED reference card */}
            <div
              className="panel-card panel-card--link"
              onClick={() => navigate('/prawapted')}
              id="panel-prawapted-ref"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/prawapted')}
            >
              <div className="panel-card-title">PRAWAPTED</div>
              <div className="panel-card-status">→ ACCESS RESEARCH WING</div>
            </div>
          </div>
        </main>
      </PageTransition>
    </PasswordGate>
  )
}
