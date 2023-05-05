// 直接通过JSON 2 TS插件生成的，懒得详细研究字段含义了，能用就行
export interface UserProfile {
  is_aprilfools: boolean;
  locked_char_ids: any[];
  curr_available_maps: Curravailablemap[];
  character_stats: Characterstat[];
  friends: Friend[];
  settings: Settings;
  is_cancelled: boolean;
  is_renewed: boolean;
  arcaea_online_expire_ts: number;
  digital_ost_owned_count: number;
  is_email_valid: boolean;
  is_allowed_payment: boolean;
  user_id: number;
  name: string;
  user_code: string;
  display_name: string;
  email: string;
  ticket: number;
  character: number;
  beyond_boost_gauge: number;
  is_beyond_unlocked: boolean;
  country: string;
  course_banners: any[];
  world_mode_locked_end_ts: number;
  is_locked_name_duplicate: boolean;
  is_skill_sealed: boolean;
  current_map: string;
  prog_boost: number;
  next_fragstam_ts: number;
  max_stamina_ts: number;
  max_stamina: number;
  stamina: number;
  world_unlocks: any[];
  world_songs: any[];
  singles: any[];
  packs: any[];
  characters: number[];
  cores: any[];
  recent_score: Recentscore2[];
  max_friend: number;
  rating: number;
  join_date: number;
}

interface Recentscore2 {
  song_id: string;
  difficulty: number;
  score: number;
  shiny_perfect_count: number;
  perfect_count: number;
  near_count: number;
  miss_count: number;
  clear_type: number;
  best_clear_type: number;
  health: number;
  time_played: number;
  modifier: number;
}

interface Settings {
  is_hide_rating: boolean;
  favorite_character: number;
  max_stamina_notification_enabled: boolean;
}

interface Friend {
  is_mutual: boolean;
  is_char_uncapped_override: boolean;
  is_char_uncapped: boolean;
  is_skill_sealed: boolean;
  rating: number;
  join_date: number;
  character: number;
  recent_score: Recentscore[];
  name: string;
  user_id: number;
}

interface Recentscore {
  title: Title;
  rating: number;
  modifier: number;
  time_played: number;
  health: number;
  best_clear_type: number;
  clear_type: number;
  miss_count: number;
  near_count: number;
  perfect_count: number;
  shiny_perfect_count: number;
  score: number;
  difficulty: number;
  song_id: string;
}

interface Title {
  en: string;
  ja: string;
}

interface Characterstat {
  skill_id_text?: Skillidtext;
  display_name: Skillidtext;
  base_character: boolean;
  is_uncapped_override: boolean;
  is_uncapped: boolean;
  uncap_cores: Uncapcore[];
  char_type: number;
  skill_id_uncap: string;
  skill_requires_uncap: boolean;
  skill_unlock_level: number;
  skill_id: string;
  overdrive: number;
  prog: number;
  frag: number;
  level_exp: number;
  exp: number;
  level: number;
  name: string;
  character_id: number;
  base_character_id?: number;
}

interface Uncapcore {
  _id: string;
  core_type: string;
  amount: number;
}

interface Skillidtext {
  en: string;
  ja: string;
  ko: string;
  "zh-Hans": string;
  "zh-Hant": string;
}

interface Curravailablemap {
  stamina_cost: number;
  custom_bg: string;
  step_count: number;
  coordinate: string;
  require_type: string;
  require_id: string;
  is_repeatable: boolean;
  available_to: number;
  available_from: number;
  chapter: number;
  is_legacy: boolean;
  map_id: string;
}


export interface FriendBestInfo {
  user_id: number;
  song_id: string;
  difficulty: number;
  score: number;
  shiny_perfect_count: number;
  perfect_count: number;
  near_count: number;
  miss_count: number;
  health: number;
  modifier: number;
  time_played: number;
  best_clear_type: number;
  clear_type: number;
  name: string;
  character: number;
  is_skill_sealed: boolean;
  is_char_uncapped: boolean;
  rank: number;
}