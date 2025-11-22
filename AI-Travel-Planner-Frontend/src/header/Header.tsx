import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="w-full px-2 py-4 z-50 flex justify-center sticky top-0">
      <div className="flex items-center justify-between w-full max-w-7xl bg-white/90 backdrop-blur-md px-4 py-1 rounded-full shadow-sm border border-white/20 transition-all hover:bg-white/80">
        <Link to="/">
        <div className="flex items-center gap-2">
         <img src="/logo.png" alt="Travel.AI" className="w-10 h-10" />
          <h1 className='text-xl text-gray-900 font-bold tracking-tight'>Travel.AI</h1>
        </div>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="/" className="text-gray-600 hover:text-orange-500 transition-colors font-semibold text-sm">Home</a>
          <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors font-semibold text-sm">Pricing</a>
          <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors font-semibold text-sm">Destinations</a>
          <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors font-semibold text-sm">Flights</a>
          <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors font-semibold text-sm">Hotels</a>
        </nav>
        
        <div>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 font-bold text-sm cursor-pointer transform hover:-translate-y-0.5">
            Create Account
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
