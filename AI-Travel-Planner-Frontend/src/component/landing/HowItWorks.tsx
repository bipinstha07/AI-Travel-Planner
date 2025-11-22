import { useEffect, useState } from 'react'

const ChatMockup = () => {
  const [visible, setVisible] = useState([false, false, false])
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setVisible([true, false, false]), 500),
      setTimeout(() => setVisible([true, true, false]), 1500),
      setTimeout(() => setVisible([true, true, true]), 2500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="w-full h-full bg-[#0f172a] p-4 flex flex-col gap-3 rounded-xl overflow-hidden border border-white/10 relative font-sans">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
        <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
      </div>

      {/* Messages */}
      <div className={`self-end max-w-[85%] bg-orange-500 text-white text-[10px] leading-tight px-3 py-2 rounded-2xl rounded-tr-sm transition-all duration-500 ${visible[0] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        Plan a trip to Kathmandu
      </div>
      
      <div className={`self-start max-w-[85%] bg-white/10 text-gray-200 text-[10px] leading-tight px-3 py-2 rounded-2xl rounded-tl-sm backdrop-blur-sm border border-white/5 transition-all duration-500 ${visible[1] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        Great! When would you like to start your trip?
      </div>
      
      <div className={`self-end max-w-[85%] bg-orange-500 text-white text-[10px] leading-tight px-3 py-2 rounded-2xl rounded-tr-sm transition-all duration-500 ${visible[2] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        Next week for 6 days
      </div>
      
      {/* Input Area */}
      <div className="mt-auto pt-2 flex gap-2">
         <div className="h-6 flex-1 bg-white/5 rounded-full border border-white/5"></div>
         <div className="h-6 w-6 bg-orange-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
         </div>
      </div>
    </div>
  )
}

const AnalysisMockup = () => (
  <div className="w-full h-full bg-white/95 p-4 flex flex-col items-center justify-center relative rounded-xl overflow-hidden border border-white/20">
     {/* Scanning Line */}
     <div className="absolute inset-0 bg-linear-to-b from-transparent via-blue-400/10 to-transparent animate-scan z-10"></div>
     
     {/* Header */}
     <div className="absolute top-0 left-0 right-0 h-6 bg-gray-50 border-b border-gray-100 flex items-center justify-center">
        <span className="text-[8px] font-mono text-gray-400 tracking-widest">ANALYSIS_MODE</span>
     </div>

     {/* Floating Tags */}
     <div className="w-full h-full relative mt-4">
        <div className="absolute top-[20%] left-[10%] bg-white shadow-sm border border-purple-100 px-2 py-1 rounded-md text-[9px] font-bold text-purple-600 animate-float" style={{animationDelay: '0s'}}>
          Dates: Nov 29
        </div>
        <div className="absolute top-[45%] right-[10%] bg-white shadow-sm border border-orange-100 px-2 py-1 rounded-md text-[9px] font-bold text-orange-600 animate-float" style={{animationDelay: '1s'}}>
          Destinations: Kathmandu
        </div>
        <div className="absolute bottom-[25%] left-[20%] bg-white shadow-sm border border-blue-100 px-2 py-1 rounded-md text-[9px] font-bold text-blue-600 animate-float" style={{animationDelay: '2s'}}>
          Budget: Luxury
        </div>
     </div>
     
     <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-50 border-t border-gray-100 flex items-center px-3 gap-2">
        <div className="flex gap-0.5 items-end h-3">
            <div className="w-0.5 h-2 bg-blue-400 animate-pulse"></div>
            <div className="w-0.5 h-3 bg-blue-400 animate-pulse" style={{animationDelay: '0.1s'}}></div>
            <div className="w-0.5 h-1 bg-blue-400 animate-pulse" style={{animationDelay: '0.2s'}}></div>
        </div>
        <span className="text-[8px] font-mono text-blue-500 ml-auto">PROCESSING</span>
     </div>
  </div>
)

const PlanetaryMockup = () => (
  <div className="w-full h-full bg-[#0f172a] flex items-center justify-center relative rounded-xl overflow-hidden border border-white/10">
    <div className="absolute w-[140%] h-[140%] bg-blue-500/5 rounded-full blur-xl"></div>
    
    <div className="absolute w-32 h-32 border border-blue-500/20 rounded-full animate-spin-slow"></div>
    <div className="absolute w-24 h-24 border border-orange-500/20 rounded-full animate-spin-reverse-slow"></div>
    <div className="absolute w-40 h-40 border border-dashed border-white/10 rounded-full animate-spin-slower"></div>
    
    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center border border-white/20 z-10">
        <svg className="w-6 h-6 text-white animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    </div>
    
    <div className="absolute bottom-6 text-center">
        <p className="text-[10px] text-gray-400 font-medium tracking-wider">CRAFTING ITINERARY</p>
    </div>
  </div>
)

const ItineraryMockup = () => (
  <div className="w-full h-full bg-white p-4 flex flex-col rounded-xl overflow-hidden shadow-lg border border-gray-100 relative">
    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-400 to-orange-600"></div>
    
    <div className="mt-2 flex items-center justify-between mb-6">
        <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 mb-1">NYC</div>
            <span className="text-[8px] text-gray-400 uppercase">Origin</span>
        </div>
        <div className="flex-1 h-px bg-gray-200 mx-2 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300 transform rotate-90">✈</div>
        </div>
        <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 mb-1">KTM</div>
            <span className="text-[8px] text-gray-400 uppercase">Dest</span>
        </div>
    </div>
    
    <div className="bg-gray-50 rounded-lg p-2 mb-3 border border-gray-100">
        <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-bold text-gray-700">29 Nov - 04 Dec</span>
            <span className="text-[8px] text-gray-400">5 Nights</span>
        </div>
    </div>

    <div className="flex gap-2 mt-auto">
        <span className="px-2 py-1 bg-orange-50 text-orange-600 text-[8px] font-semibold rounded-full border border-orange-100">Adventure</span>
        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[8px] font-semibold rounded-full border border-blue-100">Luxury</span>
    </div>
  </div>
)

const steps = [
  {
    component: <ChatMockup />,
    title: "Chat with AI",
    desc: "Share your dream trip ideas naturally."
  },
  {
    component: <AnalysisMockup />,
    title: "Analysis",
    desc: "AI understands your style & needs."
  },
  {
    component: <PlanetaryMockup />,
    title: "Processing",
    desc: "Scanning thousands of options instantly."
  },
  {
    component: <ItineraryMockup />,
    title: "Your Itinerary",
    desc: "Get a complete, personalized daily plan."
  }
]

export default function HowItWorks() {
  return (
    <div className="w-full py-16 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
                <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wider uppercase mb-4 inline-block">
                    Simple Process
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
                    How It Works
                </h2>
                <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
                    From conversation to your dream vacation in four easy steps.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative">
                {steps.map((step, idx) => (
                    <div key={idx} className="group relative">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 hover:border-orange-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/5 h-full flex flex-col">
                            
                            {/* Live UI Mockup Container */}
                            <div className="relative w-full aspect-9/12 rounded-xl overflow-hidden mb-4 bg-gray-900/50 border border-white/5 group-hover:border-white/10 transition-colors">
                                {step.component}
                            </div>

                            {/* Text Content */}
                            <div className="text-center relative z-10 mt-auto">
                                <h3 className="text-sm md:text-base font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">
                                    {step.title}
                                </h3>
                                <p className="text-xs text-gray-400 leading-relaxed px-1">
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  )
}
