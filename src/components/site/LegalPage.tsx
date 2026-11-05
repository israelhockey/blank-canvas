import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { BUSINESS } from "@/lib/site-data";
import { Footer } from "./Sections";

/** Simple shell for the Privacy Policy and Terms pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="ss-site">
      <header className="site">
        <div className="wrap">
          <Link className="brand" to="/" aria-label="Simple Surface Carpet Cleaning home">
            <span className="brand-mark">
              <img src="/brand/mark-192.png" alt="" width={40} height={40} />
            </span>
            <span>
              <b>Simple Surface</b>
              <small>{BUSINESS.tagline}</small>
            </span>
          </Link>
          <a className="btn btn-primary" href="/#pricing">
            See prices
          </a>
        </div>
      </header>
      <main>
        <section>
          <div className="wrap legal-doc">
            <p className="eyebrow">Last updated {updated}</p>
            <h1 style={{ marginTop: 10 }}>{title}</h1>
            {children}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
