import React from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'
import Footer from '../components/Footer'

const posts = [
  {
    id: 'linux-fundamentals',
    title: 'Fundamentals of Linux: The Backbone of the Modern Digital World',
    date: '2026-05-13',
    tag: 'SYSTEMS',
    path: '/blogs/linux-fundamentals'
  }
]

export default function Blogs() {
  const navigate = useNavigate()

  return (
    <PageTransition>
      <PageHeader title="Blogs" breadcrumb="DASHBOARD / BLOGS" />
      <main className="page-content">
        <div className="panels-grid">
          {posts.map(post => (
            <div 
              key={post.id} 
              className="blog-card" 
              onClick={() => navigate(post.path)}
              style={{ cursor: 'pointer' }}
            >
              <div className="blog-card-meta">
                <span className="blog-card-date">{post.date}</span>
                <span className="blog-card-tag">{post.tag}</span>
              </div>
              <div className="blog-card-title">{post.title}</div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </PageTransition>
  )
}
