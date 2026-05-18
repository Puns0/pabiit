import React from 'react'
import { useNavigate } from 'react-router-dom'
import PasswordGate from '../components/PasswordGate'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'

const subSections = [
  { title: 'Crucial Bus Stations', status: '// CLASSIFIED' },
  { title: 'Colleges', status: '// PENDING DATA' },
  { title: 'Frequent Points', status: '// CLASSIFIED' },
  { title: 'Preferred Route', status: '// CLASSIFIED' },
  { title: 'Metro Routes', status: '// PENDING DATA' },
  { title: 'Camera Systems', status: '// CLASSIFIED' },
  { title: 'ABIT', status: '// CLASSIFIED' },
  { title: 'Malls', status: '// PENDING DATA' },
  { title: 'Restaurants', status: '// PENDING DATA' },
  { title: 'Online Tracking', status: '// CLASSIFIED' },
]

export default function WesternWing() {
  const navigate = useNavigate()

  return (
    <PasswordGate domainName="WESTERN WING">
      <PageTransition>
        <PageHeader title="Western Wing" breadcrumb="DASHBOARD / WESTERN WING" />
        <main className="page-content">
          <p className="page-description">
            Operations wing for Western Region of the city. Handles all information,
            integrates them. Uses the same for better understanding of people and their
            patterns. Used to establish control over information. Operates under multiple
            agents, making it a flawless operations wing. Monitors the region thoroughly,
            learns patterns, and fetches extensive knowledge for having the upper hand in any given situation.
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
              id="panel-prawapted-ref-west"
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
