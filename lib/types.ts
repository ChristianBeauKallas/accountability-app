// Athletx — database types (hand-maintained to match supabase/migrations).

export type UserRole = "player" | "coach";
export type Division = "D2" | "D3" | "NAIA" | "JUCO";
export type StaffRole = "head" | "assistant" | "recruiting_coordinator";
export type NeedStatus = "open" | "closed";
export type ApplicationStatus = "new" | "viewed" | "interested" | "closed";
export type Bats = "L" | "R" | "S";
export type Throws = "L" | "R";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  grad_year: number | null;
  primary_position: string | null;
  positions: string[];
  bats: Bats | null;
  throws: Throws | null;
  height_in: number | null;
  weight_lb: number | null;
  gpa: number | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  is_transfer: boolean;
  current_school: string | null;
  sixty_yd: number | null;
  exit_velo: number | null;
  inf_velo: number | null;
  of_velo: number | null;
  fastball_velo: number | null;
  pop_time: number | null;
  highlight_url: string | null;
  bio: string | null;
  updated_at: string;
};

export type Program = {
  id: string;
  name: string;
  division: Division;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  conference: string | null;
  website: string | null;
  logo_url: string | null;
  about: string | null;
  created_at: string;
};

export type ProgramStaff = {
  id: string;
  program_id: string;
  profile_id: string;
  staff_role: StaffRole;
  created_at: string;
};

export type Need = {
  id: string;
  program_id: string;
  title: string;
  positions: string[];
  grad_year_min: number | null;
  grad_year_max: number | null;
  accepts_transfer: boolean;
  min_gpa: number;
  must_have: string[];
  min_exit_velo: number | null;
  min_sixty: number | null;
  min_fastball_velo: number | null;
  min_pop_time: number | null;
  description: string | null;
  status: NeedStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  need_id: string;
  player_id: string;
  status: ApplicationStatus;
  fit_score: number | null;
  message: string | null;
  created_at: string;
  viewed_at: string | null;
};

export type Message = {
  id: string;
  application_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type PostKind = "update" | "highlight";
export type MediaType = "image" | "video";

export type PlayerPost = {
  id: string;
  player_id: string;
  kind: PostKind;
  body: string | null;
  media_url: string | null;
  media_type: MediaType | null;
  created_at: string;
};

// Convenience join shapes used across the UI.
export type NeedWithProgram = Need & { program: Program };
export type ApplicationWithNeed = Application & { need: NeedWithProgram };
export type ApplicationWithPlayer = Application & {
  player: Player & { profile: Pick<Profile, "full_name" | "avatar_url"> };
};
