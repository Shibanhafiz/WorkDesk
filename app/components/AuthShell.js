import Link from "next/link";

export function AuthBrand() {
  return (
    <Link href="/" className="auth-brand" aria-label="WorkDesk home">
      <span aria-hidden="true" className="brand-mark">W</span>
      <span className="brand-name">WORKDESK</span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div className="auth-preview" aria-hidden="true">
      <div className="auth-preview-header">
        <span className="auth-preview-dot" />
        <span className="auth-preview-dot" />
        <span className="auth-preview-dot" />
        <span className="auth-preview-title">Workspace overview</span>
      </div>
      <div className="auth-preview-body">
        <div className="auth-preview-metrics">
          <div>
            <span className="auth-preview-label">Projects</span>
            <strong>12</strong>
          </div>
          <div>
            <span className="auth-preview-label">In progress</span>
            <strong>08</strong>
          </div>
          <div>
            <span className="auth-preview-label">Completed</span>
            <strong>24</strong>
          </div>
        </div>
        <div className="auth-preview-list">
          <div className="auth-preview-row">
            <span>Website redesign</span>
            <span className="auth-preview-tag">Active</span>
          </div>
          <div className="auth-preview-row">
            <span>Mobile app refresh</span>
            <span className="auth-preview-tag">Planning</span>
          </div>
          <div className="auth-preview-row">
            <span>Q4 campaign</span>
            <span className="auth-preview-tag">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <section className="auth-panel auth-panel-form" aria-label="Account access">
        <div className="auth-inner">
          <AuthBrand />
          {children}
        </div>
      </section>

      <aside className="auth-showcase" aria-label="About WorkDesk">
        <div className="auth-showcase-inner">
          <AuthBrand />
          <p className="auth-showcase-kicker">WORKDESK V2</p>
          <h2 className="auth-showcase-title">Work better, together.</h2>
          <p className="auth-showcase-copy">
            Projects, tasks and teams — all in one workspace.
          </p>
          <DashboardPreview />
        </div>
      </aside>

      <div className="auth-showcase-mobile">
        <p className="auth-showcase-mobile-title">Work better, together.</p>
        <p className="auth-showcase-mobile-copy">
          Projects, tasks and teams — all in one workspace.
        </p>
      </div>
    </div>
  );
}
