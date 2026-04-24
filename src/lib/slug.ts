/**
 * Slugify a free-text app name into a short, filesystem-safe identifier
 * we can use as PostHog group key (and anywhere else we need a stable,
 * copy-pasteable handle).
 *
 * Rules:
 *   - Lowercase
 *   - Non-alphanumeric runs collapse to a single dash
 *   - Trimmed of leading/trailing dashes
 *   - Capped at 48 characters so the full slug + 6-char suffix stays ≤ 55
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

/**
 * Build the final slug used in the database: base slug + short unique
 * suffix. The suffix comes from the app id so it stays stable.
 */
export function buildAppSlug(name: string, appId: string): string {
  const base = slugifyName(name) || "app"
  const suffix = appId.replace(/-/g, "").slice(0, 6).toLowerCase()
  return `${base}-${suffix}`
}
