import React from 'react'

export default function PlaceholderPanel({ label = '// NO DATA' }) {
  return (
    <div className="placeholder-panel">
      <span className="placeholder-panel-label">{label}</span>
    </div>
  )
}
