export type ProfileLink = { id: number; label: string; url: string };
export type ProfileInput = {
  username: string; displayName: string; bio: string;
  avatarUrl: string | null; accent: string; links: ProfileLink[];
};
const RESERVED = new Set(["www", "api", "admin", "dashboard", "status"]);
const ACCENTS = new Set(["#8b6ac8", "#477d70", "#b87953", "#5278a7", "#ad648c", "violet", "purple", "blue", "pink", "green"]);

export function validateProfile(value: unknown): { value?: ProfileInput; error?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "A profile object is required." };
  const body = value as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const avatarUrl = body.avatarUrl === null || body.avatarUrl === "" ? null : body.avatarUrl;
  const accent = typeof body.accent === "string" ? body.accent.toLowerCase() : "";
  const links = body.links;
  if (!/^[a-z0-9_-]{3,24}$/.test(username)) return { error: "Username must be 3–24 characters using letters, numbers, _ or -." };
  if (RESERVED.has(username)) return { error: "That username is reserved." };
  if (!displayName || displayName.length > 50) return { error: "Display name must be between 1 and 50 characters." };
  if (bio.length > 160) return { error: "Bio must be 160 characters or fewer." };
  if (typeof avatarUrl !== "string" && avatarUrl !== null) return { error: "Avatar URL must be a string." };
  if (typeof avatarUrl === "string" && avatarUrl.length > 2048) return { error: "Avatar URL is too long." };
  if (typeof avatarUrl === "string" && avatarUrl) {
    try { const u = new URL(avatarUrl); if (!["http:", "https:"].includes(u.protocol) || !u.hostname) throw Error(); }
    catch { return { error: "Avatar URL must be a valid HTTP(S) URL." }; }
  }
  if (!ACCENTS.has(accent)) return { error: "Choose a supported accent color." };
  if (!Array.isArray(links) || links.length > 12) return { error: "A profile can have up to 12 links." };
  const safeLinks: ProfileLink[] = [];
  for (const item of links) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { error: "Each link needs a title and URL." };
    const link = item as Record<string, unknown>;
    const label = typeof link.label === "string" ? link.label.trim() : "";
    const url = typeof link.url === "string" ? link.url.trim() : "";
    if (!label || label.length > 60 || url.length > 2048) return { error: "Each link needs a title (up to 60 characters) and a valid URL." };
    try { const u = new URL(url); if (!["http:", "https:"].includes(u.protocol) || !u.hostname) throw Error(); }
    catch { return { error: "Every link must use a valid HTTP(S) URL." }; }
    const id = Number.isSafeInteger(link.id) && Number(link.id) >= 0 ? Number(link.id) : safeLinks.length + 1;
    safeLinks.push({ id, label, url });
  }
  return { value: { username, displayName, bio, avatarUrl: avatarUrl as string | null, accent, links: safeLinks } };
}
