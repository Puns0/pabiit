import React from 'react'
import PasswordGate from '../components/PasswordGate'
import PageHeader from '../components/PageHeader'
import PlaceholderPanel from '../components/PlaceholderPanel'
import PageTransition from '../components/PageTransition'

export default function Prawapted() {
  return (
    <div className="legacy-theme">
      <PasswordGate domainName="PRAWAPTED">
        <PageTransition>
          <PageHeader title="PRAWAPTED" breadcrumb="DASHBOARD / PRAWAPTED" />
          <main className="page-content">
            <p className="page-description">
              Research and Analysis Wing for Advanced Persistent Threat to the Existence of Direction.
            </p>
            <div className="section-divider">// INTEL PANELS</div>
            <div className="panels-grid">
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
