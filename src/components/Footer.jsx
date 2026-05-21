import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Footer() {
  const operations = [
    { name: 'PABIT', path: '/pabit' },
    { name: 'Central Wing', path: '/central-wing' },
    { name: 'Western Wing', path: '/western-wing' },
    { name: 'Global Wing', path: '/global-wing' },
    { name: 'PRAWAPTED', path: '/prawapted' },
    { name: 'Cloud Services', path: '/cloud-services' },
    { name: 'Other Services', path: '/other-services' },
    { name: 'Presentations', path: '/presentations' },
    { name: 'Blogs', path: '/blogs' },
    { name: 'About Me', path: '/about' },
    { name: 'Get Your Own Presentation', path: '/request-presentation' },
  ]

  return (
    <footer className="dashboard-footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-title">// OPERATOR DETAILS</div>
          <div className="footer-contact" style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '8px 24px' }}>
            <p><strong>Name:</strong> Puneet Gangur</p>
            <p><strong>Email:</strong> <a href="mailto:puneet.gangur@gmail.com" style={{ textDecoration: 'none', color: 'var(--success)' }}>puneet.gangur@gmail.com</a></p>
            <p><strong>Phone:</strong> +91 7019294304</p>
            <p><strong>Insta:</strong> <a href="https://instagram.com/puns0_" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--primary)' }}>@puns0_</a></p>
          </div>
        </div>

        <div className="footer-section">
          <div className="footer-title">// OPERATIONS DIRECTORY</div>
          <div className="footer-links">
            {operations.map(op => (
              <Link key={op.path} to={op.path} className="footer-link">
                {op.name}
              </Link>
            ))}
          </div>
        </div>

      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} PABIT Cloud Services.</p>
      </div>
    </footer>
  )
}
