export default function TripDesigner() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Center Animation Container */}
      <div className="relative w-64 h-64 flex items-center justify-center mb-8">
        
        {/* Outer Orbit Ring */}
        <div className="absolute inset-0 rounded-full border border-blue-200/30 animate-spin-slower"></div>
        
        {/* Middle Orbit Ring with Planet */}
        <div className="absolute w-48 h-48 rounded-full border border-blue-300/50 animate-spin-reverse-slow">
          {/* Planet Dot */}
          <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
        </div>
        
        {/* Inner Orbit Ring */}
        <div className="absolute w-32 h-32 rounded-full border border-blue-400/30 animate-spin-slow"></div>

        {/* Center Star/Sparkle Icon */}
        <div className="relative z-10 text-blue-500 animate-pulse">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 17L18.5 20L20 17L23 15.5L20 14L18.5 11L17 14L14 15.5L17 17Z" fill="currentColor" className="scale-50 origin-center translate-x-2 -translate-y-2 opacity-60"/>
            <path d="M5 17L6.5 20L8 17L11 15.5L8 14L6.5 11L5 14L2 15.5L5 17Z" fill="currentColor" className="scale-50 origin-center -translate-x-2 -translate-y-2 opacity-60"/>
          </svg>
        </div>
        
        {/* Background Glow */}
        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full animate-pulse"></div>
      </div>

      {/* Text Content */}
      <div className="text-center z-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-3 tracking-tight">Designing your trip...</h2>
        
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <p className="text-gray-500 font-medium">Analyzing flight paths & hidden gems</p>
        </div>
      </div>
    </div>
  )
}

