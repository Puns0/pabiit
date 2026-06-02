import React from 'react'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'
import Footer from '../components/Footer'

export default function Miscellaneous() {
  return (
    <PageTransition>
      <PageHeader title="Miscellaneous" breadcrumb="DASHBOARD / MISCELLANEOUS" />
      <main className="page-content">
        <p className="page-description">
          Downloadable system configurations, assets, and miscellaneous JSON data files.
        </p>


      </main>
      <Footer />
    </PageTransition>
  )
}
