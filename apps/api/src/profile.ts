import type { ProfileLink } from "./validation.js";
export type ProfileRow = {
  user_id: string; username: string; display_name: string; bio: string;
  avatar_url: string | null; accent: string; links: ProfileLink[];
  is_published: boolean; published_at: string | null; updated_at: string;
};
