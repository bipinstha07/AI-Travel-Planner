function PlanDestination() {
  const destinations = [
    {
      city: "Paris, France",
      title: "Explore the City of Lights",
      attractions: "Eiffel Tower, Louvre & more",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=600&fit=crop"
    },
    {
      city: "New York, USA",
      title: "Experience NYC",
      attractions: "Times Square, Central Park, Broadway",
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=600&fit=crop"
    },
    {
      city: "Tokyo, Japan",
      title: "Discover Tokyo",
      attractions: "Shibuya, Cherry Blossoms, Temples",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=600&fit=crop"
    },
    {
      city: "Rome, Italy",
      title: "Walk through History",
      attractions: "Colosseum, Roman Forum",
      image: "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=400&h=600&fit=crop"
    }
  ]

  return (
    <div className="w-full overflow-x-auto px-6 py-8">
      <div className="flex gap-6 max-w-7xl mx-auto">
        {destinations.map((destination, index) => (
          <div
            key={index}
            className="group relative shrink-0 w-72 h-96 rounded-3xl overflow-hidden shadow-lg transition-transform duration-300 ease-in-out hover:scale-105 cursor-pointer"
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-in-out group-hover:scale-110"
              style={{
                backgroundImage: `url(${destination.image})`
              }}
            />
            
            {/* Dark Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
            
            {/* Content */}
            <div className="relative h-full flex flex-col justify-between p-6 text-white">
              {/* City Name - Top */}
              <div className="text-sm font-light text-white/90">
                {destination.city}
              </div>
              
              {/* Title and Attractions - Bottom */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold leading-tight">
                  {destination.title}
                </h3>
                <p className="text-lg font-semibold text-white/95">
                  {destination.attractions}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PlanDestination
