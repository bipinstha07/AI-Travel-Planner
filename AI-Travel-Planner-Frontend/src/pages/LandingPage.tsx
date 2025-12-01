import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlanDestination from '../component/smaller-component/PlanDestination'
import HowItWorks from '../component/landing/HowItWorks'
import Pricing from '../component/landing/Pricing'
import FAQ from '../component/landing/FAQ'
import Footer from '../footer/Footer'

function LandingPage() {
  const [inputValue, setInputValue] = useState('')
  const navigate = useNavigate()

  // All 20 suggestions
  const allSuggestions = [
    'Plan a trip to Paris',
    'Weekend getaway ideas',
    'Budget-friendly destinations',
    'Adventure travel guide',
    'Solo travel destinations',
    'Family vacation planning',
    'Mountain hiking trails',
    'Cultural heritage sites',
    'Food and wine tours',
    'Tropical island escapes',
    'Wildlife safari adventures',
    'Ski resort recommendations',
    'Backpacking routes',
    'Desert places',
    'Mountains places to visit',
    'Luxury travel experiences',
    'Hidden gem locations',
    'Photography tour spots',
    'Sustainable travel options'
  ]

  // Function to randomly select 5 suggestions
  const getRandomSuggestions = () => {
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 5)
  }

  // Randomly select 5 suggestions on component mount
  const [suggestions, setSuggestions] = useState(() => getRandomSuggestions())

  const handleRefreshSuggestions = () => {
    setSuggestions(getRandomSuggestions())
  }

  const handleSearch = (query: string) => {
    if (!query.trim()) return
    navigate('/chat', { state: { initialMessage: query } })
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(inputValue)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center mt-20 mb-12 relative z-10 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium mb-6 animate-fade-in">
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</span>
            <span>AI-Powered Travel Planning</span>
          </div>
          <h1 className='text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-sm'>
            Plan Your <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-200 to-orange-100"> Travel</span>
          </h1>
          <p className='text-gray-200 text-xl max-w-2xl mx-auto font-light'>
            Your personal AI travel companion that plans, tracks, and organizes your perfect journey.
          </p>
        </div>

        <div className="w-full max-w-3xl px-4">
          <div className={`flex items-center gap-3 bg-white/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl px-5 py-4 transition-all duration-300 ease-in-out hover:shadow-orange-500/10 hover:scale-[1.01] w-full group focus-within:ring-2 focus-within:ring-orange-500/50`}>
            {/* Attachment icon */}
            <button className="p-2 text-gray-400 hover:text-orange-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            {/* Input */}
            <input
              className='flex-1 outline-none text-gray-800 placeholder:text-gray-400 text-lg bg-transparent font-medium'
              placeholder="Where do you want to go?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />

            {/* Voice and Send buttons */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
              <button 
                className='h-10 w-10 flex items-center justify-center rounded-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-orange-500/30 transform hover:scale-105' 
                aria-label='Send'
                onClick={() => handleSearch(inputValue)}
                disabled={!inputValue.trim()}
              >
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
                  <path d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'/>
                </svg>
              </button>
            </div>
          </div>

          {/* Suggestion Keywords */}
          <div className='flex flex-wrap gap-3 mt-8 mb-18 justify-center items-center max-w-4xl mx-auto'>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSearch(suggestion)}
                className='px-4 py-2 text-sm text-white/90 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-full transition-all duration-200 cursor-pointer backdrop-blur-sm'
              >
                {suggestion}
              </button>
            ))}
            <button
              onClick={handleRefreshSuggestions}
              className='px-3 py-2 text-sm text-orange-300 hover:text-orange-200 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-2 backdrop-blur-sm'
              aria-label='Refresh suggestions'
              title='Refresh suggestions'
            >
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='w-4 h-4'>
                <path d='M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3'/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <PlanDestination onDestinationClick={(city) => {
        handleSearch(`plan a trip to ${city}`)
      }} />
      
      {/* How It Works Section */}
      <div className="mt-20">
        <HowItWorks />
      </div>

      {/* Pricing Section */}
      <div className="mt-20">
        <Pricing />
      </div>

      {/* FAQ Section */}
      <div className="mt-10">
        <FAQ />
      </div>
      
      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}

export default LandingPage
