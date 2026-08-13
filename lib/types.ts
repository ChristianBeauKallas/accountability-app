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
  prompt: string | null;
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

export type CoachingTracker = {
  id: string;
  relationship_id: string;
  label: string;
  emoji: string | null;
  prompt: string | null;
  sort_order: number;
  repeatable: boolean;
  wants_photo: boolean;
  wants_note: boolean;
  wants_amount: boolean;
  wants_macros: boolean;
  unit: string | null;
  target: number | null;
  active: boolean;
  days: number[] | null;
};

export type CoachingEntry = {
  id: string;
  relationship_id: string;
  client_id: string;
  tracker_id: string;
  happened_at: string;
  detail: string | null;
  amount: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  macros_source: string | null;
  logged_at: string;
  photos?: string[];
};

export type SavedMeal = {
  id: string;
  name: string;
  detail: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export type IntakeHabit = { name: string; cadence: string };

export type CoachingIntake = {
  id: string;
  relationship_id: string;
  client_id: string;
  goals: string | null;
  current_weight: number | null;
  goal_weight: number | null;
  build: string | null;
  height: string | null;
  age: number | null;
  activity_level: number | null;
  diet_level: number | null;
  diet_type: string | null;
  maintenance_calories: number | null;
  train_days: number[] | null;
  workout_types: string[] | null;
  habits: IntakeHabit[] | null;
  status: string;
  submitted_at: string;
};

export type PlanExercise = {
  name: string;
  sets?: number;
  reps?: string;
  cue?: string;
};

export type PlanWorkout = {
  id: string;
  plan_id: string;
  weekday: number;
  title: string;
  kind: string;
  detail: string | null;
  exercises: PlanExercise[] | null;
  sort_order: number;
};

export type ExampleMeal = {
  meal: string;
  detail: string;
  calories?: number;
  protein_g?: number;
};

export type CoachingPlan = {
  id: string;
  relationship_id: string;
  client_id: string;
  week_number: number;
  status: string;
  summary: string | null;
  diet_notes: string | null;
  calorie_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  water_target: number | null;
  example_day: ExampleMeal[] | null;
  created_at: string;
  activated_at: string | null;
};

export type Message = {
  id: string;
  group_id: string;
  author_id: string;
  body: string;
  image_path: string | null;
  audio_path: string | null;
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
