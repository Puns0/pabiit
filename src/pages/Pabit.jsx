import React from 'react'
import PasswordGate from '../components/PasswordGate'
import PageHeader from '../components/PageHeader'
import PlaceholderPanel from '../components/PlaceholderPanel'
import PageTransition from '../components/PageTransition'

export default function Pabit() {
  return (
    <PasswordGate domainName="PABIT">
      <PageTransition>
        <PageHeader title="PABIT" breadcrumb="DASHBOARD / PABIT" />
        <main className="page-content">
          <p className="page-description">
            PABIT is an information integration technology, made with the sole purpose of
            fucking people up.
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
  )
}
