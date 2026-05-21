import React, { useEffect } from 'react'
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
import RequestPresentation from './pages/RequestPresentation'
import RequestSuccess from './pages/RequestSuccess'
import Blogs from './pages/Blogs'
import LinuxFundamentals from './pages/blogs/LinuxFundamentals'
import DummyBlog from './pages/blogs/DummyBlog'
import About from './pages/About'

export default function App() {
  const location = useLocation()

  useEffect(() => {
    // Top level effects if any
  }, [])

  return (
    <>
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
          <Route path="/request-presentation" element={<RequestPresentation />} />
          <Route path="/request-success" element={<RequestSuccess />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/linux-fundamentals" element={<LinuxFundamentals />} />
          <Route path="/blogs/dummy-blog" element={<DummyBlog />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
