import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './component/Home'
import Header from './header/Header'
import TestPage from './test/TestPage'


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/test" element={<TestPage />} />
        <Route path="/" element={
          <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50">
            <Header />
            <Home />
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
