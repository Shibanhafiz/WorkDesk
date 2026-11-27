/**
 * Renders the loading, error, empty, and populated states of a task list.
 * Shared so each state can be verified in isolation.
 */
export default function TaskRegisterState({
  isLoading = false,
  loadError = "",
  isEmpty = false,
  emptyTitle = "No tasks yet",
  emptyCopy = "",
  emptyAction = null,
  onRetry,
  children,
}) {
  if (isLoading) {
    return (
      <p role="status" className="state-panel">
        Loading your task register...
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="state-panel">
        <p role="alert" className="state-error">
          Tasks could not be loaded. {loadError}
        </p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="text-link-button">
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">{emptyTitle}</h3>
        <p className="empty-state-copy">{emptyCopy}</p>
        {emptyAction}
      </div>
    );
  }

  return children;
}
