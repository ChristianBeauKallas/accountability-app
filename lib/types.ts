// Hand-written types for the app's tables. Once the schema settles you can
// replace these with generated types via:
//   supabase gen types typescript --project-id <ref> > lib/database.types.ts

export type MemberRole = "owner" | "member";
export type MediaType = "image" | "audio" | "video";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
};

export type Activity = {
  id: string;
  group_id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type GroupPost = {
  id: string;
  group_id: string;
  author_id: string;
  caption: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type CoachingRelationship = {
  id: string;
  coach_id: string;
  client_id: string;
  created_at: string;
};

export type Checkin = {
  id: string;
  relationship_id: string;
  client_id: string;
  weight: number | null;
  sleep_hours: number | null;
  energy: number | null;
  moved: boolean | null;
  notes: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  group_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type Media = {
  id: string;
  owner_id: string;
  type: MediaType;
  storage_path: string;
  transcript: string | null;
  post_id: string | null;
  checkin_id: string | null;
  created_at: string;
};
