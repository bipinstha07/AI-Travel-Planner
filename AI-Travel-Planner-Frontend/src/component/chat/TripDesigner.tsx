import { useState, useEffect } from 'react'

interface TripDesignerProps {
  mode?: 'idle' | 'processing'
}

export default function TripDesigner({ mode = 'idle' }: TripDesignerProps) {
  // State for Processing Mode
  const [analysisStep, setAnalysisStep] = useState(0)
  
  // State for Idle Mode
  const [step, setStep] = useState(0)
  
  const analysisMessages = [
    "Scanning conversation history...",
    "Extracting travel preferences...",
    "Identifying key destinations...",
    "Analyzing budget constraints...",
    "Synthesizing itinerary structure..."
  ]
  
  const idleMessages = [
    "Designing your trip...",
    "Ready to explore?",
    "Crafting your adventure...",
    "Discovering hidden gems..."
  ]

  useEffect(() => {
    if (mode === 'processing') {
      const interval = setInterval(() => {
        setAnalysisStep((prev) => (prev + 1) % analysisMessages.length)
      }, 2000)
      return () => clearInterval(interval)
    } else {
      const interval = setInterval(() => {
        setStep((prev) => (prev + 1) % idleMessages.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [mode])

  // IDLE MODE UI (Planetary Animation)
  if (mode === 'idle') {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-linear-to-b from-white/50 to-blue-50/30 rounded-2xl">
          {/* Background Ambient Effects */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating Particles/Stars */}
          <div className="absolute top-10 left-20 w-2 h-2 bg-blue-400/40 rounded-full animate-twinkle"></div>
          <div className="absolute bottom-20 right-20 w-2 h-2 bg-orange-400/40 rounded-full animate-twinkle" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute top-1/3 right-10 w-1.5 h-1.5 bg-blue-300/40 rounded-full animate-twinkle" style={{ animationDelay: '0.5s' }}></div>
    
          {/* Main Animation Container */}
          <div className="relative w-64 h-64 flex items-center justify-center mb-8">
            
            {/* Outermost Ring - Dashed */}
            <div className="absolute inset-0 rounded-full border border-dashed border-blue-200/50 animate-spin-slower"></div>
            
            {/* Outer Orbit Ring with Plane */}
            <div className="absolute w-48 h-48 rounded-full border border-blue-100 animate-spin-slow">
              <div className="absolute top-1/2 -right-3 -mt-3 transform rotate-90">
                <svg className="w-5 h-5 text-blue-500 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
            </div>
            
            {/* Middle Orbit Ring with Location Pin */}
            <div className="absolute w-32 h-32 rounded-full border border-orange-200/60 animate-spin-reverse-slow">
              <div className="absolute -left-2.5 top-1/2 -mt-2.5">
                <div className="bg-white p-0.5 rounded-full shadow-sm">
                    <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                </div>
              </div>
            </div>
    
            {/* Center Core */}
            <div className="relative z-10">
                {/* Pulsing Core */}
                <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-orange-500 rounded-full blur-md animate-pulse opacity-50"></div>
                
                {/* Central Icon Container */}
                <div className="relative bg-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center border-4 border-white/50 backdrop-blur-sm">
                    <svg className="w-8 h-8 text-transparent bg-clip-text bg-linear-to-br from-blue-600 to-orange-500 animate-float" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="1.5">
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2563EB" />
                                <stop offset="100%" stopColor="#EA580C" />
                            </linearGradient>
                        </defs>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
          </div>
    
          {/* Dynamic Text Content */}
          <div className="text-center z-10 max-w-md mx-auto px-4">
            <div className="h-8 mb-1 overflow-hidden">
                <h2 key={step} className="text-xl font-bold text-gray-800 tracking-tight animate-fade-in-up">
                    {idleMessages[step]}
                </h2>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-gray-500 font-medium text-xs">Using AI to craft your itinerary</p>
              
              {/* Loading Dots */}
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )
  }

  // PROCESSING MODE UI (Analysis Animation)
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-white/50 backdrop-blur-sm rounded-2xl">
      
      {/* Main Analysis Container */}
      <div className="relative w-72 h-80 bg-white/40 border border-white/50 rounded-2xl shadow-xl overflow-hidden flex flex-col mb-8 backdrop-blur-md">
        
        {/* Header Bar */}
        <div className="h-8 bg-gray-100/50 border-b border-gray-200/30 flex items-center px-3 gap-2">
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/60"></div>
            </div>
            <div className="flex-1 text-[10px] text-gray-400 font-mono text-center">ANALYSIS_MODE</div>
        </div>
        
        {/* Chat Simulation Area */}
        <div className="flex-1 p-4 space-y-3 relative">
            {/* Scanning Beam */}
            <div className="absolute left-0 w-full h-16 bg-linear-to-b from-blue-500/0 via-blue-500/10 to-blue-500/0 border-y border-blue-400/20 animate-scan pointer-events-none z-10 backdrop-blur-[1px]"></div>

            {/* Simulated Bubbles */}
            <div className="w-3/4 h-10 bg-gray-100/80 rounded-2xl rounded-tl-none border border-white/60 shadow-sm animate-pulse" style={{ animationDelay: '0.1s' }}>
                <div className="h-full flex items-center px-3 gap-2">
                    <div className="w-16 h-1.5 bg-gray-300/50 rounded-full"></div>
                    <div className="w-8 h-1.5 bg-gray-300/50 rounded-full"></div>
                </div>
            </div>

            <div className="w-2/3 h-10 bg-blue-50/80 rounded-2xl rounded-tr-none border border-blue-100/60 shadow-sm self-end ml-auto animate-pulse" style={{ animationDelay: '0.5s' }}>
                <div className="h-full flex items-center justify-end px-3 gap-2">
                    <div className="w-12 h-1.5 bg-blue-200/50 rounded-full"></div>
                    <div className="w-20 h-1.5 bg-blue-200/50 rounded-full"></div>
                </div>
            </div>

            <div className="w-4/5 h-16 bg-gray-100/80 rounded-2xl rounded-tl-none border border-white/60 shadow-sm animate-pulse" style={{ animationDelay: '0.9s' }}>
                <div className="h-full flex flex-col justify-center px-3 gap-2">
                    <div className="w-full h-1.5 bg-gray-300/50 rounded-full"></div>
                    <div className="w-3/4 h-1.5 bg-gray-300/50 rounded-full"></div>
                    <div className="w-1/2 h-1.5 bg-gray-300/50 rounded-full"></div>
                </div>
            </div>

            {/* Extracted Data Tags (Floating up) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                 <div className="absolute top-[40%] right-[20%] px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded border border-orange-200 shadow-sm animate-float" style={{ animationDuration: '4s' }}>
                    Destinations
                 </div>
                 <div className="absolute bottom-[30%] left-[20%] px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded border border-blue-200 shadow-sm animate-float" style={{ animationDelay: '1.5s', animationDuration: '5s' }}>
                    Budget
                 </div>
                 <div className="absolute top-[20%] left-[10%] px-2 py-0.5 bg-purple-100 text-purple-600 text-[10px] font-bold rounded border border-purple-200 shadow-sm animate-float" style={{ animationDelay: '2.5s', animationDuration: '4.5s' }}>
                    Dates
                 </div>
            </div>
        </div>
        
        {/* Processing Footer */}
        <div className="h-10 bg-white/50 border-t border-gray-200/30 flex items-center px-4 justify-between">
            <div className="flex gap-1">
                <div className="w-1 h-3 bg-blue-500/40 rounded-full animate-pulse"></div>
                <div className="w-1 h-4 bg-blue-500/60 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-2 bg-blue-500/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-5 bg-blue-500/80 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-1 h-3 bg-blue-500/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <div className="text-[10px] text-blue-500 font-mono animate-pulse">PROCESSING</div>
        </div>
      </div>

      {/* Dynamic Text Content */}
      <div className="text-center z-10 max-w-md mx-auto px-4">
        <div className="h-6 mb-2 overflow-hidden">
            <p key={analysisStep} className="text-sm font-semibold text-gray-500 uppercase tracking-widest animate-fade-in-up">
                {analysisMessages[analysisStep]}
            </p>
        </div>
        
        <h2 className="text-xl font-bold text-gray-800">Analyzing Conversation</h2>
      </div>
    </div>
  )
}
