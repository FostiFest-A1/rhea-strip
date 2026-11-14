import { AssetSelect } from "@/components/landing/asset-select";
import { BottomBlur } from "@/components/landing/bottom-blur";
import { FaqSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { MarketTicker } from "@/components/landing/market-ticker";
import { Problems } from "@/components/landing/problems";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { ChromeCta } from "@/components/ui/chrome-cta";

export default function LandingPage() {
  return (
    <>
      <ScrollProgress />
      <LandingNav />
      <main>
        <Hero />
        <Problems />
        <MarketTicker />
        <AssetSelect />
        <FaqSection />
      </main>
      <Footer />
      <BottomBlur />
      <div className="pointer-events-none fixed inset-x-0 bottom-10 z-50 flex justify-center">
        <ChromeCta href="/strip" className="pointer-events-auto">
          Start stripping
        </ChromeCta>
      </div>
    </>
  );
}
