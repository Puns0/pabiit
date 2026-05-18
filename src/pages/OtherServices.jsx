import React from 'react'
import PasswordGate from '../components/PasswordGate'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'

const softwareDownloads = [
  { title: 'System Utilities Pack', status: '// COMING SOON' },
  { title: 'Network Analysis Tools', status: '// COMING SOON' },
]

const technicalGuides = [
  { title: 'OS Troubleshooting Manual', status: '// PENDING' },
  { title: 'Hardware Diagnostics Guide', status: '// PENDING' },
  { title: 'Boot Recovery Procedures', status: '// PENDING' },
  { title: 'System Optimization Handbook', status: '// PENDING' },
]

export default function OtherServices() {
  return (
    <PasswordGate domainName="Other Services">
      <PageTransition>
        <PageHeader title="Other Services" breadcrumb="DASHBOARD / OTHER SERVICES" />
        <main className="page-content">
          <p className="page-description">
            Software resources, download guides, and deep technical documentation on OS issues,
            hardware, troubleshooting, bottlenecking, boot problems, and system optimization.
          </p>

          <div className="section-divider">// SOFTWARE DOWNLOADS</div>
          <div className="panels-grid">
            {softwareDownloads.map((s) => (
              <div className="service-card" key={s.title} id={`dl-${s.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="service-card-title">{s.title}</div>
                <div className="service-card-status">{s.status}</div>
              </div>
            ))}
          </div>

          <div className="section-divider">// TECHNICAL GUIDES</div>
          <div className="panels-grid">
            {technicalGuides.map((s) => (
              <div className="service-card" key={s.title} id={`guide-${s.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="service-card-title">{s.title}</div>
                <div className="service-card-status">{s.status}</div>
              </div>
            ))}
          </div>
        </main>
      </PageTransition>
    </PasswordGate>
  )
}
