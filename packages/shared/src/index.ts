export interface HealthResponse {
  status: "ok";
  service: "polebio-api";
  timestamp: string;
  databaseConfigured?: boolean;
  databaseReachable?: boolean;
}

export interface ProfileLink {
  id: number;
  label: string;
  url: string;
}

export interface PublicProfile {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  accent: string;
  links: ProfileLink[];
  publishedAt: string | null;
}
