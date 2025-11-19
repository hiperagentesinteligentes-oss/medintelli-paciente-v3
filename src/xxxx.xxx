import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Consultas from './pages/Consultas'
import Documentos from './pages/Documentos'
import Perfil from './pages/Perfil'
import ChatIAPaciente from './pages/ChatIAPaciente'

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ color: '#1a3f8b' }}>MedIntelli Paciente</h2>
        <nav style={{ display: 'flex', gap: 10 }}>
          <Link to="/">Home</Link>
          <Link to="/consultas">Consultas</Link>
          <Link to="/documentos">Documentos</Link>
          <Link to="/chat-ia">Chat IA</Link>
          <Link to="/perfil">Perfil</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/consultas" element={<Consultas />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/chat-ia" element={<ChatIAPaciente />} />
        <Route path="/perfil" element={<Perfil />} />
      </Routes>
    </div>
  )
}
