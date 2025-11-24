import Footer from '../footer/Footer'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="max-w-7xl mx-auto w-full grow px-6">
        <h1 className="text-4xl font-bold text-white mb-8">Cookie Policy</h1>
        <div className="text-gray-300 space-y-6 bg-white/5 p-8 rounded-2xl border border-white/10 text-sm leading-relaxed">
          <p>
            Travel.AI uses cookies to improve your experience on our website. This Cookie Policy explains what cookies are, 
            how we use them, and your choices regarding cookies.
          </p>
          
          <h2 className="text-xl font-bold text-white mt-6">What are Cookies?</h2>
          <p>
            Cookies are small text files that are stored on your device when you visit a website. They are widely used to 
            make websites work more efficiently and to provide information to the owners of the site.
          </p>

          <h2 className="text-xl font-bold text-white mt-6">How We Use Cookies</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Essential Cookies:</strong> Necessary for the website to function properly.</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website.</li>
            <li><strong>Preference Cookies:</strong> Allow the website to remember choices you make.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-6">Managing Cookies</h2>
          <p>
            You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer 
            and you can set most browsers to prevent them from being placed.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

