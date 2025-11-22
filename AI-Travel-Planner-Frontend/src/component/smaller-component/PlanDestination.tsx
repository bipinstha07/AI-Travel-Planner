
interface PlanDestinationProps {
  onDestinationClick?: (city: string) => void
}

function PlanDestination({ onDestinationClick }: PlanDestinationProps) {
  const destinations = [
    {
      city: "Paris, France",
      tag: "ROMANTIC",
      rating: "98%",
      price: "$850",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=800&fit=crop"
    },
    {
      city: "New York, USA",
      tag: "CITY LIFE",
      rating: "96%",
      price: "$620",
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=800&fit=crop"
    },
    {
      city: "Tokyo, Japan",
      tag: "CYBERPUNK",
      rating: "92%",
      price: "$1,200",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=800&fit=crop"
    },
    {
      city: "Rome, Italy",
      tag: "HISTORY",
      rating: "97%",
      price: "$750",
      image: "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=600&h=800&fit=crop"
    }
  ]

  const handleCardClick = (city: string) => {
    if (onDestinationClick) {
      onDestinationClick(city)
    }
  }

  return (
    <div className="w-full overflow-x-auto px-4 py-8 pb-20 no-scrollbar">
      <div className="flex gap-5 w-max mx-auto px-4">
        {destinations.map((destination, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(destination.city)}
            className="group relative shrink-0 w-[300px] h-[420px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ease-in-out hover:-translate-y-2 cursor-pointer border border-white/10"
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-in-out group-hover:scale-110"
              style={{
                backgroundImage: `url(${destination.image})`
              }}
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90" />
            
            {/* Content */}
            <div className="relative h-full flex flex-col justify-between p-6">
              {/* Top Tags */}
              <div className="flex justify-between items-start">
                <div className="bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {destination.tag}
                </div>
                <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  {destination.rating}
                </div>
              </div>
              
              {/* Bottom Info */}
              <div className="flex flex-col gap-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1 leading-tight">
                    {destination.city}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-white/80 text-xs group-hover:text-blue-300 transition-colors font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span>Explore Guide</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-end border-t border-white/20 pt-3 mt-1">
                  <div className="text-white font-bold text-xl tracking-tight">
                    {destination.price}
                  </div>
                  <button className="bg-white/10 hover:bg-blue-600 text-white rounded-full p-2 transition-all duration-300 backdrop-blur-sm border border-white/10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PlanDestination
