import Footer from '../footer/Footer'

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">Travel Blog</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { title: 'The Future of AI in Travel', date: 'Oct 15, 2025', snippet: 'How artificial intelligence is reshaping the way we explore the world.' },
            { title: 'Top 10 Hidden Gems in Europe', date: 'Sep 28, 2025', snippet: 'Discover the places the guidebooks don\'t tell you about.' },
            { title: 'Sustainable Travel Tips', date: 'Sep 10, 2025', snippet: 'Eco-friendly ways to travel without breaking the bank.' },
            { title: 'Packing Like a Pro', date: 'Aug 22, 2025', snippet: 'The ultimate guide to packing light for any adventure.' }
          ].map((post, i) => (
            <div key={i} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all group">
              <div className="h-48 bg-slate-700/50 flex items-center justify-center text-gray-500">
                [Image Placeholder]
              </div>
              <div className="p-6">
                <p className="text-orange-400 text-xs mb-2">{post.date}</p>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">{post.title}</h3>
                <p className="text-gray-400 text-sm">{post.snippet}</p>
                <button className="mt-4 text-white text-sm font-medium border-b border-orange-500 pb-0.5">Read More</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

