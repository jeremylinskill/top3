import type { CollectionOption } from '@/types/collection-option';

/**
 * Full list title independent of the short label in the theme/type selector.
 * The optional value lives in collection_options.provider_config.displayTitle,
 * so admin-defined themes can use it without changing existing list identities.
 */
export function getCollectionOptionListTitle(
  option: Pick<CollectionOption, 'name' | 'providerConfig'>
): string {
  const configured = option.providerConfig?.displayTitle;
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim();
  }
  return `Top 3 ${option.name}`;
}

/**
 * Browse cards may show a natural label derived from the configured full
 * list title, e.g. "Heist Movies" from "Top 3 Heist Movies".
 * Never change option.name: that is also used as a persisted topic identity.
 * Themes without a full display title retain their existing browse label.
 */
export function getCollectionOptionBrowseTitle(
  option: Pick<CollectionOption, 'name' | 'providerConfig'>
): string {
  const configured = option.providerConfig?.displayTitle;
  if (typeof configured !== 'string' || !configured.trim()) {
    return option.name;
  }
  const match = configured.trim().match(/^Top 3\s+(.+)$/i);
  return match?.[1]?.trim() || option.name;
}
