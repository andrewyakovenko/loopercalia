import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'unreachable'>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setBackendStatus('ok') : setBackendStatus('unreachable')))
      .catch(() => setBackendStatus('unreachable'))
  }, [])

  return (
    <main>
      <h1>loopercalia</h1>
      <p>smart gif loop generator</p>
      <p>backend: {backendStatus}</p>
    </main>
  )
}

export default App
