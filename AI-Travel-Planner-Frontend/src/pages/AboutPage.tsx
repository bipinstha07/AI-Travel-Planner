import Footer from '../footer/Footer'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">About Travel.AI</h1>
        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 space-y-6 text-gray-300 leading-relaxed">
          <p>
            Travel.AI was born from a simple idea: travel planning should be as enjoyable as the trip itself. 
            We leverage cutting-edge Artificial Intelligence to personalize every aspect of your journey.
          </p>
          <p>
            Our mission is to empower travelers to explore the world with confidence, saving time on logistics 
            so they can focus on making memories. Whether you're a backpacker, a luxury traveler, or planning 
            a family reunion, our AI adapts to your unique style.
          </p>
          <p>
            Founded in 2024, we are a diverse team of travelers, engineers, and designers passionate about 
            reimagining the future of travel.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

