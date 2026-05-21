import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'
import Footer from '../components/Footer'

export default function RequestSuccess() {
  return (
    <PageTransition>
      <PageHeader title="Request Submitted" breadcrumb="DASHBOARD / REQUEST / SUCCESS" />
      <main className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          style={{ 
            fontSize: '4rem', 
            color: 'var(--success)', 
            marginBottom: '20px' 
          }}
        >
          ✓
        </motion.div>

        <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', letterSpacing: '2px', textAlign: 'center', marginBottom: '20px' }}>
          TRANSMISSION SUCCESSFUL
        </h2>

        <p className="page-description" style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '600px', borderLeft: 'none', paddingLeft: 0 }}>
          Your request has been received and logged into the system. You will be contacted soon regarding your custom presentation.
        </p>

        <Link to="/" className="password-gate-btn" style={{ textDecoration: 'none' }}>
          RETURN TO DASHBOARD
        </Link>
      </main>
      <Footer />
    </PageTransition>
  )
}
