import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './header/Header'
import LandingPage from './pages/LandingPage'
import ChatPage from './pages/ChatPage'
import TestPage from './test/TestPage'
import FlightPage from './pages/FlightPage'
import LiveBackground from './component/background/LiveBackground'
import FeaturesPage from './pages/FeaturesPage'
import PricingPage from './pages/PricingPage'
import DestinationsPage from './pages/DestinationsPage'
import ReviewsPage from './pages/ReviewsPage'
import AboutPage from './pages/AboutPage'
import CareersPage from './pages/CareersPage'
import BlogPage from './pages/BlogPage'
import ContactPage from './pages/ContactPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import CookiePolicyPage from './pages/CookiePolicyPage'


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/test" element={<TestPage />} />
        <Route path="/flight" element={
          <LiveBackground fixed={true}>
            <Header />
            <FlightPage />
          </LiveBackground>
        } />
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
        <Route path="/features" element={
          <LiveBackground>
            <Header />
            <FeaturesPage />
          </LiveBackground>
        } />
        <Route path="/pricing" element={
          <LiveBackground>
            <Header />
            <PricingPage />
          </LiveBackground>
        } />
        <Route path="/destinations" element={
          <LiveBackground>
            <Header />
            <DestinationsPage />
          </LiveBackground>
        } />
        <Route path="/reviews" element={
          <LiveBackground>
            <Header />
            <ReviewsPage />
          </LiveBackground>
        } />
        <Route path="/about" element={
          <LiveBackground>
            <Header />
            <AboutPage />
          </LiveBackground>
        } />
        <Route path="/careers" element={
          <LiveBackground>
            <Header />
            <CareersPage />
          </LiveBackground>
        } />
        <Route path="/blog" element={
          <LiveBackground>
            <Header />
            <BlogPage />
          </LiveBackground>
        } />
        <Route path="/contact" element={
          <LiveBackground>
            <Header />
            <ContactPage />
          </LiveBackground>
        } />
        <Route path="/privacy" element={
          <LiveBackground>
            <Header />
            <PrivacyPolicyPage />
          </LiveBackground>
        } />
        <Route path="/terms" element={
          <LiveBackground>
            <Header />
            <TermsPage />
          </LiveBackground>
        } />
        <Route path="/cookies" element={
          <LiveBackground>
            <Header />
            <CookiePolicyPage />
          </LiveBackground>
        } />
      </Routes>
    </Router>
  )
}

export default App
