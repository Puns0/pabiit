import React from 'react'
import PageHeader from '../components/PageHeader'
import PageTransition from '../components/PageTransition'

export default function About() {
  const pStyle = {
    marginBottom: '1.5rem',
    lineHeight: '1.8',
    color: 'var(--text)',
    fontSize: '1.05rem'
  }

  const highlight = { color: 'var(--primary)', fontWeight: '600' }
  const successHighlight = { color: 'var(--success)', fontWeight: '600' }

  return (
    <PageTransition>
      <PageHeader title="About Me" breadcrumb="DASHBOARD / ABOUT" />
      <main className="page-content">
        <div className="about-content" style={{ maxWidth: '800px' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '2.2rem', textShadow: '0 0 10px rgba(var(--primary-rgb),0.3)' }}>
            Hey, I'm Puneet Gangur.
          </h2>
          
          <p className="page-description" style={pStyle}>
            I'm someone who has always been <span style={highlight}>fascinated by computers</span> — not just using them, but understanding them. The fact that humanity figured out how to take sand, turn it into silicon, and somehow build machines capable of running the modern world still blows my mind. That curiosity is probably what pulled me into technology in the first place.
          </p>

          <p className="page-description" style={pStyle}>
            I started learning HTML and CSS when I was 13, and since then, I've spent a ridiculous amount of time exploring how things work behind the scenes. <span style={successHighlight}>Linux, networking, cloud infrastructure, DNS, self-hosting, automation, reverse engineering, AI, cybersecurity</span> — if it powers the internet or makes systems work, I'm probably interested in it.
          </p>

          <p className="page-description" style={pStyle}>
            I'm completely <span style={highlight}>self-taught</span>. Most of what I know came from breaking things, fixing them, staying curious, and spending countless hours reading documentation and experimenting until things finally clicked.
          </p>

          <p className="page-description" style={{ ...pStyle, color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.15rem', borderLeft: '4px solid var(--primary)', paddingLeft: '16px', background: 'rgba(var(--primary-rgb),0.05)', padding: '10px 16px', borderRadius: '0 8px 8px 0' }}>
            I don't like blindly using technology. I like understanding it.
          </p>

          <p className="page-description" style={pStyle}>
            That mindset extends beyond computers too. I'm the kind of person who constantly asks <span style={successHighlight}>"how does this actually work?"</span> — whether it's the internet, businesses, economies, machines, geography, science, or the systems that keep the world running. I enjoy learning about countries, cultures, infrastructure, nature, and pretty much anything that expands my understanding of the world.
          </p>

          <p className="page-description" style={pStyle}>
            Outside tech, I'm heavily into <span style={highlight}>fitness, motorcycles, hiking, and mountains</span>. I like peace, quiet environments, and staying calm no matter what's happening around me. I genuinely believe being calm under pressure is a superpower.
          </p>

          <p className="page-description" style={pStyle}>
            I also game competitively and participate in tournaments whenever I can. At the same time, I enjoy building things — whether that's websites, systems, projects, businesses, or opportunities to make money. I do crypto, work part-time jobs, and generally try to <span style={successHighlight}>create value wherever possible</span>.
          </p>

          <p className="page-description" style={pStyle}>
            Over time, I've managed to win <span style={highlight}>3 hackathons and 1 buildathon</span>, which honestly just pushed me to keep learning more.
          </p>

          <p className="page-description" style={pStyle}>
            This website is basically my corner of the internet — a place where I share things related to technology, cloud, networking, Linux, cybersecurity, projects, experiments, and whatever else I find interesting enough to write about.
          </p>

          <p className="page-description" style={{ ...pStyle, color: 'var(--alert)', borderLeftColor: 'var(--alert)', background: 'rgba(var(--alert-rgb),0.05)', padding: '10px 16px', borderRadius: '0 8px 8px 0' }}>
            <strong>One small warning though:</strong> I have absolutely zero tolerance for people who lack civic sense.
          </p>

          <p className="page-description" style={{ ...pStyle, marginBottom: '3rem' }}>
            If you're someone who enjoys technology, curiosity, building things, or simply understanding how the world works beneath the surface, you'll probably like it here.
          </p>

          <div className="section-divider" style={{ color: 'var(--primary)' }}>// COMM LINKS</div>
          <div className="panels-grid">
            <a 
              href="https://instagram.com/puns0_" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="service-card" 
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: 'var(--primary)' }}
            >
              <div style={{ color: 'var(--primary)', fontSize: '2rem' }}>@</div>
              <div>
                <div className="service-card-title" style={{ color: 'var(--text)' }}>Instagram</div>
                <div className="service-card-status" style={{ color: 'var(--primary)' }}>@puns0_</div>
              </div>
            </a>
            
            <a 
              href="mailto:puneet.gangur@gmail.com" 
              className="service-card" 
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: 'var(--success)' }}
            >
              <div style={{ color: 'var(--success)', fontSize: '1.8rem' }}>✉</div>
              <div>
                <div className="service-card-title" style={{ color: 'var(--text)' }}>Email</div>
                <div className="service-card-status" style={{ color: 'var(--success)' }}>puneet.gangur@gmail.com</div>
              </div>
            </a>
            
            <a 
              href="tel:+917019294304" 
              className="service-card" 
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: 'var(--alert)' }}
            >
              <div style={{ color: 'var(--alert)', fontSize: '1.8rem' }}>☏</div>
              <div>
                <div className="service-card-title" style={{ color: 'var(--text)' }}>Phone</div>
                <div className="service-card-status" style={{ color: 'var(--alert)' }}>+91 7019294304</div>
              </div>
            </a>
          </div>
        </div>
      </main>
    </PageTransition>
  )
}
