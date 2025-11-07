import { useState } from 'react'
import { classifyIntent, generateItinerary, plan } from '../api/client'
import type { IntentResponse, ItineraryResponse, PlanResponse } from '../api/client'
import PlanDestination from './smaller-component/PlanDestination'
import Footer from '../footer/Footer'
function Home() {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [intentResult, setIntentResult] = useState<IntentResponse | null>(null)
  const [intentError, setIntentError] = useState<string | null>(null)
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null)
  const [itLoading, setItLoading] = useState(false)
  const [itError, setItError] = useState<string | null>(null)
  const [destination, setDestination] = useState('')
  const [days, setDays] = useState(5)
  const [preferences, setPreferences] = useState('')
  
  const [botMessage, setBotMessage] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [selectedDest, setSelectedDest] = useState<string | null>(null)
  
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
    if (!inputValue.trim()) return
    setIsLoading(true)
    setIntentError(null)
    setItinerary(null)
    try {
      const planRes: PlanResponse = await plan(inputValue.trim())
      setMessageSent(true)
      setRecommendations(planRes.recommendations)
      const intentLabel = planRes.intent
      const opts = planRes.recommendations
      const formatOptions = (arr: string[]) => {
        const items = arr.filter(Boolean).slice(0, 3)
        if (items.length === 0) return ''
        if (items.length === 1) return items[0]
        if (items.length === 2) return `${items[0]} or ${items[1]}`
        return `${items[0]}, ${items[1]}, or ${items[2]}`
      }
      const msg = `Got it — you're looking for a ${intentLabel} destination! Here are a few great options: ${formatOptions(opts)}. Which one sounds best to you?`
      setBotMessage(msg)
      // Seed itinerary inputs based on recommendations
      const first = opts[0] || 'Bali'
      setDestination(first)
      setPreferences((p) => p || intentLabel)
      setInputValue('')
      // Kick off classification in background (optional scores card)
      classifyIntent({ text: inputValue.trim() })
        .then((res) => setIntentResult(res))
        .catch(() => {})
    } catch (e: any) {
      setIntentError(e?.message || 'Failed to classify')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    }
  }

  const handleGenerate = async () => {
    if (!destination.trim()) return
    setItLoading(true)
    setItError(null)
    try {
      const prefs = preferences.split(',').map(s => s.trim()).filter(Boolean)
      const res = await generateItinerary({ destination: destination.trim(), days, preferences: prefs })
      setItinerary(res)
    } catch (e: any) {
      setItError(e?.message || 'Failed to generate itinerary')
    } finally {
      setItLoading(false)
    }
  }

  const handleChoose = (name: string) => {
    setSelectedDest(name)
    setDestination(name)
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
        {messageSent && (
          <>
            {botMessage && (
              <div className="max-w-3xl mx-auto mt-6 p-4 border rounded-lg bg-white shadow-sm">
                <div className="text-gray-800 mb-3">{botMessage}</div>
                <div className="flex flex-wrap gap-2">
                  {recommendations.map((r) => (
                    <button key={r} onClick={() => handleChoose(r)} className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full">
                      {r}
                    </button>
                  ))}
                </div>
                {selectedDest && (
                  <div className="mt-3 text-green-700">Thank you for choosing {selectedDest}.</div>
                )}
              </div>
            )}
            {intentResult && (
              <div className="max-w-3xl mx-auto mt-6 p-4 border rounded-lg bg-white shadow-sm">
                <div className="font-semibold text-gray-800 mb-2">Intent classification</div>
                <div className="mb-3">
                  <div className="text-gray-700 font-medium">Top label</div>
                  <div className="text-gray-900">
                    {intentResult.label}
                    <span className="text-gray-600 ml-2">
                      (confidence: {Math.round((intentResult.confidence || 0) * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-gray-700 font-medium">Scores</div>
                  <ul className="list-disc ml-5 text-gray-900">
                    {Object.entries(intentResult.scores).map(([label, score]) => (
                      <li key={label}>{label}: {Math.round(score * 100)}%</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="max-w-3xl mx-auto mt-6 p-4 border rounded-lg bg-gray-50">
              <div className="font-semibold text-gray-800 mb-2">Itinerary inputs</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="border rounded p-2"
                  placeholder="Destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
                <input
                  className="border rounded p-2"
                  placeholder="Days"
                  type="number"
                  min={1}
                  max={21}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
                <input
                  className="border rounded p-2"
                  placeholder="Preferences (comma-separated)"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                />
              </div>
              <button
                className='mt-3 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50'
                onClick={handleGenerate}
                disabled={itLoading || !destination.trim()}
              >
                {itLoading ? 'Generating...' : 'Generate Itinerary'}
              </button>
              {itError && <p className='text-red-600 mt-2'>{itError}</p>}
            </div>
            {itinerary && (
              <div className="max-w-3xl mx-auto mt-6 p-4 border rounded-lg bg-white shadow-sm">
                <div className="font-semibold text-gray-800 mb-2">Itinerary</div>
                <p className="text-gray-700 mb-2">{itinerary.notes || 'Personalized itinerary'}</p>
                <ul className="space-y-2">
                  {itinerary.days.map((day, idx) => (
                    <li key={idx} className="border rounded p-2">
                      <p className="font-semibold">Day {idx + 1}</p>
                      <p><strong>Activities:</strong> {day.activities.join(', ')}</p>
                      <p><strong>Food:</strong> {day.food.join(', ')}</p>
                      <p><strong>Sights:</strong> {day.sights.join(', ')}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
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
        {!messageSent && intentError && (
          <p className='text-red-600 mt-2'>{intentError}</p>
        )}

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
