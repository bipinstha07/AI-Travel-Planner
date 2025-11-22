import { useState } from 'react'

const faqs = [
  {
    question: "How does the AI Travel Planner work?",
    answer: "Our AI analyzes your preferences, budget, and travel dates to generate a personalized itinerary. It scans thousands of flights, hotels, and attractions to create a trip plan tailored just for you, which you can then refine through conversation."
  },
  {
    question: "Is the travel itinerary customizable?",
    answer: "Absolutely! The initial itinerary is a starting point. You can ask the AI to change specific days, swap activities, find different hotels, or adjust the pacing of your trip at any time."
  },
  {
    question: "Can I book flights and hotels directly?",
    answer: "Currently, we provide direct links to booking platforms for flights and hotels. In the future, we plan to integrate direct booking capabilities to make the process even smoother."
  },
  {
    question: "Is my personal data secure?",
    answer: "Yes, we take data privacy seriously. Your travel preferences and personal information are encrypted and used solely to improve your travel planning experience. We do not sell your data to third parties."
  },
  {
    question: "What makes this different from other travel sites?",
    answer: "Unlike traditional booking sites that just list options, we act as a travel agent. We understand context, budget, and preferences to build a cohesive daily plan, saving you hours of research time."
  },
  {
    question: "Is there a free version available?",
    answer: "Yes, we offer a free tier that allows you to generate basic itineraries. For advanced features like unlimited chat history, premium hotel recommendations, and multi-city planning, we offer affordable premium plans."
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="w-full py-20 px-4 bg-transparent">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16 tracking-tight">
          FAQs
        </h2>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 hover:bg-white/10"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none group"
              >
                <span className="text-lg font-medium text-white/90 group-hover:text-white transition-colors">
                  {faq.question}
                </span>
                <span className={`flex-shrink-0 ml-4 w-8 h-8 rounded-full flex items-center justify-center border border-white/20 transition-all duration-300 ${openIndex === index ? 'bg-orange-500 border-orange-500 rotate-45' : 'bg-transparent text-white group-hover:border-white/40'}`}>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-300 ${openIndex === index ? 'text-white' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-6 pt-0 text-gray-300 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

