import React from 'react'

interface DestinationPlaceProps {
  name: string
  country: string
  image: string
}

const DestinationPlace: React.FC<DestinationPlaceProps> = ({ name, country, image }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-48 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      {/* Destination Image */}
      <div className="h-24 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm truncate">{name}</h3>
        <p className="text-xs text-gray-500 mt-1">{country}</p>
      </div>
    </div>
  )
}

export default DestinationPlace

