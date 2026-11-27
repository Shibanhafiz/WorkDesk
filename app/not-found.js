import Link from "next/link";

export default function NotFound() {
  return (
    <main className="workspace-main">
      <div className="page-frame">
        <section className="state-panel" aria-labelledby="not-found-heading">
          <p className="section-kicker">404</p>
          <h1 id="not-found-heading" className="section-title">Page not found</h1>
          <p className="section-description">The page may have moved or you may not have access to it.</p>
          <Link href="/" className="button-primary">Back to overview</Link>
        </section>
      </div>
    </main>
  );
}
