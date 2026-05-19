import React, { useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import Dashboard from './pages/Dashboard'
import Pabit from './pages/Pabit'
import CentralWing from './pages/CentralWing'
import WesternWing from './pages/WesternWing'
import GlobalWing from './pages/GlobalWing'
import Prawapted from './pages/Prawapted'
import CloudServices from './pages/CloudServices'
import OtherServices from './pages/OtherServices'
import Presentations from './pages/Presentations'
import Blogs from './pages/Blogs'
import LinuxFundamentals from './pages/blogs/LinuxFundamentals'
import DummyBlog from './pages/blogs/DummyBlog'
import About from './pages/About'

import prawaptedAudioUrl from './assets/Prawapted.mp3'

export default function App() {
  const location = useLocation()
  const audioRef = useRef(null)

  useEffect(() => {
    const playAudio = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error('Audio play error:', e));
      }
    };
    
    window.addEventListener('play-primary-audio', playAudio);
    return () => window.removeEventListener('play-primary-audio', playAudio);
  }, []);

  return (
    <>
      <audio ref={audioRef} src={prawaptedAudioUrl} preload="auto" />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pabit" element={<Pabit />} />
          <Route path="/central-wing" element={<CentralWing />} />
          <Route path="/western-wing" element={<WesternWing />} />
          <Route path="/global-wing" element={<GlobalWing />} />
          <Route path="/prawapted" element={<Prawapted />} />
          <Route path="/cloud-services" element={<CloudServices />} />
          <Route path="/other-services" element={<OtherServices />} />
          <Route path="/presentations" element={<Presentations />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/linux-fundamentals" element={<LinuxFundamentals />} />
          <Route path="/blogs/dummy-blog" element={<DummyBlog />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
