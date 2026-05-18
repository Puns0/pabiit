import React from 'react'

export default function StatusBadge({ status }) {
  const isRestricted = status === 'RESTRICTED'
  return (
    <span className={`status-badge ${isRestricted ? 'status-badge--restricted' : 'status-badge--open'}`}>
      <span className="status-badge-dot" />
      {status}
    </span>
  )
}
