export default function Pricing() {
  return (
    <div className="w-full py-20 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">Pricing Made Easy</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-[#0a192f]/40 backdrop-blur-xl rounded-3xl p-8 border border-white/5 hover:border-white/10 transition-all hover:bg-[#0a192f]/50 group h-full flex flex-col">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-1">Free</h3>
              <p className="text-gray-400 text-sm">Basic Plan</p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-gray-400 ml-2 text-lg">/month</span>
              </div>
            </div>
            
            <ul className="space-y-5 mb-8 grow">
              {[
                'Unlimited hours of transcription', 
                'On-device speech recognition', 
                'Unlimited AI chats and summaries', 
                'Real-time proactive suggestions', 
                'Remembers and learns from memories'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm font-light">
                  <div className="mt-0.5 w-5 h-5 rounded-full border border-orange-500/50 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="bg-[#0a192f]/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl hover:border-white/20 transition-all hover:bg-[#0a192f]/70 group h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-orange-500/50 to-transparent"></div>
            
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-1">Pro</h3>
              <p className="text-gray-400 text-sm">30 Days Free</p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-white">$10</span>
                <span className="text-gray-400 ml-2 text-lg">/month</span>
              </div>
            </div>
            
            <ul className="space-y-5 mb-8 grow">
              {[
                'Everything included in Free', 
                'Premium transcription in 100+ languages', 
                'Auto-selection among the best LLMs', 
                'Larger context up to 2 million tokens', 
                'Premium email support within 24 hours'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm font-light">
                  <div className="mt-0.5 w-5 h-5 rounded-full border border-orange-500/50 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
