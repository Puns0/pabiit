import React from 'react'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'
import Footer from '../components/Footer'

export default function Miscellaneous() {
  return (
    <PageTransition>
      <PageHeader title="Miscellaneous" breadcrumb="DASHBOARD / MISCELLANEOUS" />
      <main className="page-content">
        <p className="page-description">
          Downloadable system configurations, assets, and miscellaneous JSON data files.
        </p>

        <div className="section-divider">// AVAILABLE DOWNLOADS</div>
        <div className="panels-grid">
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
                  marginTop: '10px'
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
