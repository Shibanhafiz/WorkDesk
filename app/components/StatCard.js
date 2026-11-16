export default function StatCard({ label, value, detail, accent = false }) {
  return (
    <article className={`metric-item${accent ? " metric-item-accent" : ""}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}
