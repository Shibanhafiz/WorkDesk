export default function TaskLoadState({
  isLoading,
  error,
  onRetry,
  children,
}) {
  if (isLoading) {
    return (
      <p
        role="status"
        className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500"
      >
        Loading tasks...
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-white px-6 py-12 text-center">
        <p role="alert" className="text-sm text-slate-600">
          Tasks could not be loaded. {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return children;
}
