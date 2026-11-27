"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <main className="workspace-main">
          <div className="page-frame">
            <section className="state-panel" aria-labelledby="global-error-heading">
              <h1 id="global-error-heading" className="section-title">WorkDesk is unavailable</h1>
              <p className="section-description">Please try again in a moment.</p>
              <button type="button" onClick={reset} className="button-primary">
                Try again
              </button>
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}
