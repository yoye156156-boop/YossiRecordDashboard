import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import RecordingsPage from './pages/Recordings.jsx'
import SettingsPage from './pages/Settings.jsx'
import AboutPage from './pages/About.jsx'

function Nav() {
  const linkClass = ({isActive}) =>
    `px-3 py-2 rounded-xl transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`
  return (
    <nav dir="rtl" className="bg-white/70 backdrop-blur sticky top-0 z-10 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        <div className="font-extrabold text-slate-900">🎵 ארכיון</div>
        <div className="ms-auto flex gap-1">
          <NavLink to="/" className={linkClass} end>הקלטות</NavLink>
          <NavLink to="/settings" className={linkClass}>הגדרות</NavLink>
          <NavLink to="/about" className={linkClass}>אודות</NavLink>
        </div>
      </div>
    </nav>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <Nav/>
      <Routes>
        <Route path="/" element={<RecordingsPage/>} />
        <Route path="/settings" element={<SettingsPage/>} />
        <Route path="/about" element={<AboutPage/>} />
      </Routes>
    </BrowserRouter>
  )
}
