import Footer from '../footer/Footer'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">Features</h1>
        <div className="text-gray-300 space-y-6">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-3">AI Itinerary Planning</h2>
            <p>Generate comprehensive travel itineraries in seconds based on your preferences, budget, and schedule.</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-3">Smart Flight Search</h2>
            <p>Find the best flights with our intelligent search engine that predicts price trends and optimal routes.</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-3">Real-time Updates</h2>
            <p>Get instant notifications about flight changes, weather alerts, and local events at your destination.</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-3">Local Recommendations</h2>
            <p>Discover hidden gems and authentic local experiences tailored to your tastes.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

