export function formatRelativeTime(value?: string) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const elapsedMilliseconds = Date.now() - timestamp;
  const elapsedMinutes = Math.floor(
    elapsedMilliseconds / (1000 * 60)
  );

  if (elapsedMinutes < 1) {
    return 'Updated just now';
  }

  if (elapsedMinutes < 60) {
    return `Updated ${elapsedMinutes} ${
      elapsedMinutes === 1 ? 'minute' : 'minutes'
    } ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `Updated ${elapsedHours} ${
      elapsedHours === 1 ? 'hour' : 'hours'
    } ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedDays === 1) {
    return 'Updated yesterday';
  }

  if (elapsedDays < 7) {
    return `Updated ${elapsedDays} days ago`;
  }

  return `Updated ${new Date(value).toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
    }
  )}`;
}