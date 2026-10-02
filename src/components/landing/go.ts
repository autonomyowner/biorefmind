/**
 * Where a landing call-to-action leads a signed-in visitor (the dashboard), or null
 * for visitors who are not signed in: they get the section's own sign-up link.
 */
export type Go = { href: string; label: string } | null;
