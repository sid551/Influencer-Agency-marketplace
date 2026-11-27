// =============================================================
// Creator-side domain types.
// Status/enum unions mirror the CHECK constraints in
// supabase/migrations/20261125000001_initial_schema.sql.
// =============================================================

export const SOCIAL_PLATFORMS = [
  "instagram",
  "youtube",
  "facebook",
  "x",
  "linkedin",
  "other",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "expired",
  "revoked",
  "manual_review",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** social_accounts also allow 'unverified' before any claim exists. */
export const SOCIAL_VERIFICATION_STATUSES = [
  "unverified",
  ...VERIFICATION_STATUSES,
] as const;
export type SocialVerificationStatus =
  (typeof SOCIAL_VERIFICATION_STATUSES)[number];

export const VERIFICATION_TYPES = [
  "email",
  "phone",
  "identity",
  "instagram_ownership",
  "youtube_ownership",
  "audience_quality",
] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const VERIFICATION_METHODS = [
  "manual_review",
  "email_link",
  "sms_code",
  "document_check",
  "oauth",
  "platform_api",
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const PROFILE_ROLES = ["creator", "business", "admin"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

// ---------------------------------------------------------------
// Curated option lists for creator onboarding. The database stores
// plain text[] (no CHECK), so these lists stay in one place and are
// validated on both client and server. Add a new option here any
// time — old values are never invalidated.
// ---------------------------------------------------------------

export const NICHE_OPTIONS = [
  "fashion",
  "beauty",
  "lifestyle",
  "fitness",
  "wellness",
  "food",
  "travel",
  "tech",
  "gaming",
  "music",
  "dance",
  "education",
  "business",
  "finance",
  "parenting",
  "home_decor",
  "comedy",
  "photography",
  "sports",
  "automotive",
  "art",
  "sustainability",
  "other",
] as const;
export type Niche = (typeof NICHE_OPTIONS)[number];

export const LANGUAGE_OPTIONS = [
  "english",
  "hindi",
  "spanish",
  "french",
  "german",
  "portuguese",
  "italian",
  "dutch",
  "russian",
  "chinese",
  "japanese",
  "korean",
  "arabic",
  "turkish",
  "bengali",
  "tamil",
  "telugu",
  "marathi",
  "punjabi",
  "urdu",
  "indonesian",
  "vietnamese",
  "thai",
  "swahili",
  "other",
] as const;
export type Language = (typeof LANGUAGE_OPTIONS)[number];

export const CONTENT_TYPE_OPTIONS = [
  "reels",
  "short_form",
  "long_form",
  "stories",
  "photos",
  "carousels",
  "livestream",
  "podcast",
  "newsletter",
  "blog",
  "tutorials",
  "unboxing",
  "other",
] as const;
export type ContentType = (typeof CONTENT_TYPE_OPTIONS)[number];

export const PORTFOLIO_MEDIA_TYPES = ["image", "video_link", "content_sample"] as const;
export type PortfolioMediaType = (typeof PORTFOLIO_MEDIA_TYPES)[number];

/** What a creator is open to (onboarding step 12). */
export const COLLABORATION_PREFERENCES = [
  "paid",
  "product_seeding",
  "affiliate",
  "barter",
] as const;
export type CollaborationPreference = (typeof COLLABORATION_PREFERENCES)[number];

/** Row type for public.profiles (private columns included). */
export interface Profile {
  id: string;
  role: ProfileRole;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

/** Row type for public.creator_profiles. */
export interface CreatorProfile {
  profile_id: string;
  bio: string | null;
  niches: string[];
  languages: string[];
  content_types: string[];
  collaboration_preferences: string[];
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

/** Row type for public.business_profiles (structural support only). */
export interface BusinessProfile {
  profile_id: string;
  company_name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

/** Row type for public.social_accounts. */
export interface SocialAccount {
  id: string;
  profile_id: string;
  platform: SocialPlatform;
  username: string;
  platform_user_id: string | null;
  follower_count: number;
  verification_status: SocialVerificationStatus;
  verification_method: VerificationMethod | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row type for public.portfolio_items. */
export interface PortfolioItem {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  media_type: PortfolioMediaType;
  media_url: string;
  position: number;
  created_at: string;
  updated_at: string;
}

/** Row type for public.creator_services. */
export interface CreatorService {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Row type for public.verifications (private claims). */
export interface Verification {
  id: string;
  profile_id: string;
  type: VerificationType;
  status: VerificationStatus;
  social_account_id: string | null;
  method: VerificationMethod | null;
  reviewed_by: string | null;
  review_notes: string | null;
  evidence_path: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A private claim joined with the social account it refers to (if any). */
export interface VerificationWithSocial extends Verification {
  social_account: { id: string; platform: string; username: string } | null;
}

/**
 * Row type for the public creator_directory view (public-safe
 * columns only — never email or phone).
 */
export interface CreatorDirectoryEntry {
  profile_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  niches: string[];
  languages: string[];
  content_types: string[];
  collaboration_preferences: string[];
  created_at: string;
}
