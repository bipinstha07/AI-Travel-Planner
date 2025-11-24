import Footer from '../footer/Footer'

export default function ReviewsPage() {
  const reviews = [
    { name: 'Sarah L.', role: 'Solo Traveler', text: 'Travel.AI completely transformed how I plan my trips. The AI suggestions were spot on!', rating: 5 },
    { name: 'Michael C.', role: 'Family Vacation', text: 'Taking the stress out of planning for a family of 4. Highly recommended.', rating: 5 },
    { name: 'Jessica T.', role: 'Digital Nomad', text: 'The best travel companion app I have used. Love the flight tracking features.', rating: 4 },
  ]

  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">User Reviews</h1>
        <div className="grid gap-6">
          {reviews.map((review, i) => (
            <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="flex gap-1 text-orange-500 mb-2">
                {[...Array(review.rating)].map((_, j) => (
                  <span key={j}>★</span>
                ))}
              </div>
              <p className="text-gray-200 mb-4 italic">"{review.text}"</p>
              <div>
                <p className="text-white font-semibold">{review.name}</p>
                <p className="text-gray-400 text-sm">{review.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

