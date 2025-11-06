import { useState } from 'react'
import PlanDestination from './smaller-component/PlanDestination'
import Footer from '../footer/Footer'
function Home() {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  
  // All 20 suggestions
  const allSuggestions = [
    'Plan a trip to Paris',
    'Best beaches in Thailand',
    'Weekend getaway ideas',
    'Budget-friendly destinations',
    'Adventure travel guide',
    'Romantic honeymoon spots',
    'Solo travel destinations',
    'Family vacation planning',
    'Mountain hiking trails',
    'Cultural heritage sites',
    'Food and wine tours',
    'Tropical island escapes',
    'City breaks in Europe',
    'Wildlife safari adventures',
    'Ski resort recommendations',
    'Backpacking routes',
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

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const handleRefreshSuggestions = () => {
    setSuggestions(getRandomSuggestions())
  }

  const handleSubmit = async () => {
    console.log('Input Value:', inputValue)
    if (!inputValue.trim()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8008/api/v1/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: inputValue,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Response:', data)
      
      // Clear input after successful submission
      setInputValue('')
      setMessageSent(true)
    } catch (err) {
      // Use dummy response instead of showing error
      const dummyResponse = {
        id: Date.now(),
        query: inputValue,
        response: 'Thank you for your query! Our AI travel planner is processing your request and will provide you with personalized travel recommendations soon.',
        status: 'success'
      }
      console.log('Dummy Response:', dummyResponse)
      
      // Clear input after submission
      setInputValue('')
      setMessageSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    }
  }

  return (
    <>
    <div className='bg-white mt-60  flex flex-col items-center justify-center px-4'>
      {!messageSent && (
        <h1 className='text-2xl md:text-4xl text-gray-800 font-light mb-8 text-center'>
          Where are you planning to go?
        </h1>
      )}

      <div className='w-full  max-w-3xl'>
        <div className={`flex items-center gap-3 bg-white rounded-full border border-gray-200  shadow-md px-4 py-3 ${messageSent ? 'fixed bottom-10 left-1/2 transform -translate-x-1/2' : ''}`}>
          {/* Left: plus icon button */}
         

          {/* Input */}
          <input
            className='flex-1 outline-none text-gray-800 placeholder:text-gray-400 w-200'
            placeholder='Ask anything'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />

          

          {/* Wave icon in blue pill */}
          <button 
            className='h-9 w-9 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed' 
            aria-label='Send'
            onClick={handleSubmit}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' className='h-5 w-5 text-blue-700'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'/>
              </svg>
            )}
          </button>
        </div>

        {/* Suggestion Keywords */}
        {!messageSent && (
          <div className='flex flex-wrap gap-2 mt-4 justify-between items-center'>
            <div className='flex flex-wrap gap-2 justify-center flex-1'>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className='px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer'
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefreshSuggestions}
              className='px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer flex items-center gap-1 ml-4'
              aria-label='Refresh suggestions'
              title='Refresh suggestions'
            >
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='w-4 h-4'>
                <path d='M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3'/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>
    </div>
    {!messageSent && <PlanDestination />}

<div className={`${messageSent ? 'absolute bottom-0 w-full' : 'block'}`}>
  <Footer />
</div>
    </>
  )
}

export default Home
