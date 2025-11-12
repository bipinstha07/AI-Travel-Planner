
function Header() {
  return (
    <>
    <div className="flex items-center justify-between w-full px-6 py-2 border-b border-gray-200/50 backdrop-blur-sm">
      <div className="flex items-center">
       
        <h1 className='text-lg text-gray-800 font-light ml-2'> <a href="/" className="hover:text-blue-600 transition-colors">AI Travel Planner</a></h1>
      </div>
      
      <nav className="flex items-center space-x-8">
        <a href="#" className="text-gray-600 hover:text-gray-800 transition-colors font-medium text-sm">Home</a>
        <a href="#" className="text-gray-600 hover:text-gray-800 transition-colors font-medium text-sm">Pricing</a>
        <a href="#" className="text-gray-600 hover:text-gray-800 transition-colors font-medium text-sm">Contact Us</a>
      </nav>
      
      <div>
        <button className="bg-blue-500 text-white px-4 py-1.5 rounded-full hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md font-medium text-sm">
          Create Account
        </button>
      </div>
    </div>
    </>
  )
}

export default Header
