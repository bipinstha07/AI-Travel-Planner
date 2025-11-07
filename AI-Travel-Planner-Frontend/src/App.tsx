import { useEffect, useState } from 'react'
import Home from './component/Home'
import Header from './header/Header'
import Admin from './admin/Admin'

function App() {
  const [route, setRoute] = useState<string>(() => window.location.hash || '#/')

  useEffect(() => {
    const handler = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  return (
    <>
      <Header />
      {route === '#/admin' ? <Admin /> : <Home />}
     
    </>
  )
}

export default App
