import React from 'react'
import { Link } from 'react-router-dom'

export default function PageHeader({ title, breadcrumb }) {
  return (
    <header className="page-header">
      <Link to="/" className="page-header-back" id={`back-btn-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
        ← HOME
      </Link>
      <div className="page-header-info">
        <h1 className="page-header-title">{title}</h1>
        <span className="page-header-breadcrumb">{breadcrumb || `DASHBOARD / ${title}`}</span>
      </div>
    </header>
  )
}
