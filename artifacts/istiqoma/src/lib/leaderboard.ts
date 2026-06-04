// Helpers for rendering leaderboard rows.

// Pick a display name for a leaderboard entry. We prefer the user's
// chosen username so people who opted into a public handle show up
// nicely. If they haven't picked one we fall back to a fully masked
// email (the server already masks other users' emails; we always
// re-mask client-side so the current user's row is masked too and
// raw emails never reach the DOM). The final fallback string is
// localized via i18n by the caller.
export function getLeaderboardDisplayName(
  entry: {
    username: string | null;
    email: string | null;
    isCurrentUser: boolean;
  },
  fallback: string,
): string {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.isCurrentUser ? entry.username : maskUsername(entry.username);
  }
  if (entry.email) {
    return maskEmailForDisplay(entry.email);
  }
  return fallback;
}

// Mask a username for display when the row belongs to another user.
// Format: first char + "***" + last char.
// Example: "yusuf" → "y***f". Single-char names become "x***".
export function maskUsername(username: string): string {
  const trimmed = username.trim();
  if (trimmed.length <= 1) return `${trimmed}***`;
  return `${trimmed[0]}***${trimmed[trimmed.length - 1]}`;
}

// Always render emails in masked form on the client, regardless of who
// the row belongs to. Never expose a raw email in the leaderboard UI.
// Format: first char + "***" + last char of local part + domain.
// Example: "yusuf@gmail.com" → "y***f@gmail.com".
export function maskEmailForDisplay(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 1) return `${local}***${domain}`;
  const head = local.slice(0, 1);
  const tail = local.slice(-1);
  return `${head}***${tail}${domain}`;
}

export function getLeaderboardInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
