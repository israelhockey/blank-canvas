import { useCallback, useState } from "react";

import { pagePath, pageBySlug, type ContentPage } from "@/lib/seo-pages";
import {
  BUSINESS,
  CITIES,
  ITEMS,
  PRESETS,
  DEFAULT_PRESET,
  cityParam,
  totals,
  type Quantities,
} from "@/lib/site-data";
import { Commercial } from "./Commercial";
import { Pricing } from "./Pricing";
import { ExitIntent } from "./ExitIntent";
import { QuickLead, openQuickLead } from "./QuickLead";
import { FinalCta, Footer, Header, MobileBar, WhatsAppFab } from "./Sections";

function startQuantities(preset?: Quantities): Quantities {
  const fallback = PRESETS.find((x) => x.id === DEFAULT_PRESET)?.q ?? {};
  const src = preset ?? fallback;
  return Object.fromEntries(ITEMS.map((i) => [i.id, src[i.id] ?? 0]));
}

/** A service page or guide: real copy for Google, then the price builder so readers can book. */
export function ContentPageView({ page }: { page: ContentPage }) {
  const [q, setQ] = useState<Quantities>(() => startQuantities(page.preset));
  const [preset, setPreset] = useState<string | null>(null);
  const [inPricing, setInPricing] = useState(false);
  const onVisible = useCallback((v: boolean) => setInPricing(v), []);
  const section = page.kind === "service" ? "Services" : "Guides";
  const topic = page.serviceType ?? page.h1.replace(/\?$/, "");
  const local = page.commercial
    ? ["#faq", "#areas", "#commercial"]
    : ["#pricing", "#book", "#faq", "#areas"];

  return (
    <div className="ss-site">
      <Header local={local} />
      <main id="top">
        <section className="cp-hero">
          <div className="wrap cp-hero-in">
            <div className="cp-hero-text">
              <nav className="crumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">›</span>
                <span>{section}</span>
                <span aria-hidden="true">›</span>
                <span aria-current="page">{topic}</span>
              </nav>
              <p className="eyebrow">{page.eyebrow}</p>
              <h1>{page.h1}</h1>
              <p className="lede">{page.intro}</p>
              {page.price && <p className="cp-price">{page.price}</p>}
              <div className="cp-ctas">
                <a className="btn btn-primary" href={page.commercial ? "#commercial" : "#pricing"}>
                  {page.commercial ? "Request a free walkthrough" : "See my price"}
                </a>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => openQuickLead("quick")}
                >
                  Text me a quote
                </button>
                <a className="btn btn-ghost hide-sm" href={BUSINESS.phoneHref}>
                  Call {BUSINESS.phoneDisplay}
                </a>
              </div>
              <ul className="cp-trust">
                <li>No deposit</li>
                <li>Pay after the job</li>
                <li>Dry in hours</li>
                <li>100% satisfaction guarantee</li>
              </ul>
            </div>
            <img
              className="cp-hero-img"
              src={page.image}
              alt={page.imageAlt}
              width={640}
              height={480}
            />
          </div>
        </section>

        <article className="cp-body">
          <div className="wrap cp-article">
            {page.blocks.map((b) => (
              <section key={b.h}>
                <h2>{b.h}</h2>
                {b.p.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
                {b.list && (
                  <ul>
                    {b.list.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section id="areas">
              <h2>{page.kind === "service" ? `${topic} near you` : "Where we clean"}</h2>
              <p>
                Simple Surface Carpet Cleaning is based in Fort Worth and serves Tarrant County.
                Pick your city for local details:
              </p>
              <ul className="cp-cities">
                {CITIES.map((c) => (
                  <li key={c.slug}>
                    <a href={`/carpet-cleaning/${cityParam(c)}`}>
                      {page.kind === "service"
                        ? `${topic} in ${c.name}`
                        : `Carpet cleaning in ${c.name}`}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </article>

        {page.commercial ? (
          <Commercial />
        ) : (
          <Pricing q={q} setQ={setQ} preset={preset} setPreset={setPreset} onVisible={onVisible} />
        )}

        <section className="why" id="faq">
          <div className="wrap cp-article">
            <h2>{topic}: questions</h2>
            <div className="cp-faq">
              {page.faqs.map(([qq, a]) => (
                <details key={qq}>
                  <summary>{qq}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cp-related">
          <div className="wrap">
            <h2>Keep reading</h2>
            <div className="cp-related-grid">
              {page.related
                .map((s) => pageBySlug(s))
                .filter((p): p is ContentPage => !!p)
                .map((p) => (
                  <a key={p.slug} className="cp-card" href={pagePath(p)}>
                    <span className="eyebrow">{p.kind === "service" ? "Service" : "Guide"}</span>
                    <b>{p.h1}</b>
                    <span>{p.description}</span>
                  </a>
                ))}
            </div>
          </div>
        </section>

        <FinalCta />
      </main>
      <Footer />
      <MobileBar
        total={totals(q).total}
        inPricing={inPricing}
        cta={page.commercial ? { href: "#commercial", label: "Free walkthrough" } : undefined}
      />
      <QuickLead q={q} />
      <ExitIntent total={totals(q).total} />
      <WhatsAppFab onOpen={() => openQuickLead("whatsapp")} />
    </div>
  );
}
