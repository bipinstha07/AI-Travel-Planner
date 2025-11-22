import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './header/Header'
import LandingPage from './pages/LandingPage'
import ChatPage from './pages/ChatPage'
import TestPage from './test/TestPage'
import LiveBackground from './component/background/LiveBackground'


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/test" element={<TestPage />} />
        <Route path="/" element={
          <LiveBackground>
            <Header />
            <LandingPage />
          </LiveBackground>
        } />
        <Route path="/chat" element={
          <LiveBackground fixed={true}>
            <Header />
            <ChatPage />
          </LiveBackground>
        } />
      </Routes>
    </Router>
  )
}

export default App
