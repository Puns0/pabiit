import React from 'react'
import PasswordGate from '../components/PasswordGate'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'

const services = [
  { title: 'Cloud Storage', status: '// COMING SOON' },
  { title: 'VPS Hosting', status: '// COMING SOON' },
  { title: 'Website Hosting', status: '// COMING SOON' },
]

export default function CloudServices() {
  return (
    <PasswordGate domainName="Cloud Services">
      <PageTransition>
        <PageHeader title="Cloud Services" breadcrumb="DASHBOARD / CLOUD SERVICES" />
        <main className="page-content">
          <p className="page-description">
            Secure infrastructure services. Cloud storage, VPS hosting, and website hosting.
          </p>

          <div className="section-divider">// AVAILABLE SERVICES</div>
          <div className="panels-grid">
            {services.map((s) => (
              <div className="service-card" key={s.title} id={`service-${s.title.toLowerCase().replace(/\s+/g, '-')}`}>
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
