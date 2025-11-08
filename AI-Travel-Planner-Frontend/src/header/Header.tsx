import logo from '../../public/logo.png'

function Header() {
  return (
    <>
    <div className="flex items-center justify-between w-full px-6 shadow-sm border-b border-gray-200">
      <div className="flex items-center">
        <img src={logo} alt="logo" className='w-20 h-20 ' />
        <h1 className='text-3xl text-green-600 font-bold'> <a href="/">AI Travel Planner</a></h1>
      </div>
      
      <nav className="flex items-center space-x-8">
        <a href="#/" className="text-gray-700 hover:text-gray-900">Home</a>
      </nav>
      
      <div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
          Create Account
        </button>
      </div>
    </div>
    </>
  )
}

export default Header
