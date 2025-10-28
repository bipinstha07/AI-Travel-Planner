function Home() {
  return (
    <>
    <div className='bg-white h-[90vh] flex flex-col items-center justify-center px-4'>
      <h1 className='text-2xl md:text-4xl text-gray-800 font-light mb-8 text-center'>
        What’s on the agenda today?
      </h1>

      <div className='w-full max-w-3xl'>
        <div className='flex items-center gap-3 bg-white rounded-full  shadow-md  px-4 py-3'>
          {/* Left: plus icon button */}
         

          {/* Input */}
          <input
            className='flex-1 outline-none text-gray-800 placeholder:text-gray-400'
            placeholder='Ask anything'
          />

          

          {/* Wave icon in blue pill */}
          <button className='h-9 w-9 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 transition-colors' aria-label='Send'>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' className='h-5 w-5 text-blue-700'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

export default Home
