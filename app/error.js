"use client";

export default function GlobalError({ reset }) {
  return (
    <main className="workspace-main">
      <div className="page-frame">
        <section className="state-panel" aria-labelledby="error-heading">
          <h1 id="error-heading" className="section-title">Something went wrong</h1>
          <p className="section-description">Please try loading this page again.</p>
          <button type="button" onClick={reset} className="button-primary">
            Try again
          </button>
        </section>
      </div>
    </main>
  );
}
