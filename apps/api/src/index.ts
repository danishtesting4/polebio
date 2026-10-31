import { config } from "dotenv";
import { fileURLToPath } from "node:url";
config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import type { HealthResponse } from "@polebio/shared";
import type { ProfileRow } from "./profile.js";
import { validateProfile } from "./validation.js";

const app = Fastify({ logger: true, bodyLimit: 32 * 1024 });
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((value) => value.trim()).filter(Boolean);

await app.register(cors, {
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
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

function publicProfile(row: ProfileRow) {
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

app.get<{ Reply: HealthResponse & { databaseConfigured: boolean; databaseReachable: boolean } }>("/api/health", async (_request, reply) => {
  let databaseReachable = false;
  if (db) {
    const { error } = await db.from("profiles").select("user_id", { head: true, count: "exact" }).limit(1);
    databaseReachable = !error;
  }
  return reply.code(db && !databaseReachable ? 503 : 200).send({
    status: "ok",
    service: "polebio-api",
    timestamp: new Date().toISOString(),
    databaseConfigured: supabaseReady,
    databaseReachable
  });
});

async function authenticatedClient(request: { headers: { authorization?: string } }, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  if (!db) {
    reply.code(503).send({ error: "The API database is not configured." });
    return null;
  }
  const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    reply.code(401).send({ error: "Sign in to continue." });
    return null;
  }
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    reply.code(401).send({ error: "Your session is invalid or expired." });
    return null;
  }
  const client = createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return { client, user: data.user };
}

app.get("/api/profile/me", async (request, reply) => {
  const auth = await authenticatedClient(request, reply);
  if (!auth) return;
  const { data, error } = await auth.client.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (error) {
    request.log.error({ err: error }, "Profile lookup failed");
    return reply.code(500).send({ error: "Could not load your profile." });
  }
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
    request.log.error({ err: error }, "Profile save failed");
    if (error.code === "23505") return reply.code(409).send({ error: "That username is already taken." });
    if (error.code === "23514" || error.code === "22P02") return reply.code(400).send({ error: "The profile contains invalid data." });
    return reply.code(500).send({ error: "Could not save your profile." });
  }
  return { profile: publicProfile(data as ProfileRow), isPublished: data.is_published };
});

app.post("/api/profile/me/publish", async (request, reply) => {
  const auth = await authenticatedClient(request, reply);
  if (!auth) return;
  const { data: existing, error: readError } = await auth.client.from("profiles")
    .select("*").eq("user_id", auth.user.id).maybeSingle();
  if (readError) {
    request.log.error({ err: readError }, "Profile publish validation lookup failed");
    return reply.code(500).send({ error: "Could not verify your profile before publishing." });
  }
  if (!existing) return reply.code(404).send({ error: "Save your profile before publishing it." });
  const validation = validateProfile({
    username: existing.username,
    displayName: existing.display_name,
    bio: existing.bio,
    avatarUrl: existing.avatar_url,
    accent: existing.accent,
    links: existing.links
  });
  if (!validation.value) return reply.code(400).send({ error: validation.error });
  if (!validation.value.displayName) return reply.code(400).send({ error: "Add a display name before publishing." });
  const { data, error } = await auth.client.from("profiles")
    .update({ is_published: true, published_at: existing.published_at ?? new Date().toISOString() })
    .eq("user_id", auth.user.id).select("*").single();
  if (error) {
    request.log.error({ err: error }, "Profile publish failed");
    return reply.code(500).send({ error: "Could not publish your profile." });
  }
  return { profile: publicProfile(data as ProfileRow), isPublished: true };
});

app.post("/api/profile/me/unpublish", async (request, reply) => {
  const auth = await authenticatedClient(request, reply);
  if (!auth) return;
  const { data, error } = await auth.client.from("profiles")
    .update({ is_published: false })
    .eq("user_id", auth.user.id).select("*").maybeSingle();
  if (error) {
    request.log.error({ err: error }, "Profile unpublish failed");
    return reply.code(500).send({ error: "Could not unpublish your profile." });
  }
  if (!data) return reply.code(404).send({ error: "No saved profile was found." });
  return { profile: publicProfile(data as ProfileRow), isPublished: false };
});

app.get<{ Params: { username: string } }>("/api/profile/:username", async (request, reply) => {
  if (!db) return reply.code(503).send({ error: "The API database is not configured." });
  const username = request.params.username.toLowerCase();
  const { data, error } = await db.from("profiles")
    .select("username,display_name,bio,avatar_url,accent,links,published_at")
    .eq("username", username).eq("is_published", true).maybeSingle();
  if (error) {
    request.log.error({ err: error }, "Public profile lookup failed");
    return reply.code(500).send({ error: "Could not load this profile." });
  }
  if (!data) return reply.code(404).send({ error: "Profile not found." });
  return { profile: {
    username: data.username, displayName: data.display_name, bio: data.bio,
    avatarUrl: data.avatar_url, accent: data.accent, links: data.links,
    publishedAt: data.published_at
  } };
});

const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 4001);
const host = process.env.HOST ?? "0.0.0.0";
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}
try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
