export default function PageHeader({
  number,
  title,
  description,
  action,
  meta,
  eyebrow = "WORKSPACE",
}) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <p className="page-kicker">
          <span className="page-number">{number}</span>
          <span>{eyebrow}</span>
        </p>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
        {meta ? <p className="page-meta">{meta}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </header>
  );
}
