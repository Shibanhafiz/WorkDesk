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
        className="state-panel"
      >
        Loading your task register…
      </p>
    );
  }

  if (error) {
    return (
      <div className="state-panel">
        <p role="alert" className="state-error">
          Tasks could not be loaded. {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="text-link-button"
        >
          Try again
        </button>
      </div>
    );
  }

  return children;
}
