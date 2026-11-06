import { pagePath, type ContentPage } from "@/lib/seo-pages";
import { QuickLead, openQuickLead } from "./QuickLead";
import { FinalCta, Footer, Header, MobileBar, WhatsAppFab } from "./Sections";

/** /services and /guides: a list of every page in that group. */
export function HubPage({
  eyebrow,
  title,
  intro,
  pages,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  pages: ContentPage[];
}) {
  return (
    <div className="ss-site">
      <Header local={[]} />
      <main id="top">
        <section className="cp-hero">
          <div className="wrap">
            <nav className="crumbs" aria-label="Breadcrumb">
              <a href="/">Home</a>
              <span aria-hidden="true">›</span>
              <span aria-current="page">{title}</span>
            </nav>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="lede">{intro}</p>
          </div>
        </section>
        <section className="cp-related">
          <div className="wrap">
            <div className="cp-related-grid">
              {pages.map((p) => (
                <a key={p.slug} className="cp-card" href={pagePath(p)}>
                  <img src={p.image} alt="" loading="lazy" />
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
      <MobileBar total={0} inPricing={false} cta={{ href: "/#pricing", label: "Get my price" }} />
      <QuickLead q={{}} />
      <WhatsAppFab onOpen={() => openQuickLead("whatsapp")} />
    </div>
  );
}
