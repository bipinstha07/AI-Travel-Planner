import Footer from '../footer/Footer'

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">Contact Us</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="text-gray-300 space-y-6">
            <p className="text-lg">Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
            
            <div>
              <h3 className="text-white font-semibold mb-2">Email</h3>
              <p>support@travel.ai</p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-2">Office</h3>
              <p>123 Innovation Drive<br/>Tech City, TC 90210</p>
            </div>
          </div>
          
          <form className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <input type="text" className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-orange-500 outline-none" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input type="email" className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-orange-500 outline-none" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
              <textarea rows={4} className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-orange-500 outline-none" placeholder="How can we help?"></textarea>
            </div>
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors">
              Send Message
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}

