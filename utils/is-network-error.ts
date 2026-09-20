export function isNetworkError(
  error: unknown
): boolean {
  return (
    error instanceof Error &&
    (
      error.name ===
        'AuthRetryableFetchError' ||
      error.message
        .toLowerCase()
        .includes('network request failed')
    )
  );
}
