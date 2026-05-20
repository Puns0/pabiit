import React from 'react'
import PasswordGate from '../components/PasswordGate'
import PageHeader from '../components/PageHeader'
import PlaceholderPanel from '../components/PlaceholderPanel'
import PageTransition from '../components/PageTransition'

export default function GlobalWing() {
  return (
    <div className="legacy-theme">
      <PasswordGate domainName="GLOBAL WING">
        <PageTransition>
          <PageHeader title="Global Wing" breadcrumb="DASHBOARD / GLOBAL WING" />
          <main className="page-content">
            <p className="page-description">
              Global operations wing. Handles cross-regional intelligence synthesis,
              international liaison channels, and coordinated threat response across
              all operational theatres.
            </p>
            <div className="section-divider">// INTEL PANELS</div>
            <div className="panels-grid">
              <PlaceholderPanel label="// NO DATA" />
              <PlaceholderPanel label="// NO DATA" />
              <PlaceholderPanel label="// NO DATA" />
              <PlaceholderPanel label="// NO DATA" />
            </div>
          </main>
        </PageTransition>
      </PasswordGate>
    </div>
  )
}
