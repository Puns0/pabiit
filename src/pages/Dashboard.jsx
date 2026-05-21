import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import StatusBadge from '../components/StatusBadge'
import PageTransition from '../components/PageTransition'

import prawaptedAudioUrl from '../assets/Prawapted.mp3'
import blogAudioUrl from '../assets/blogaoe.mp3'

const primaryAudio = new Audio(prawaptedAudioUrl)
primaryAudio.preload = "auto"

const blogAudio = new Audio(blogAudioUrl)
blogAudio.preload = "auto"

const primaryDomains = [
  {
    name: 'PABIT',
    path: '/pabit',
    desc: 'Information integration technology for threat disruption and information control.',
    status: 'RESTRICTED',
  },
  {
    name: 'Central Wing',
    path: '/central-wing',
    desc: 'Operations wing for central region. Monitoring, intelligence, and field operations.',
    status: 'RESTRICTED',
  },
  {
    name: 'Western Wing',
    path: '/western-wing',
    desc: 'Operations wing for western region. Pattern analysis and information dominance.',
    status: 'RESTRICTED',
  },
  {
    name: 'Global Wing',
    path: '/global-wing',
    desc: 'Global operations wing. Cross-regional intelligence and coordinated threat response.',
    status: 'RESTRICTED',
  },
  {
    name: 'PRAWAPTED',
    path: '/prawapted',
    desc: 'Research and analysis wing. Advanced persistent threat assessment.',
    status: 'RESTRICTED',
  },
]

const secondaryDomains = [
  {
    name: 'Cloud Services',
    path: '/cloud-services',
    desc: 'Secure cloud storage, VPS hosting, and website infrastructure.',
    status: 'OPEN',
  },
  {
    name: 'Other Services',
    path: '/other-services',
    desc: 'Software resources, downloads, and deep technical documentation.',
    status: 'OPEN',
  },
  {
    name: 'Presentations',
    path: '/presentations',
    desc: 'Presentations.',
    status: 'OPEN',
  },
  {
    name: 'Blogs',
    path: '/blogs',
    desc: 'Writings on technology, software, and the systems that run the world.',
    status: 'OPEN',
  },
  {
    name: 'About Me',
    path: '/about',
    desc: 'Operator profile and background.',
    status: 'OPEN',
  },
  {
    name: 'Navigation',
    path: 'https://nav.pabit.in',
    desc: '↗ Go to nav.pabit.in/',
    status: 'OPEN',
    isExternal: true,
  },
]

function DomainCard({ domain, index, hideDesc, isPrimary }) {
  const navigate = useNavigate()

  const handleSelect = () => {
    if (domain.isExternal) {
      window.open(domain.path, '_blank', 'noopener,noreferrer')
      return
    }
    if (isPrimary) {
      primaryAudio.currentTime = 0
      primaryAudio.play().catch(e => console.error('Audio play error:', e))
    }
    if (domain.name === 'Blogs' || domain.name === 'Presentations') {
      blogAudio.currentTime = 0
      blogAudio.play().catch(e => console.error('Audio play error:', e))
    }
    navigate(domain.path)
  }

  return (
    <motion.div
      className="domain-card"
      onClick={handleSelect}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      id={`domain-card-${domain.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="domain-card-name">
        {domain.name}
        <span className="domain-card-chevron">→</span>
      </div>
      {!hideDesc && <div className="domain-card-desc">{domain.desc}</div>}
      <StatusBadge status={domain.status} />
    </motion.div>
  )
}

export default function Dashboard() {
  return (
    <PageTransition>
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="dashboard-logo">
            PABIT
            <span className="cursor-blink" />
          </div>
          <div className="system-status">
            <span className="status-dot" />
            SYSTEMS NOMINAL
          </div>
        </header>

        <main className="dashboard-content">
          <div className="section-label">// PRIMARY OPERATIONS</div>
          <div className="domain-grid">
            {primaryDomains.map((d, i) => (
              <DomainCard key={d.path} domain={d} index={i} hideDesc isPrimary />
            ))}
          </div>

          <div className="section-label">// SECONDARY INFRASTRUCTURE &amp; LOGS</div>
          <div className="domain-grid">
            {secondaryDomains.map((d, i) => (
              <DomainCard key={d.path} domain={d} index={primaryDomains.length + i} />
            ))}
          </div>
        </main>
      </div>
    </PageTransition>
  )
}
