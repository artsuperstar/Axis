/** Normalize user-defined display names without discarding meaningful accents. */
export function normalizeIdentityDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ').normalize('NFC');
}

/** Canonical active-name identity: Unicode normalization plus locale-neutral casing. */
export function canonicalIdentityName(value: string) {
  return normalizeIdentityDisplayName(value).toLowerCase();
}

/** Search can be accent-insensitive even though persisted name identity is not. */
export function canonicalSearchText(value: string) {
  return canonicalIdentityName(value).normalize('NFD').replace(/\p{M}/gu, '');
}
