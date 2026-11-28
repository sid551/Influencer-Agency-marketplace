/** Shared shapes for the personalised campaign feed (client + server). */

export type RecommendationSection = "recommended" | "related" | "explore";

/** One campaign row as returned by the recommendation RPC. */
export interface RecommendedCampaign {
  id: string;
  business_profile_id: string;
  title: string;
  description: string;
  category: string;
  platforms: string[];
  collaboration_type: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  deliverables: string[];
  application_deadline: string | null;
  location: string | null;
  image_url: string | null;
  image_public_id: string | null;
  image_alt: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  /** Target niche slugs attached to the campaign (sorted). */
  target_niches: string[];
  /** 100 primary / 60 secondary / 30 related / 10 none. */
  match_score: number;
  match_section: RecommendationSection;
  /** Total rows in this section (for pagination). */
  total_count: number;
}

export interface RecommendationPage {
  section: RecommendationSection;
  items: RecommendedCampaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
