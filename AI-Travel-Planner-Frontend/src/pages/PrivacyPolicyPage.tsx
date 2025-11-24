import Footer from '../footer/Footer'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="text-gray-300 space-y-6 bg-white/5 p-8 rounded-2xl border border-white/10 text-sm leading-relaxed">
          <p className="font-medium text-white">Last Updated: November 24, 2025</p>
          
          <h2 className="text-xl font-bold text-white mt-6">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, plan a trip, 
            or communicate with us. This may include your name, email address, payment information, and travel preferences.
          </p>

          <h2 className="text-xl font-bold text-white mt-6">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, including personalization 
            of your travel itineraries and AI recommendations.
          </p>

          <h2 className="text-xl font-bold text-white mt-6">3. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your personal information from unauthorized access 
            and disclosure.
          </p>
          
          <h2 className="text-xl font-bold text-white mt-6">4. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at privacy@travel.ai.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

