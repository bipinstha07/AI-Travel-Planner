import Footer from '../footer/Footer'

export default function CareersPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">Join Our Team</h1>
        <div className="mb-8 text-gray-300">
          <p>We are always looking for talented individuals to join our mission. Check out our open positions below.</p>
        </div>
        
        <div className="space-y-4">
          {['Senior Full Stack Engineer', 'AI Research Scientist', 'Product Designer', 'Marketing Specialist'].map((role, i) => (
            <div key={i} className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
              <div>
                <h3 className="text-xl font-bold text-white">{role}</h3>
                <p className="text-gray-400 text-sm">Remote / Hybrid</p>
              </div>
              <button className="mt-4 md:mt-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium">
                Apply Now
              </button>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

