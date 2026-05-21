import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'

export default function RequestPresentation() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const form = e.target
    const formData = new FormData(form)

    try {
      const response = await fetch("https://formspree.io/f/mqejqpwl", {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })
      if (response.ok) {
        navigate('/request-success')
      } else {
        alert("There was an error submitting the form. Please try again.")
      }
    } catch (err) {
      alert("There was a network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageTransition>
      <PageHeader title="Request Presentation" breadcrumb="DASHBOARD / PRESENTATIONS / REQUEST" />
      <main className="page-content">
        <p className="page-description">
          Submit a request for a custom presentation. Fill out the form below with your requirements.
        </p>
        
        <div className="section-divider">// REQUEST FORM</div>
        
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '30px',
          maxWidth: '800px',
          marginTop: '20px'
        }}>
          <form 
            onSubmit={handleSubmit}
            className="password-gate-form" 
            style={{ maxWidth: '100%', alignItems: 'flex-start' }}
          >
            <div style={{ width: '100%', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>FULL NAME</label>
              <input type="text" name="name" className="password-gate-input" placeholder="Your Name" required />
            </div>

            <div style={{ width: '100%', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>CONTACT INFO (PHONE / EMAIL)</label>
              <input type="text" name="contact" className="password-gate-input" placeholder="Phone or Email" required />
            </div>

            <div style={{ width: '100%', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>DUE DATE</label>
              <input type="date" name="due_date" className="password-gate-input" required style={{ colorScheme: 'dark' }} />
            </div>

            <div style={{ width: '100%', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>TOPIC</label>
              <input type="text" name="topic" className="password-gate-input" placeholder="Presentation Topic" required />
            </div>

            <div style={{ width: '100%', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>EXPLANATION OF TOPIC</label>
              <textarea name="explanation" className="password-gate-input" placeholder="Brief explanation..." rows="4" required style={{ resize: 'vertical' }}></textarea>
            </div>

            <div style={{ width: '100%', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>RELATED DOCUMENTATION (LINKS)</label>
              <textarea name="documentation_links" className="password-gate-input" placeholder="Any links or references..." rows="3"></textarea>
            </div>

            <div style={{ width: '100%', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>ADDITIONAL NOTES / REQUIREMENTS</label>
              <textarea name="notes" className="password-gate-input" placeholder="Any other requirements..." rows="3"></textarea>
            </div>

            <button type="submit" className="password-gate-btn" style={{ marginTop: '10px' }} disabled={submitting}>
              {submitting ? 'SUBMITTING...' : 'SUBMIT REQUEST'}
            </button>
          </form>
        </div>
      </main>
    </PageTransition>
  )
}
