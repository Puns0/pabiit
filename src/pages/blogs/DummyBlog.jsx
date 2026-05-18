import React from 'react'
import PageHeader from '../../components/PageHeader'
import PageTransition from '../../components/PageTransition'

export default function DummyBlog() {
  return (
    <PageTransition>
      <PageHeader title="Classified Operation Alpha" breadcrumb="DASHBOARD / BLOGS / CLASSIFIED OPERATION ALPHA" />
      <main className="page-content">
        <div className="blog-card" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', cursor: 'default' }}>
          <article className="article-content" style={{ maxWidth: '100%' }}>
            <h1 style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '0.5rem' }}>Classified Operation Alpha</h1>
            
            <div className="blog-card-meta" style={{ marginBottom: '2.5rem', opacity: 0.8 }}>
              <span className="blog-card-date">2026-05-14</span>
              <span className="blog-card-tag">PENDING</span>
            </div>

            <h2>Operation Status: Awaiting Declassification</h2>
            <p>The details of this operation are currently classified. Content will be populated once authorization is granted by the Central Command Wing.</p>
            <p>Please check back later or contact your regional director for clearance requirements.</p>
          </article>
        </div>
      </main>
    </PageTransition>
  )
}
