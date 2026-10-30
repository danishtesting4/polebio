export interface HealthResponse {
  status: "ok";
  service: "polebio-api";
  timestamp: string;
}

export interface PublicProfile {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  publishedAt: string;
}
