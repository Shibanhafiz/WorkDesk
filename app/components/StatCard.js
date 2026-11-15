export default function StatCard({ label, value, detail, accent = false }) {
  return (
    <article className="density-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`flex size-10 items-center justify-center rounded-lg text-sm font-semibold ${
            accent ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {value}
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  );
}
