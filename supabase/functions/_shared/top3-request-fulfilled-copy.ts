// Shared by the mobile Notifications screen and the push Edge Function.
// A fulfillment notification always points to the same published collection.
export function getFulfilledTop3RequestMessage(collectionTitle: string | null): string {
  const title = collectionTitle?.replace(/^Top 3 All\s+/i, 'Top 3 ').trim();
  return title
    ? `shared their ${title} with you. Tap to view.`
    : 'shared a requested Top 3 with you. Tap to view.';
}
