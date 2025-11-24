import Footer from '../footer/Footer'
import Pricing from '../component/landing/Pricing'

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-chat">
      <div className="grow">
        <Pricing />
      </div>
      <Footer />
    </div>
  )
}

