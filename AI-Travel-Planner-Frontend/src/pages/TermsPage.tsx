import Footer from '../footer/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <div className="text-gray-300 space-y-6 bg-white/5 p-8 rounded-2xl border border-white/10 text-sm leading-relaxed">
          <p className="font-medium text-white">Last Updated: November 24, 2025</p>
          
          <h2 className="text-xl font-bold text-white mt-6">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Travel.AI, you agree to be bound by these Terms of Service and all applicable laws and regulations.
          </p>

          <h2 className="text-xl font-bold text-white mt-6">2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials (information or software) on Travel.AI's website for personal, non-commercial transitory viewing only.
          </p>

          <h2 className="text-xl font-bold text-white mt-6">3. Disclaimer</h2>
          <p>
            The materials on Travel.AI's website are provided on an 'as is' basis. Travel.AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

