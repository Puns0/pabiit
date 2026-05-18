import React from 'react'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'

export default function About() {
  return (
    <PageTransition>
      <PageHeader title="About Me" breadcrumb="DASHBOARD / ABOUT" />
      <main className="page-content">
        <div className="about-content" style={{ maxWidth: '800px' }}>
          <h2 style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', fontSize: '2rem' }}>Hey, I'm Puneet Gangur.</h2>
          
          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            I'm someone who has always been fascinated by computers — not just using them, but understanding them. The fact that humanity figured out how to take sand, turn it into silicon, and somehow build machines capable of running the modern world still blows my mind. That curiosity is probably what pulled me into technology in the first place.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            I started learning HTML and CSS when I was 13, and since then, I've spent a ridiculous amount of time exploring how things work behind the scenes. Linux, networking, cloud infrastructure, DNS, self-hosting, automation, reverse engineering, AI, cybersecurity — if it powers the internet or makes systems work, I'm probably interested in it.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            I'm completely self-taught. Most of what I know came from breaking things, fixing them, staying curious, and spending countless hours reading documentation and experimenting until things finally clicked.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8', color: 'var(--primary-color)', fontWeight: 'bold' }}>
            I don't like blindly using technology. I like understanding it.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            That mindset extends beyond computers too. I'm the kind of person who constantly asks "how does this actually work?" — whether it's the internet, businesses, economies, machines, geography, science, or the systems that keep the world running. I enjoy learning about countries, cultures, infrastructure, nature, and pretty much anything that expands my understanding of the world.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            Outside tech, I'm heavily into fitness, motorcycles, hiking, and mountains. I like peace, quiet environments, and staying calm no matter what's happening around me. I genuinely believe being calm under pressure is a superpower.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            I also game competitively and participate in tournaments whenever I can. At the same time, I enjoy building things — whether that's websites, systems, projects, businesses, or opportunities to make money. I do crypto, work part-time jobs, and generally try to create value wherever possible.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            Over time, I've managed to win 3 hackathons and 1 buildathon, which honestly just pushed me to keep learning more.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
            This website is basically my corner of the internet — a place where I share things related to technology, cloud, networking, Linux, cybersecurity, projects, experiments, and whatever else I find interesting enough to write about.
          </p>

          <p className="page-description" style={{ marginBottom: '1.5rem', lineHeight: '1.8', color: 'var(--accent-color)' }}>
            <strong>One small warning though:</strong> I have absolutely zero tolerance for people who lack civic sense.
          </p>

          <p className="page-description" style={{ marginBottom: '3rem', lineHeight: '1.8' }}>
            If you're someone who enjoys technology, curiosity, building things, or simply understanding how the world works beneath the surface, you'll probably like it here.
          </p>

          <div className="section-divider">// COMM LINKS</div>
          <div className="panels-grid">
            <a 
              href="https://instagram.com/puns0_" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="service-card" 
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
            >
              <div style={{ color: 'var(--primary-color)', fontSize: '2rem' }}>@</div>
              <div>
                <div className="service-card-title">Instagram</div>
                <div className="service-card-status">@puns0_</div>
              </div>
            </a>
            
            <a 
              href="mailto:puneet.gangur@gmail.com" 
              className="service-card" 
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
            >
              <div style={{ color: 'var(--secondary-color)', fontSize: '1.8rem' }}>✉</div>
              <div>
                <div className="service-card-title">Email</div>
                <div className="service-card-status" style={{ color: 'var(--secondary-color)' }}>puneet.gangur@gmail.com</div>
              </div>
            </a>
          </div>
        </div>
      </main>
    </PageTransition>
  )
}
