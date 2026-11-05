import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_PRESET,
  ITEMS,
  decodeQuantities,
  PRESETS,
  totals,
  type City,
  type Quantities,
} from "@/lib/site-data";
import { Commercial } from "./Commercial";
import { Pricing } from "./Pricing";
import { QuickLead, openQuickLead } from "./QuickLead";
import {
  AreasFaq,
  CityIntro,
  FinalCta,
  Footer,
  Gallery,
  Guarantee,
  Header,
  Hero,
  HowItWorks,
  MobileBar,
  Notice,
  PromiseStrip,
  Services,
  Why,
} from "./Sections";

function presetQuantities(id: string): Quantities {
  const p = PRESETS.find((x) => x.id === id);
  return Object.fromEntries(ITEMS.map((i) => [i.id, p?.q[i.id] ?? 0]));
}

/** The whole one-page site. City pages pass `city` to localize the hero and add a local intro. */
export function SitePage({ city }: { city?: City }) {
  const [q, setQ] = useState<Quantities>(() => presetQuantities(DEFAULT_PRESET));
  const [preset, setPreset] = useState<string | null>(DEFAULT_PRESET);
  const [inPricing, setInPricing] = useState(false);
  const onVisible = useCallback((v: boolean) => setInPricing(v), []);

  // A "send me this price" email links back with ?q=room:3,sofa:1 so the builder is pre-filled.
  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get("q");
    const parsed = saved ? decodeQuantities(saved) : null;
    if (parsed) {
      setQ(parsed);
      setPreset(null);
    }
  }, []);

  return (
    <div className="ss-site">
      <Notice />
      <Header />
      <main id="top">
        <Hero city={city} />
        <PromiseStrip />
        {city && <CityIntro city={city} />}
        <Why />
        <Pricing q={q} setQ={setQ} preset={preset} setPreset={setPreset} onVisible={onVisible} />
        <Services />
        <HowItWorks />
        <Guarantee />
        <Commercial />
        <Gallery />
        <AreasFaq city={city} />
        <FinalCta />
      </main>
      <Footer />
      <MobileBar total={totals(q).total} inPricing={inPricing} />
      <QuickLead q={q} />
      <button
        type="button"
        className="wa-fab"
        onClick={() => openQuickLead("whatsapp")}
        aria-label="Get a quote on WhatsApp"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20.5l1.8-5.2A8.4 8.4 0 1 1 21 11.5z" />
        </svg>
        <span>WhatsApp</span>
      </button>
    </div>
  );
}
