import React, { useEffect, useRef, useState } from 'react'
import { chat, generateItinerary, listDestinations } from '../api/client'
import type { ItineraryResponse } from '../api/client'
import PlanDestination from './smaller-component/PlanDestination'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const prevLenRef = useRef<number>(0)

  // Itinerary state aligned with local main behavior
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null)
  const [days, setDays] = useState<number>(3)
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null)
  const [itLoading, setItLoading] = useState<boolean>(false)
  const [itError, setItError] = useState<string | null>(null)
  // Free-text destination input
  const [customPlace, setCustomPlace] = useState<string>('')

  // Intent classification
  const [intentText, setIntentText] = useState<string>('')
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [intentScores, setIntentScores] = useState<Record<string, number> | null>(null)
  const [intentConfidence, setIntentConfidence] = useState<number | null>(null)
  const [intentLoading, setIntentLoading] = useState<boolean>(false)
  const [destinations, setDestinations] = useState<any[]>([])
  const [destLoading, setDestLoading] = useState<boolean>(false)
  const [destError, setDestError] = useState<string | null>(null)

  // Only scroll the chat container when new messages arrive.
  // Avoid page-level scroll on initial load/reload.
  useEffect(() => {
    const container = chatContainerRef.current
    const len = messages.length
    if (!container) {
      prevLenRef.current = len
      return
    }
    // Skip when there are no messages (initial load)
    if (len === 0) {
      prevLenRef.current = 0
      return
    }
    // Scroll only when messages length increases
    if (len > prevLenRef.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
    prevLenRef.current = len
  }, [messages.length])

  const send = async () => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setError(null)
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: prompt }])
    setInput('')
    try {
      const res = await chat({ prompt })
      const reply = (res.reply || '').trim()
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      } else {
        // Honor no-fallback: show status, no fabricated text
        setError('No reply from chatbot. Configure provider keys to enable responses.')
      }
    } catch (e: any) {
      setError(e?.message || 'Chat failed')
    } finally {
      setLoading(false)
    }
  }

  const selectDestination = async (destination: string) => {
    setSelectedDestination(destination)
    setItError(null)
    setItLoading(true)
    setItinerary(null)
    try {
      const res = await generateItinerary({ destination, days })
      setItinerary(res)
    } catch (e: any) {
      setItError(e?.message || 'Itinerary generation failed')
    } finally {
      setItLoading(false)
    }
  }

  const submitCustomPlace = async () => {
    const place = customPlace.trim()
    if (!place || itLoading) return
    await selectDestination(place)
  }

  const classify = async () => {
    const text = intentText.trim()
    if (!text) return
    setIntentLoading(true)
    setSelectedLabel(null)
    setDestinations([])
    setDestError(null)
    try {
      const res = await import('../api/client').then(m => m.classifyIntent({ text }))
      setSelectedLabel(res.label)
      setIntentScores(res.scores)
      setIntentConfidence(res.confidence)
      // Fetch destinations by tag
      setDestLoading(true)
      const list = await listDestinations({ tag: res.label, limit: 12 })
      setDestinations(list.items || [])
    } catch (e: any) {
      setError(e?.message || 'Intent classification failed')
    } finally {
      setIntentLoading(false)
      setDestLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Intent → Destination → Itinerary (mirror local main flow) */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-2xl font-semibold mb-3">Understand your intent</h2>
        <div className="flex gap-2">
          <input
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            placeholder="Describe your travel preferences (e.g., beach, food, culture)"
            className="flex-1 border rounded px-3 py-2"
            disabled={intentLoading}
          />
          <button onClick={classify} disabled={intentLoading} className="px-3 py-2 bg-purple-600 text-white rounded">
            {intentLoading ? 'Classifying…' : 'Classify'}
          </button>
        </div>
        {selectedLabel && (
          <div className="mt-3 text-sm">
            <span className="font-medium">Predicted intent:</span> {selectedLabel} {intentConfidence !== null ? `(confidence ${Math.round(intentConfidence * 100)}%)` : ''}
          </div>
        )}
        {intentScores && (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-gray-700">
            {Object.entries(intentScores).map(([label, score]) => (
              <div key={label} className={`px-2 py-1 rounded border ${selectedLabel === label ? 'bg-purple-50 border-purple-300' : 'bg-white'}`}
                   onClick={() => setSelectedLabel(label)}>
                {label}: {Math.round(score * 100)}%
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Destination selection filtered by selected intent */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-2xl font-semibold mb-3">Pick a destination</h2>
        {destError && <p className="text-sm text-red-600">{destError}</p>}
        <PlanDestination onSelect={selectDestination} items={destinations} />
        {/* Custom place entry */}
        <div className="mt-4 flex flex-col gap-2">
          <label className="text-sm text-gray-700">Or type a place name</label>
          <div className="flex gap-2">
            <input
              value={customPlace}
              onChange={(e) => setCustomPlace(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCustomPlace() } }}
              placeholder="e.g., Paris, France"
              className="flex-1 border rounded px-3 py-2"
              disabled={itLoading}
            />
            <button
              onClick={submitCustomPlace}
              disabled={itLoading || !customPlace.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              {itLoading ? 'Generating…' : 'Generate Itinerary'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <label htmlFor="days" className="text-sm text-gray-700">Days</label>
          <input
            id="days"
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 3)}
            className="w-20 border rounded px-2 py-1"
          />
          {selectedDestination && (
            <span className="text-sm text-gray-600">Selected: {selectedDestination}</span>
          )}
        </div>
        <div className="mt-4">
          {itLoading && <p className="text-sm text-gray-600">Generating itinerary…</p>}
          {itError && <p className="text-sm text-red-600">{itError}</p>}
          {itinerary && (
            <div className="border rounded p-4 bg-white">
              <h3 className="text-xl font-semibold mb-2">Itinerary</h3>
              <div className="space-y-4">
                {itinerary.days.map((day, idx) => (
                  <div key={idx} className="border rounded p-3">
                    <div className="font-medium mb-2">Day {idx + 1}{day.date ? ` • ${day.date}` : ''}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="font-semibold mb-1">Activities</div>
                        <ul className="list-disc ml-5 space-y-1">
                          {day.activities.map((a, i) => (<li key={i}>{a}</li>))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Food</div>
                        <ul className="list-disc ml-5 space-y-1">
                          {day.food.map((f, i) => (<li key={i}>{f}</li>))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Sights</div>
                        <ul className="list-disc ml-5 space-y-1">
                          {day.sights.map((s, i) => (<li key={i}>{s}</li>))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {itinerary.notes && (
                <div className="mt-3 text-sm text-gray-700">{itinerary.notes}</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Chat</h1>
        <div ref={chatContainerRef} className="border rounded p-4 h-[60vh] overflow-y-auto bg-white">
          {messages.length === 0 && (
            <div className="text-gray-500 text-sm">Start chatting with the travel assistant.</div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block px-3 py-2 rounded ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>{m.content}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message..."
            className="flex-1 border rounded px-3 py-2"
            disabled={loading}
          />
          <button onClick={send} disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded">
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
      </div>
    </div>
  )
}

export default Home
