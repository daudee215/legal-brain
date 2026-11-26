import { Hero } from '../components/marketing/Hero';
import { MarketingNav } from '../components/marketing/Nav';
import { Bento, Chambers, CourtsMarquee, CTA, FAQ, Footer, HowItWorks, Pricing, ProductPreview, Stats, Statement, WhoWeServe } from '../components/marketing/Sections';

export default function Landing() {
  return (
    <div className="overflow-x-clip bg-cream">
      <MarketingNav />
      <main>
        <Hero />
        <Statement />
        <Stats />
        <WhoWeServe />
        <ProductPreview />
        <Bento />
        <CourtsMarquee />
        <Chambers />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
