import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import type { 
  Message, 
  ChatResponse, 
  ItineraryResponse, 
  ItineraryData
} from '../types/trave'
import ItineraryView from '../component/itinerary/ItineraryView'
import TripDesigner from '../component/chat/TripDesigner'

function ChatPage() {
  const location = useLocation()
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [tripVariables, setTripVariables] = useState<ChatResponse['variables'] | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null)
  const [isLoadingItinerary, setIsLoadingItinerary] = useState(false)
  const [currentProcessingStep, setCurrentProcessingStep] = useState(0)
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false)
  const [apiSuggestions, setApiSuggestions] = useState<string[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeStepRef = useRef<HTMLDivElement>(null)
  const hasInitializedRef = useRef(false)
  
  // Handle initial message from navigation
  useEffect(() => {
    if (location.state?.initialMessage && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      setInputValue(location.state.initialMessage)
      // We need to call handleSubmit but we need the value. 
      // Since state updates are async, passing the value directly is safer.
      handleSubmit(location.state.initialMessage)
    }
  }, [location.state])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])
  
  // Auto-scroll to active processing step
  useEffect(() => {
    if (isLoadingItinerary && activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentProcessingStep, isLoadingItinerary])
  
  // Focus input after message is sent
  useEffect(() => {
    if (!isLoading) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isLoading, messages])

  const handleSubmit = async (messageOverride?: string) => {
    const messageToSend = messageOverride || inputValue
    console.log('Input Value:', messageToSend)
    if (!messageToSend.trim()) {
      return
    }

    setIsLoading(true)

    // Store the message text before clearing input
    const messageText = messageToSend.trim()
    
    // Clear input immediately after user sends message
    setInputValue('')

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
      
      // Parse suggestions from reply text
      let replyText = data.reply || 'Thank you for your query! Our AI travel planner is processing your request.'
      let suggestions: string[] = []
      
      // Check if reply contains "suggestions:" and extract them
      const suggestionsMatch = replyText.match(/suggestions:\s*(.+)/i)
      if (suggestionsMatch) {
        // Extract suggestions part
        const suggestionsText = suggestionsMatch[1].trim()
        // Parse comma-separated suggestions
        suggestions = suggestionsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
        // Remove suggestions part from the displayed message
        replyText = replyText.replace(/suggestions:.*/i, '').trim()
      }
      
      // Update API suggestions - replace with new ones
      setApiSuggestions(suggestions)
      
      // Add AI response to chat (without suggestions part)
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: replyText,
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

  // Function to render markdown text as formatted JSX
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              <li key={idx} className="text-gray-200 leading-relaxed pl-2">{item}</li>
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
          <h2 key={`h2-${index}`} className={`${isTitle ? 'text-3xl' : 'text-2xl'} font-bold text-white ${isTitle ? 'mt-2 mb-4' : 'mt-8 mb-4'} border-b border-white/20 pb-2`}>
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
          <h3 key={`h3-${index}`} className={`${isDayHeading ? 'text-xl' : 'text-lg'} font-semibold text-gray-100 ${isDayHeading ? 'mt-6 mb-3' : 'mt-5 mb-2'} ${isDayHeading ? 'text-blue-300' : ''}`}>
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
            <p key={`p-${index}`} className="mb-2 text-gray-200 leading-relaxed ml-6">
              <span className="font-medium text-gray-100">{numberedListMatch[1]}.</span> {renderInlineMarkdown(numberedListMatch[2])}
            </p>
          )
        } else {
          elements.push(
            <p key={`p-${index}`} className=" text-gray-200 leading-relaxed">
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
          <a key={`link-${currentIndex++}`} href={match.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">
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
          <strong key={`bold-${currentIndex++}`} className="font-semibold text-white">
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
      setTripVariables(null)
      setIsDone(false)
      setItinerary(null)
      setInputValue('')
      setApiSuggestions([])
      
      // Focus input after reset
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } catch (err) {
      console.error('Error resetting chat:', err)
      // Still reset the UI even if API call fails
      setMessages([])
      setTripVariables(null)
      setIsDone(false)
      setItinerary(null)
      setInputValue('')
      setApiSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const processingSteps = [
    { text: 'Identifying your destination on the world map...', icon: 'map-pin' },
    { text: 'Analyzing nearby attractions using geolocation data...', icon: 'location-search' },
    { text: 'Searching the best hotels near your destination...', icon: 'hotel' },
    { text: 'Analyzing flight routes, prices, and schedules...', icon: 'flight' },
    { text: 'Connecting securely to the AI travel engine...', icon: 'ai' },
    { text: 'Personalizing trip recommendations based on your preferences...', icon: 'personalize' },
    { text: 'Optimizing your itinerary for comfort, cost, and convenience...', icon: 'optimize' },
    { text: 'Finalizing your personalized itinerary...', icon: 'itinerary' },
  ]

  const handleGenerateItinerary = async () => {
    setIsLoadingItinerary(true)
    setItinerary(null)
    setCurrentProcessingStep(0)
    
    // Simulate processing steps with delays (8 steps)
    const stepDelays = [1000, 1200, 1300, 1400, 1500, 1600, 1700, 1800]
    
    // Start API call immediately
    const apiCallPromise = fetch('http://127.0.0.1:8000/api/generate_itinerary', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Show processing steps while API call is in progress
    const stepsPromise = (async () => {
      for (let i = 0; i < processingSteps.length; i++) {
        setCurrentProcessingStep(i)
        await new Promise(resolve => setTimeout(resolve, stepDelays[i] || 1500))
      }
    })()
    
    try {
      // Wait for both API call and steps to complete
      const [response] = await Promise.all([apiCallPromise, stepsPromise])
      
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
      setCurrentProcessingStep(0)
    }
  }

  return (
    <div className='h-[90vh]  flex flex-col'>
      {/* Chat Box */}
        <div className='w-full flex relative' style={{ height: 'calc(100vh - 80px)' }}>
          <div 
            className={`h-full overflow-y-auto px-6 scrollbar-minimal bg-transparent transition-all duration-300 ease-in-out pb-48 ${
              isRightPanelExpanded ? 'w-[5%]' : 'w-[40%]'
            }`}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db transparent',
              scrollbarGutter: 'stable'
            }}
          >
          {/* New Plan Button */}
          {!isRightPanelExpanded && (
            <div className='sticky top-0 z-30 py-4'>
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
          <div className={`flex flex-col gap-2 pb-4 ${isRightPanelExpanded ? 'hidden' : ''}`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 relative overflow-hidden backdrop-blur-md transition-all duration-300 ${
                    message.isUser
                      ? 'text-white rounded-br-sm border border-orange-400/30'
                      : 'bg-white/10 text-gray-100 rounded-bl-sm border border-white/10 shadow-lg'
                  }`}
                  style={message.isUser ? {
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  } : {}}
                >
                  {message.isUser && (
                    <div className="absolute inset-0 bg-linear-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none"></div>
                  )}
                  <div className='text-sm leading-relaxed relative z-10 whitespace-pre-line font-medium  font-chat'>
                    {renderMarkdown(message.text)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && !isRightPanelExpanded && (
              <div className='flex justify-start'>
                <div className='bg-white/10 backdrop-blur-md text-gray-100 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg'>
                  <div className='flex items-center gap-2'>
                    <div className='w-2 h-2 bg-white/80 rounded-full animate-bounce'></div>
                    <div className='w-2 h-2 bg-white/80 rounded-full animate-bounce' style={{ animationDelay: '0.2s' }}></div>
                    <div className='w-2 h-2 bg-white/80 rounded-full animate-bounce' style={{ animationDelay: '0.4s' }}></div>
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
          
          <div className='w-full h-full rounded-2xl overflow-y-auto overflow-x-hidden bg-white/90 backdrop-blur-xl shadow-lg border border-white/20 relative'>
            {!isDone ? (
              <TripDesigner mode="processing" />
            ) : (
              // Trip information and itinerary when done
              <div className="w-full h-full p-6 bg-white/80 backdrop-blur-sm relative overflow-y-hidden overflow-x-hidden">
                {isLoadingItinerary ? (
                  // Processing Steps Animation
                  <TripDesigner mode="idle" />
                ) : !itinerary ? (
                    // Trip Summary before Itinerary Generation
                    <div className="mb-6">
                      <div className="mb-5 pb-3 border-b border-gray-200/50">
                        <h2 className="text-2xl font-semibold text-gray-900">Trip Summary</h2>
                        <p className="text-sm text-gray-500 mt-1">Review your travel details</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                         {/* Variable cards - Simplified loop */}
                         {tripVariables && Object.entries(tripVariables).map(([key, value]) => {
                            if (!value) return null;
                            return (
                              <div key={key} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-4">
                                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1.5">{key.replace('_', ' ')}</p>
                                <p className="text-base font-semibold text-gray-900 truncate">{value}</p>
                              </div>
                            )
                         })}
                      </div>
                      
                      <button
                        onClick={handleGenerateItinerary}
                        disabled={isLoadingItinerary}
                        className="w-full px-6 py-3.5 bg-orange-500 hover:bg-orange-600 cursor-pointer text-white font-medium rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span>Create Itinerary</span>
                      </button>
                    </div>
                ) : (
                   // Itinerary Display using new Component
                   <ItineraryView 
                     itinerary={itinerary} 
                     isRightPanelExpanded={isRightPanelExpanded} 
                   />
                )}
              </div>
            )}
          </div>
          </div>
        </div>

      <div className={`w-full ${isRightPanelExpanded ? 'w-[5%]' : 'w-[40%]'} fixed bottom-6 left-6 transition-all duration-300 ${isRightPanelExpanded ? 'hidden' : ''}`} style={{ width: isRightPanelExpanded ? 'calc(5% - 3rem)' : 'calc(40% - 3rem)' }}>
        <div className='flex flex-col gap-2'>
          {/* API Suggestions */}
          {apiSuggestions.length > 0 && (
            <div className='flex flex-wrap gap-1.5 justify-end'>
              {apiSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputValue(suggestion)
                    handleSubmit(suggestion)
                  }}
                  className='px-3 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-2xl transition-all duration-200 cursor-pointer backdrop-blur-sm shadow-sm'
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          
          <div className={`flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-full border border-white/20 shadow-lg px-4 py-2 transition-all duration-300 ease-in-out hover:shadow-orange-500/10 focus-within:ring-1 focus-within:ring-orange-500/50 w-full max-w-2xl mx-auto`}>
          {/* Attachment icon */}
          <button className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            className='flex-1 outline-none text-gray-800 placeholder:text-gray-400 text-sm bg-transparent font-medium'
            placeholder="Ask anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />

          {/* Voice and Send buttons */}
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          <button 
              className='h-8 w-8 flex items-center justify-center rounded-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-orange-500/30 transform hover:scale-105' 
            aria-label='Send'
            onClick={() => handleSubmit()}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-3.5 w-3.5'>
                  <path d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'/>
              </svg>
            )}
          </button>
          </div>
          </div>
          
          {/* Disclaimer */}
          <p className="text-center text-[10px] text-white/60 font-light ">
            Travel AI can make mistakes. Please check important info.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChatPage
