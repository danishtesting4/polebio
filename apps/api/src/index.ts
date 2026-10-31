import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import type { HealthResponse } from "@polebio/shared";

type ProfileLink = { id: number; label: string; url: string };
type ProfileInput = {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  accent: string;
  links: ProfileLink[];
};
type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  accent: string;
  links: ProfileLink[];
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
};

const app = Fastify({ logger: true, bodyLimit: 32 * 1024 });
await app.register(cors, {
  origin: (origin, callback) => {
    // Local Vite development and configured production frontends.
    const allowed = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
      .split(",").map((value) => value.trim()).filter(Boolean);
    callback(null, !origin || allowed.includes(origin));
  },
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseReady = Boolean(supabaseUrl && supabaseKey);
const db = supabaseReady
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
  : null;

app.get<{ Reply: HealthResponse & { databaseConfigured: boolean } }>("/api/health", async () => ({
  status: "ok",
  service: "polebio-api",
  timestamp: new Date().toISOString(),
  databaseConfigured: supabaseReady
}));

async function authenticatedClient(request: { headers: { authorization?: string } }, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  if (!db) {
    reply.code(503).send({ error: "The API database is not configured." });
    return null;
  }
  const authorization = request.headers.authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    reply.code(401).send({ error: "Sign in to continue." });
    return null;
  }
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    reply.code(401).send({ error: "Your session is invalid or expired." });
    return null;
  }
  // Forward the verified user's JWT so Postgres RLS remains the authority.
  const client = createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return { client, user: data.user };
}

function validateProfile(value: unknown): { value?: ProfileInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "A profile object is required." };
  const body = value as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const bio = typeof body.bio === "string" ? body.bio : "";
  const avatarUrl = body.avatarUrl === null || body.avatarUrl === "" ? null : body.avatarUrl;
  const accent = typeof body.accent === "string" ? body.accent : "";
  const links = body.links;
  if (!/^[a-z0-9_-]{3,24}$/.test(username)) return { error: "Username must be 3–24 characters using letters, numbers, _ or -." };
  if (["www", "api", "admin", "dashboard", "status"].includes(username)) return { error: "That username is reserved." };
  if (displayName.length > 50) return { error: "Display name must be 50 characters or fewer." };
  if (bio.length > 160) return { error: "Bio must be 160 characters or fewer." };
  if (typeof avatarUrl !== "string" && avatarUrl !== null) return { error: "Avatar URL must be a string." };
  if (typeof avatarUrl === "string" && avatarUrl && (!/^https?:\/\//i.test(avatarUrl) || avatarUrl.length > 2048)) return { error: "Avatar URL must be a valid HTTP(S) URL." };
  if (!["#8b6ac8", "#477d70", "#b87953", "#5278a7", "#ad648c", "violet", "purple", "blue", "pink", "green"].includes(accent)) return { error: "Choose a supported accent color." };
  if (!Array.isArray(links) || links.length > 12) return { error: "A profile can have up to 12 links." };
  const safeLinks: ProfileLink[] = [];
  for (const item of links) {
    if (!item || typeof item !== "object") return { error: "Each link needs a title and URL." };
    const link = item as Record<string, unknown>;
    const label = typeof link.label === "string" ? link.label.trim() : "";
    const url = typeof link.url === "string" ? link.url.trim() : "";
    if (label.length > 60 || url.length > 2048) return { error: "Link title or URL is too long." };
    if (label && !/^https?:\/\//i.test(url)) return { error: "Every link must use an http:// or https:// URL." };
    if (label) safeLinks.push({ id: Number.isFinite(Number(link.id)) ? Number(link.id) : Date.now() + safeLinks.length, label, url });
  }
  return { value: { username, displayName, bio, avatarUrl: avatarUrl as string | null, accent, links: safeLinks } };
}

function toPublic(row: ProfileRow) {
  return {
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    accent: row.accent,
    links: row.links,
    publishedAt: row.published_at
  };
}

app.get("/api/profile/me", async (request, reply) => {
  const auth = await authenticatedClient(request, reply);
  if (!auth) return;
  const { data, error } = await auth.client.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (error) return reply.code(500).send({ error: "Could not load your profile." });
  return { profile: data ? {
    username: data.username, displayName: data.display_name, bio: data.bio,
    avatarUrl: data.avatar_url, accent: data.accent, links: data.links,
    isPublished: data.is_published, publishedAt: data.published_at
  } : null };
});

app.put<{ Body: unknown }>("/api/profile/me", async (request, reply) => {
  const auth = await authenticatedClient(request, reply);
  if (!auth) return;
  const parsed = validateProfile(request.body);
  if (!parsed.value) return reply.code(400).send({ error: parsed.error });
  const profile = parsed.value;
  const { data, error } = await auth.client.from("profiles").upsert({
    user_id: auth.user.id,
    username: profile.username,
    display_name: profile.displayName,
    bio: profile.bio,
    avatar_url: profile.avatarUrl,
    accent: profile.accent,
    links: profile.links
  }, { onConflict: "user_id" }).select("*").single();
  if (error) {
    if (error.code === "23505") return reply.code(409).send({ error: "That username is already taken." });
    return reply.code(400).send({ error: error.message });
  }
  return { profile: toPublic(data as ProfileRow), isPublished: data.is_published };
});

app.post("/api/profile/me/publish", async (request, reply) => {
  const auth = await authenticatedClient(request, reply);
  if (!auth) return;
  const { data, error } = await auth.client.from("profiles")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("user_id", auth.user.id).select("*").maybeSingle();
  if (error) return reply.code(400).send({ error: error.message });
  if (!data) return reply.code(404).send({ error: "Save your profile before publishing it." });
  return { profile: toPublic(data as ProfileRow), isPublished: true };
});

app.post("/api/profile/me/unpublish", async (request, reply) => {
  const auth = await authenticatedClient(request, reply);
  if (!auth) return;
  const { data, error } = await auth.client.from("profiles")
    .update({ is_published: false })
    .eq("user_id", auth.user.id).select("*").maybeSingle();
  if (error) return reply.code(400).send({ error: error.message });
  if (!data) return reply.code(404).send({ error: "No saved profile was found." });
  return { profile: toPublic(data as ProfileRow), isPublished: false };
});

app.get<{ Params: { username: string } }>("/api/profile/:username", async (request, reply) => {
  if (!db) return reply.code(503).send({ error: "The API database is not configured." });
  const username = request.params.username.toLowerCase();
  const { data, error } = await db.from("profiles").select("username,display_name,bio,avatar_url,accent,links,published_at")
    .eq("username", username).eq("is_published", true).maybeSingle();
  if (error) return reply.code(500).send({ error: "Could not load this profile." });
  if (!data) return reply.code(404).send({ error: "Profile not found." });
  return { profile: {
    username: data.username, displayName: data.display_name, bio: data.bio,
    avatarUrl: data.avatar_url, accent: data.accent, links: data.links,
    publishedAt: data.published_at
  } };
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
