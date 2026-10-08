/** Keep pasted line breaks out of single-line values without changing casing or accents. */
export function singleLineText(value: string) {
  return value.replace(/[\r\n\u2028\u2029]+/g, ' ');
}

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
