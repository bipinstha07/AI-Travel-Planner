import { useState, useEffect, useRef } from 'react'
import PlanDestination from './smaller-component/PlanDestination'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'


interface Hotel {
  name: string
  price_per_night: string
  link: string
  hotel_class: number
}

interface Day {
  day: string
  description: string
}

interface LocationData {
  place_results?: {
    title: string
    description?: {
      snippet?: string
    }
    images?: Array<{
      title: string
      thumbnail?: string
      serpapi_thumbnail?: string
    }>
    weather?: {
      celsius: string
      fahrenheit: string
      conditions: string
    }
    address?: string
    gps_coordinates?: {
      latitude: number
      longitude: number
    }
  }
}

interface ItineraryData {
  destination: string
  trip_type: string
  budget: string
  dates: string
  departure_city?: string
  hotels?: Hotel[]
  days: Day[]
  location?: LocationData
}

interface ItineraryResponse {
  itinerary: ItineraryData
}

interface Message {
  id: number
  text: string
  isUser: boolean
  timestamp: Date
}

interface ChatResponse {
  reply: string
  itinerary?: string | { itinerary: string }
  variables: {
    destination: string | null
    start_date: string | null
    num_days: string | null
    budget: string | null
    departure_city: string | null
    trip_type: string | null
  }
  done: boolean
}

function Home() {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [tripVariables, setTripVariables] = useState<ChatResponse['variables'] | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null)
  const [isLoadingItinerary, setIsLoadingItinerary] = useState(false)
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])
  
  // Focus input after message is sent
  useEffect(() => {
    if (!isLoading && messageSent) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isLoading, messageSent, messages])
  
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

    // Store the message text before clearing input
    const messageText = inputValue.trim()
    
    // Clear input immediately after user sends message
    setInputValue('')
    setMessageSent(true)

    // Add user message to chat immediately
    const userMessage: Message = {
      id: Date.now(),
      text: messageText,
      isUser: true,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: messageText,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ChatResponse = await response.json()
      console.log('Response:', data)
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: data.reply || 'Thank you for your query! Our AI travel planner is processing your request.',
        isUser: false,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])
      
      // Update trip variables from response
      if (data.variables) {
        setTripVariables(data.variables)
      }
      
      // Update done status
      setIsDone(data.done)
      
      // Don't set itinerary from chat response - it will be set when user clicks "Generate Itinerary"
    } catch (err) {
      console.error('Error calling chat API:', err)
      
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    }
  }

  // Component to update map center when data changes
  function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap()
    useEffect(() => {
      map.setView(center, zoom)
    }, [map, center, zoom])
    return null
  }

  // Component to remove zoom controls
  function RemoveZoomControl() {
    const map = useMap()
    useEffect(() => {
      if (map.zoomControl) {
        map.zoomControl.remove()
      }
      // Also hide via CSS as backup
      const style = document.createElement('style')
      style.textContent = '.leaflet-control-zoom { display: none !important; }'
      document.head.appendChild(style)
      return () => {
        document.head.removeChild(style)
      }
    }, [map])
    return null
  }

  // Function to render markdown text as formatted JSX
  const renderMarkdown = (text: string | any) => {
    // Convert to string if not already
    if (typeof text !== 'string') {
      if (text && typeof text === 'object' && text.itinerary) {
        text = text.itinerary
      } else {
        text = String(text || '')
      }
    }
    
    if (!text || typeof text !== 'string') return null
    
    // Split by lines and process each line
    const lines = text.split('\n')
    const elements: React.ReactElement[] = []
    let currentList: React.ReactNode[] = []
    
    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-outside mb-4 ml-6 space-y-2.5">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-gray-700 leading-relaxed pl-2">{item}</li>
            ))}
          </ul>
        )
        currentList = []
      }
    }
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Empty line
      if (!trimmedLine) {
        flushList()
        elements.push(<br key={`br-${index}`} />)
        return
      }
      
      // Headings
      if (trimmedLine.startsWith('## ')) {
        flushList()
        const content = trimmedLine.substring(3).trim()
        // Special styling for "Trip Summary" title
        const isTitle = content.toLowerCase().includes('trip') && (content.toLowerCase().includes('summary') || content.toLowerCase().includes('plan'))
        elements.push(
          <h2 key={`h2-${index}`} className={`${isTitle ? 'text-3xl' : 'text-2xl'} font-bold text-gray-900 ${isTitle ? 'mt-2 mb-4' : 'mt-8 mb-4'} border-b border-gray-200 pb-2`}>
            {renderInlineMarkdown(content)}
          </h2>
        )
        return
      }
      
      if (trimmedLine.startsWith('### ')) {
        flushList()
        const content = trimmedLine.substring(4).trim()
        // Special styling for Day headings
        const isDayHeading = content.toLowerCase().startsWith('day')
        elements.push(
          <h3 key={`h3-${index}`} className={`${isDayHeading ? 'text-xl' : 'text-lg'} font-semibold text-gray-800 ${isDayHeading ? 'mt-6 mb-3' : 'mt-5 mb-2'} ${isDayHeading ? 'text-blue-700' : ''}`}>
            {renderInlineMarkdown(content)}
          </h3>
        )
        return
      }
      
      // List items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const content = trimmedLine.substring(2).trim()
        currentList.push(renderInlineMarkdown(content))
        return
      }
      
      // Regular paragraph
      flushList()
      if (trimmedLine) {
        // Check if it's a numbered list item (1., 2., etc.)
        const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/)
        if (numberedListMatch) {
          elements.push(
            <p key={`p-${index}`} className="mb-2 text-gray-700 leading-relaxed ml-6">
              <span className="font-medium text-gray-800">{numberedListMatch[1]}.</span> {renderInlineMarkdown(numberedListMatch[2])}
            </p>
          )
        } else {
          elements.push(
            <p key={`p-${index}`} className="mb-3 text-gray-700 leading-relaxed">
              {renderInlineMarkdown(trimmedLine)}
            </p>
          )
        }
      }
    })
    
    flushList()
    return <div>{elements}</div>
  }
  
  // Function to render inline markdown (bold, italic, links)
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return text
    
    const parts: React.ReactNode[] = []
    let currentIndex = 0
    
    // Process links first (they have specific format)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const linkMatches: Array<{ index: number; text: string; url: string; original: string }> = []
    let linkMatch: RegExpExecArray | null
    linkRegex.lastIndex = 0
    while ((linkMatch = linkRegex.exec(text)) !== null) {
      linkMatches.push({
        index: linkMatch.index,
        text: linkMatch[1],
        url: linkMatch[2],
        original: linkMatch[0]
      })
    }
    
    // Process bold **text** (but not single *)
    const boldRegex = /\*\*([^*]+)\*\*/g
    const boldMatches: Array<{ index: number; content: string; original: string }> = []
    let boldMatch: RegExpExecArray | null
    boldRegex.lastIndex = 0
    while ((boldMatch = boldRegex.exec(text)) !== null) {
      boldMatches.push({
        index: boldMatch.index,
        content: boldMatch[1],
        original: boldMatch[0]
      })
    }
    
    // Process italic *text* (but not **) - simplified regex
    const italicRegex = /\*([^*]+)\*/g
    const italicMatches: Array<{ index: number; content: string; original: string }> = []
    let italicMatch: RegExpExecArray | null
    italicRegex.lastIndex = 0
    while ((italicMatch = italicRegex.exec(text)) !== null) {
      italicMatches.push({
        index: italicMatch.index,
        content: italicMatch[1],
        original: italicMatch[0]
      })
    }
    
    // Combine all matches and sort by index
    const allMatches: Array<{ index: number; endIndex: number; render: () => React.ReactNode }> = []
    
    linkMatches.forEach(match => {
      allMatches.push({
        index: match.index,
        endIndex: match.index + match.original.length,
        render: () => (
          <a key={`link-${currentIndex++}`} href={match.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
            {match.text}
          </a>
        )
      })
    })
    
    boldMatches.forEach(match => {
      allMatches.push({
        index: match.index,
        endIndex: match.index + match.original.length,
        render: () => (
          <strong key={`bold-${currentIndex++}`} className="font-semibold text-gray-900">
            {match.content}
          </strong>
        )
      })
    })
    
    italicMatches.forEach(match => {
      // Check if this italic is not part of a bold match
      const isPartOfBold = boldMatches.some(bm => 
        match.index >= bm.index && match.index < bm.index + bm.original.length
      )
      if (!isPartOfBold) {
        allMatches.push({
          index: match.index,
          endIndex: match.index + match.original.length,
          render: () => (
            <em key={`italic-${currentIndex++}`} className="italic">
              {match.content}
            </em>
          )
        })
      }
    })
    
    // Sort by index
    allMatches.sort((a, b) => a.index - b.index)
    
    // Remove overlapping matches (keep the first one)
    const nonOverlapping: typeof allMatches = []
    let lastEnd = 0
    allMatches.forEach(match => {
      if (match.index >= lastEnd) {
        nonOverlapping.push(match)
        lastEnd = match.endIndex
      }
    })
    
    // Build the result
    let lastIndex = 0
    nonOverlapping.forEach(match => {
      if (match.index > lastIndex) {
        const textPart = text.substring(lastIndex, match.index)
        // Remove any remaining ** characters that weren't matched
        parts.push(textPart.replace(/\*\*/g, ''))
      }
      parts.push(match.render())
      lastIndex = match.endIndex
    })
    
    if (lastIndex < text.length) {
      const textPart = text.substring(lastIndex)
      // Remove any remaining ** characters that weren't matched
      parts.push(textPart.replace(/\*\*/g, ''))
    }
    
    return parts.length > 0 ? <>{parts}</> : text.replace(/\*\*/g, '')
  }

  const handleNewPlan = async () => {
    console.log('New Plan button clicked')
    setIsLoading(true)
    
    try {
      console.log('Calling reset_chat API...')
      const response = await fetch('http://127.0.0.1:8000/api/reset_chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      console.log('Reset chat response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Reset chat response:', data)

      // Reset all state but keep chat view open
      setMessages([])
      setMessageSent(true) // Keep chat view open
      setTripVariables(null)
      setIsDone(false)
      setItinerary(null)
      setInputValue('')
      setSuggestions(getRandomSuggestions())
      
      // Focus input after reset
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } catch (err) {
      console.error('Error resetting chat:', err)
      // Still reset the UI even if API call fails
      setMessages([])
      setMessageSent(true) // Keep chat view open
      setTripVariables(null)
      setIsDone(false)
      setItinerary(null)
      setInputValue('')
      setSuggestions(getRandomSuggestions())
    } finally {
      setIsLoading(false)
    }
  }

  // Function to render markdown description with enhanced formatting (for structured itinerary)
  const renderItineraryMarkdown = (text: string) => {
    if (!text || typeof text !== 'string') return null
    
    const lines = text.split('\n')
    const elements: React.ReactElement[] = []
    let currentList: React.ReactNode[] = []
    let isFirstLine = true
    
    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-outside mb-2 ml-5 space-y-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-gray-700 leading-relaxed pl-1 text-sm">{item}</li>
            ))}
          </ul>
        )
        currentList = []
      }
    }
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      if (!trimmedLine) {
        flushList()
        isFirstLine = false
        return
      }
      
      if (trimmedLine.startsWith('## ')) {
        flushList()
        const content = trimmedLine.substring(3).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
        elements.push(
          <h2 key={`h2-${index}`} className="text-lg font-bold text-gray-900 mt-3 mb-2">
            {content}
          </h2>
        )
        isFirstLine = false
        return
      }
      
      if (trimmedLine.startsWith('### ')) {
        flushList()
        const content = trimmedLine.substring(4).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
        elements.push(
          <h3 key={`h3-${index}`} className="text-base font-semibold text-gray-800 mt-3 mb-2">
            {content}
          </h3>
        )
        isFirstLine = false
        return
      }
      
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const content = trimmedLine.substring(2).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
        currentList.push(content)
        isFirstLine = false
        return
      }
      
        // Check for special patterns like "Hotel Recommendation:", "Restaurant Suggestion:", "Travel Tip:"
      if (trimmedLine.includes('Hotel Recommendation:') || trimmedLine.includes('Restaurant Suggestion:') || trimmedLine.includes('Travel Tip:')) {
        flushList()
        const cleanedLine = trimmedLine.replace(/\*\*/g, '').replace(/^#+\s*/g, '')
        const parts = cleanedLine.split(':')
        const label = parts[0] + ':'
        const value = parts.slice(1).join(':').trim()
        
        let bgColor = 'bg-blue-50'
        let borderColor = 'border-blue-200'
        let textColor = 'text-blue-800'
        
        if (trimmedLine.includes('Hotel')) {
          bgColor = 'bg-purple-50'
          borderColor = 'border-purple-200'
          textColor = 'text-purple-800'
        } else if (trimmedLine.includes('Restaurant')) {
          bgColor = 'bg-orange-50'
          borderColor = 'border-orange-200'
          textColor = 'text-orange-800'
        } else if (trimmedLine.includes('Travel Tip')) {
          bgColor = 'bg-green-50'
          borderColor = 'border-green-200'
          textColor = 'text-green-800'
        }
        
        elements.push(
          <div key={`info-${index}`} className={`${bgColor} rounded-lg p-2 mb-2 border-l-4 ${borderColor}`}>
            <p className={`font-semibold ${textColor} mb-0.5 text-sm`}>{label}</p>
            <p className="text-gray-700 text-sm">{value}</p>
          </div>
        )
        isFirstLine = false
        return
      }
      
      flushList()
      if (trimmedLine) {
        // Special handling for the first line of description (before list items start)
        if (isFirstLine && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
          // First line that's not a list item - make it bold and bigger with blue color
          const cleanedLine = trimmedLine.replace(/\*\*/g, '').replace(/^#+\s*/g, '')
          elements.push(
            <p key={`p-${index}`} className="mb-3 text-gray-700 leading-relaxed">
              <span className="text-lg font-bold text-blue-600">{cleanedLine}</span>
            </p>
          )
        } else {
          // Check if line contains " - " pattern and format the first part
          const dashIndex = trimmedLine.indexOf(' - ')
          if (dashIndex > 0) {
            const firstPart = trimmedLine.substring(0, dashIndex).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
            const restPart = trimmedLine.substring(dashIndex + 3).trim().replace(/\*\*/g, '').replace(/^#+\s*/g, '')
            elements.push(
              <p key={`p-${index}`} className="mb-2 text-gray-700 leading-relaxed text-sm">
                <span className="text-base font-bold text-blue-600">{firstPart}</span>
                {restPart && <span> - {restPart}</span>}
              </p>
            )
          } else {
            const cleanedLine = trimmedLine.replace(/\*\*/g, '').replace(/^#+\s*/g, '')
            elements.push(
              <p key={`p-${index}`} className="mb-2 text-gray-700 leading-relaxed text-sm">
                {cleanedLine}
              </p>
            )
          }
        }
        isFirstLine = false
      }
    })
    
    flushList()
    return <div>{elements}</div>
  }

  const handleGenerateItinerary = async () => {
    setIsLoadingItinerary(true)
    setItinerary(null)
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/generate_itinerary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ItineraryResponse = await response.json()
      console.log('Itinerary Response:', data)
      
      // Extract the itinerary data
      if (data.itinerary) {
        setItinerary(data.itinerary)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error generating itinerary:', err)
      // Don't set error in itinerary state, just log it
    } finally {
      setIsLoadingItinerary(false)
    }
  }


  

  return (
    <>
    <div className={` h-[60vh] flex flex-col ${messageSent ? 'h-[90vh]' : 'items-center justify-center'}`}>
      {!messageSent && (
        <div className="text-center mt-20 mb-12">
          <h1 className='text-3xl md:text-5xl text-gray-800 font-light mb-4'>
            What's your travel plan?
        </h1>
          <p className='text-gray-600 text-lg'>Let's create an amazing journey together</p>
        </div>
      )}

      {/* Chat Box */}
      {messageSent && (
        <div className='w-full flex relative' style={{ height: 'calc(100vh - 50px)' }}>
          <div 
            className={`h-[90%] overflow-y-auto px-6 py-4 scrollbar-minimal bg-transparent transition-all duration-300 ease-in-out ${
              isRightPanelExpanded ? 'w-[5%]' : 'w-[40%]'
            }`}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db transparent'
            }}
          >
          {/* New Plan Button */}
          {!isRightPanelExpanded && (
            <div className='sticky top-0 z-10'>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleNewPlan()
                }}
                disabled={isLoading}
                className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow border border-gray-200/50'
                aria-label='Start new plan'
                title='Start new plan'
              >
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='w-4 h-4'>
                  <path d='M12 2v20M2 12h20'/>
                </svg>
                <span>New Plan</span>
              </button>
            </div>
          )}
          <div className={`flex flex-col gap-5 py-4 ${isRightPanelExpanded ? 'hidden' : ''}`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 relative overflow-hidden ${
                    message.isUser
                      ? 'text-white rounded-br-md shadow-lg'
                      : 'bg-gradient-to-t from-white via-gray-50 to-white text-gray-950 rounded-bl-md shadow-sm'
                  }`}
                  style={message.isUser ? {
                    background: 'linear-gradient(165deg, #083CC2 0%, #2253CA 35%, #1692E0 70%, #4BB8F5 100%)',
                    
                  } : {
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                  }}
                >
                  {message.isUser && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent pointer-events-none"></div>
                  )}
                  <div className='text-sm leading-relaxed relative z-10 whitespace-pre-line'>{message.text}</div>
                </div>
              </div>
            ))}
            {isLoading && !isRightPanelExpanded && (
              <div className='flex justify-start'>
                <div className='bg-white text-gray-950 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'>
                  <div className='flex items-center gap-2'>
                    <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'></div>
                    <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce' style={{ animationDelay: '0.2s' }}></div>
                    <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce' style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          </div>

          {/* Right side - 60% (expandable to 95%) */}
        <div className={`h-full  pl-6 pr-6 py-6 relative transition-all duration-300 ease-in-out ${
          isRightPanelExpanded ? 'w-[95%]' : 'w-[60%]'
        }`}>
          {/* Expand/Collapse Tab Icon */}
          <button
            onClick={() => setIsRightPanelExpanded(!isRightPanelExpanded)}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-10 h-16 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-l-lg shadow-lg border border-gray-200/50 hover:bg-white transition-all duration-200 group ${
              isRightPanelExpanded ? 'rotate-180' : ''
            }`}
            aria-label={isRightPanelExpanded ? 'Collapse panel' : 'Expand panel'}
            title={isRightPanelExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            <svg 
              xmlns='http://www.w3.org/2000/svg' 
              viewBox='0 0 24 24' 
              fill='none' 
              stroke='currentColor' 
              strokeWidth='2' 
              strokeLinecap='round' 
              strokeLinejoin='round' 
              className='w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors'
            >
              <path d='M9 18l6-6-6-6'/>
            </svg>
          </button>
          
          <div className='w-full h-full rounded-2xl overflow-y-auto overflow-x-hidden bg-white/60 backdrop-blur-sm shadow-lg border border-white/20 relative'>
            {!isDone ? (
              // Designing your trip state
              <div className="w-full h-full flex flex-col items-center justify-center p-2">
  <div className="flex flex-col items-center gap-6">
                  {/* Avatar/Icon */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
      </div>
      
                  {/* Title */}
                  <div className="text-center">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">Designing your trip...</h3>
                    <p className="text-gray-500 text-sm">We're crafting the perfect itinerary for you</p>
                  </div>
      </div>
    </div>
            ) : (
              // Trip information and itinerary when done
              <div className="w-full h-full p-6 bg-white/80 backdrop-blur-sm relative overflow-y-hidden overflow-x-hidden">
                {!itinerary ? (
                  <>
                    {/* Trip Information - Unique Card Grid Design */}
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900 mb-3">Trip Summary</h2>
                      
                      {/* Grid of Detail Cards - 3 Colors Only */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                        {tripVariables?.destination && (
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border-l-2 border-blue-500 shadow-sm hover:shadow transition-shadow">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-0.5">Destination</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{tripVariables.destination}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {tripVariables?.departure_city && (
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border-l-2 border-purple-500 shadow-sm hover:shadow transition-shadow">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-0.5">Departure</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{tripVariables.departure_city}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {tripVariables?.start_date && (
                          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-3 border-l-2 border-teal-500 shadow-sm hover:shadow transition-shadow">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-teal-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-0.5">Start Date</p>
                                <p className="text-sm font-bold text-gray-900">{tripVariables.start_date}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {tripVariables?.num_days && (
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border-l-2 border-blue-500 shadow-sm hover:shadow transition-shadow">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-0.5">Duration</p>
                                <p className="text-sm font-bold text-gray-900">
                                  {tripVariables.num_days} {tripVariables.num_days === '1' ? 'Day' : 'Days'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {tripVariables?.trip_type && (
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border-l-2 border-purple-500 shadow-sm hover:shadow transition-shadow">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-0.5">Trip Type</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{tripVariables.trip_type}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {tripVariables?.budget && (
                          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-3 border-l-2 border-teal-500 shadow-sm hover:shadow transition-shadow">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-teal-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-0.5">Budget</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{tripVariables.budget}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    {/* Create Itinerary Button */}
                    <button
                      onClick={handleGenerateItinerary}
                      disabled={isLoadingItinerary}
                      className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      {isLoadingItinerary ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating Itinerary...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          <span>Create Itinerary</span>
                        </>
                      )}
                    </button>
                    </div>
                  </>
                ) : (
                  // Itinerary Display (Structured Format)
                  <div className="space-y-3 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-60px)] w-full max-w-full">
                    {/* Trip Header */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                      <div className="space-y-2">
                        {/* Route: Departure → Destination */}
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Date above the line */}
                          <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-blue-200 shadow-sm">
                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span className="font-semibold text-xs text-gray-700">{itinerary.dates}</span>
                          </div>
                          
                          {/* Route line with cities */}
                          {itinerary.departure_city && (
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex items-center gap-1.5 group">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                  </svg>
                                </div>
                                <span className="text-base font-bold text-gray-900">{itinerary.departure_city}</span>
                              </div>
                              
                              {/* Animated Arrow */}
                              <div className="flex-1 flex items-center">
                                <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                                <div className="mx-1.5 animate-pulse">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                                  </svg>
                                </div>
                                <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-600 to-blue-400"></div>
                              </div>
                              
                              <div className="flex items-center gap-1.5 group">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 group-hover:bg-teal-200 transition-colors">
                                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                  </svg>
                                </div>
                                <span className="text-base font-bold text-gray-900">{itinerary.destination}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Tags below the line */}
                          <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold border border-blue-200">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                              </svg>
                              {itinerary.trip_type}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-1 rounded-full text-xs font-semibold border border-teal-200">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              {itinerary.budget}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Map and Destination Overview Section - Side by Side */}
                    {itinerary.location?.place_results && (
                      <div className="grid grid-cols-1 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] lg:grid-cols-[minmax(0,1.86fr)_minmax(0,1fr)] gap-2 min-w-0 max-w-full">
                        {/* Destination Overview Section - Left */}
                        <div className="bg-white  p-4 min-w-0 max-w-full overflow-hidden">
                          <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                            <h2 className="text-xl font-bold text-gray-900 break-words">Destination Overview</h2>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Title */}
                            <h3 className="text-2xl font-semibold text-gray-800 break-words">{itinerary.location.place_results.title}</h3>
                            
                            {/* Description */}
                            {itinerary.location.place_results.description?.snippet && (
                              <p className="text-gray-700 leading-relaxed break-words">{itinerary.location.place_results.description.snippet}</p>
                            )}
                            
                            {/* Country/Address */}
                            {itinerary.location.place_results.address && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <span className="text-lg">📍</span>
                                <span className="text-sm font-medium">{itinerary.location.place_results.address}</span>
                              </div>
                            )}
                            
                            {/* Images */}
                            {itinerary.location.place_results.images && itinerary.location.place_results.images.length > 0 && (
                              <div className="grid grid-cols-2 gap-3">
                                {itinerary.location.place_results.images
                                  .filter((img) => img.thumbnail && !img.thumbnail.includes("serpapi.com"))
                                  .slice(0, 2)
                                  .map((img, idx) => {
                                    const thumbnailUrl = img.thumbnail || ""
                                    return (
                                      <div key={`${img.title}-${idx}`} className="relative">
                                        <img
                                          src={thumbnailUrl}
                                          alt={img.title}
                                          referrerPolicy="no-referrer"
                                          loading="lazy"
                                          onError={(e) => {
                                            console.error("Failed to load image:", thumbnailUrl, img.title)
                                            e.currentTarget.style.display = 'none'
                                            const parent = e.currentTarget.parentElement
                                            if (parent) {
                                              parent.style.display = 'none'
                                            }
                                          }}
                                          onLoad={() => {
                                            console.log("Image loaded successfully:", img.title, thumbnailUrl)
                                          }}
                                          onClick={() => {
                                            if (thumbnailUrl) {
                                              window.open(thumbnailUrl, "_blank")
                                            }
                                          }}
                                          className="w-full h-40 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                        />
                                      </div>
                                    )
                                  })}
                              </div>
                            )}
                            
                            {/* Weather */}
                            {itinerary.location.place_results.weather && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <span className="text-lg">🌤️</span>
                                <span className="text-sm">
                                  {itinerary.location.place_results.weather.conditions} - {itinerary.location.place_results.weather.celsius} / {itinerary.location.place_results.weather.fahrenheit}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Map Section - Right */}
                        {itinerary.location.place_results.gps_coordinates && (
                          <div className="bg-white p-4 min-w-0 max-w-full overflow-hidden">
                            <div className="flex items-center gap-2 mb-4">
                              
                              
                            </div>
                            <div className={`w-full max-w-full rounded-lg overflow-hidden border border-gray-200 ${isRightPanelExpanded ? 'h-96' : 'h-86'}`}>
                              <MapContainer
                                center={[itinerary.location.place_results.gps_coordinates.latitude, itinerary.location.place_results.gps_coordinates.longitude]}
                                zoom={13}
                                scrollWheelZoom={true}
                                zoomControl={false}
                                style={{ height: '100%', width: '100%' }}
                                key={`${itinerary.location.place_results.gps_coordinates.latitude}-${itinerary.location.place_results.gps_coordinates.longitude}`}
                              >
                                <ChangeView 
                                  center={[itinerary.location.place_results.gps_coordinates.latitude, itinerary.location.place_results.gps_coordinates.longitude]} 
                                  zoom={13} 
                                />
                                <RemoveZoomControl />
                                <TileLayer
                                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                  attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                  maxZoom={20}
                                />
                                <Marker 
                                  position={[itinerary.location.place_results.gps_coordinates.latitude, itinerary.location.place_results.gps_coordinates.longitude]}
                                  icon={L.icon({
                                    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                                    iconSize: [30, 30],
                                  })}
                                >
                                  <Popup>
                                    <strong>{itinerary.location.place_results.title}</strong><br />
                                    {itinerary.location.place_results.address || 'Location'}
                                  </Popup>
                                </Marker>
                              </MapContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hotels Section */}
                    {itinerary.hotels && itinerary.hotels.length > 0 && (
                      <div className="bg-white rounded-2xl shadow-sm p-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-3">🏨 Recommended Hotels</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {itinerary.hotels.map((hotel, hotelIndex) => (
                              <div 
                                key={hotelIndex}
                                className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-3 border border-blue-100 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="text-sm font-semibold text-gray-900 flex-1 pr-2 leading-tight">
                                    {hotel.name}
                                  </h3>
                                  {hotel.hotel_class && (
                                    <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded">
                                      {Array.from({ length: hotel.hotel_class }).map((_, i) => (
                                        <span key={i} className="text-yellow-500 text-xs">★</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="mb-2">
                                  <p className="text-xs text-gray-500 mb-0.5">Price per night</p>
                                  <p className="text-lg font-bold text-teal-600">{hotel.price_per_night}</p>
                                </div>
                                {hotel.link && (
                                  <a
                                    href={hotel.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors font-medium text-xs w-full justify-center"
                                  >
                                    Book Now
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                    </svg>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Days */}
                    {itinerary.days.map((day, dayIndex) => {
                      // Extract day title (e.g., "## Day 1:" -> "Day 1:") - remove all # and **
                      const dayTitle = day.day ? day.day.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim() : ''
                      
                      // Extract first line from description (before \n\n)
                      let descriptionToRender = day.description || ''
                      let firstPart = ''
                      
                      if (descriptionToRender) {
                        const lines = descriptionToRender.split('\n')
                        // Get the first non-empty line that doesn't start with "-" or "*"
                        for (const line of lines) {
                          const trimmed = line.trim()
                          if (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
                            // Remove ** and # characters from firstPart
                            firstPart = trimmed.replace(/\*\*/g, '').replace(/^#+\s*/g, '')
                            // Remove the first line from description
                            const firstLineIndex = descriptionToRender.indexOf(trimmed)
                            if (firstLineIndex >= 0) {
                              descriptionToRender = descriptionToRender.substring(firstLineIndex + trimmed.length).trim()
                              // Remove leading \n\n if present
                              if (descriptionToRender.startsWith('\n\n')) {
                                descriptionToRender = descriptionToRender.substring(2).trim()
                              }
                            }
                            break
                          }
                        }
                      }
                      
                      // Combine day title with first part
                      const fullTitle = firstPart ? `${dayTitle} ${firstPart}` : dayTitle
                      
                      return (
                        <div key={dayIndex} className="bg-white rounded-2xl shadow-sm p-4">
                          {/* Day Header */}
                          {fullTitle && (
                            <div className="mb-3">
                              <h2 className="text-xl font-bold text-blue-600 mb-2 pb-2 border-b-2 border-blue-100">
                                {fullTitle}
                              </h2>
                            </div>
                          )}
                          
                          {/* Description */}
                          {descriptionToRender && (
                            <div className="prose max-w-none">
                              {renderItineraryMarkdown(descriptionToRender)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
</div>
            )}
          </div>
          </div>
        </div>
      )}

      <div className={`w-full  ${messageSent ? (isRightPanelExpanded ? 'w-[5%]' : 'w-[40%]') : ' max-w-3xl px-4'} ${messageSent && isRightPanelExpanded ? 'hidden' : ''}`}>
        <div className={`flex items-center gap-3 bg-white rounded-2xl border border-gray-200/50 shadow-md px-4 py-3 ${messageSent ? 'fixed bottom-6' : ''} transition-all duration-300 ease-in-out hover:shadow-lg focus-within:ring-1 focus-within:ring-blue-400/30 focus-within:border-blue-400/50`} style={messageSent ? { 
          left: '1.5rem', 
          width: isRightPanelExpanded ? 'calc(5% - 3rem)' : 'calc(40% - 3rem)'
        } : {}}>
          {/* Attachment icon */}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            className='flex-1 outline-none text-gray-800 placeholder:text-gray-400 text-sm bg-transparent'
            placeholder='Ask anything...'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
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
              className='h-9 w-9 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md' 
            aria-label='Send'
            onClick={handleSubmit}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
                  <path d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'/>
              </svg>
            )}
          </button>
          </div>
        </div>

        {/* Suggestion Keywords */}
        {!messageSent && (
          <div className='flex flex-wrap gap-2 mt-6 justify-center items-center'>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                className='px-4 py-2 text-sm text-gray-700 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 rounded-full transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md'
                >
                  {suggestion}
                </button>
              ))}
            <button
              onClick={handleRefreshSuggestions}
              className='px-3  py-2 text-sm text-gray-600 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1 shadow-sm hover:shadow-md'
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

{/* <div className={`${messageSent ? ' w-full' : 'block'}`}>
  <Footer />
</div> */}
    </>
  )
}

export default Home
