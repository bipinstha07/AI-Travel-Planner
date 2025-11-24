import Footer from '../footer/Footer'

export default function DestinationsPage() {
  const popularDestinations = [
    { city: 'Paris', country: 'France', image: '🗼' },
    { city: 'Tokyo', country: 'Japan', image: '🗼' },
    { city: 'New York', country: 'USA', image: '🗽' },
    { city: 'London', country: 'UK', image: '🎡' },
    { city: 'Rome', country: 'Italy', image: '🏛️' },
    { city: 'Bali', country: 'Indonesia', image: '🏝️' }
  ]

  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">Popular Destinations</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularDestinations.map((dest, i) => (
            <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{dest.image}</div>
              <h3 className="text-xl font-bold text-white">{dest.city}</h3>
              <p className="text-gray-400">{dest.country}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

