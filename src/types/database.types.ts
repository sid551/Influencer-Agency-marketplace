// GENERATED FILE — do not edit by hand.
// Regenerate after any schema change:
//   npx supabase gen types typescript --local > src/types/database.types.ts
//   npx oxfmt src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      business_profiles: {
        Row: {
          company_name: string;
          created_at: string;
          description: string | null;
          industry: string | null;
          onboarding_completed: boolean;
          profile_id: string;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          company_name: string;
          created_at?: string;
          description?: string | null;
          industry?: string | null;
          onboarding_completed?: boolean;
          profile_id: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          company_name?: string;
          created_at?: string;
          description?: string | null;
          industry?: string | null;
          onboarding_completed?: boolean;
          profile_id?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "business_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_applications: {
        Row: {
          campaign_id: string;
          created_at: string;
          creator_profile_id: string;
          currency: string;
          expected_price: number;
          id: string;
          proposal: string;
          status: string;
          updated_at: string;
          why_suitable: string | null;
        };
        ComputedFields: never;
        Insert: {
          campaign_id: string;
          created_at?: string;
          creator_profile_id: string;
          currency?: string;
          expected_price: number;
          id?: string;
          proposal: string;
          status?: string;
          updated_at?: string;
          why_suitable?: string | null;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          creator_profile_id?: string;
          currency?: string;
          expected_price?: number;
          id?: string;
          proposal?: string;
          status?: string;
          updated_at?: string;
          why_suitable?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_applications_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_applications_creator_profile_id_fkey";
            columns: ["creator_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["profile_id"];
          },
        ];
      };
      campaigns: {
        Row: {
          application_deadline: string | null;
          budget_max: number | null;
          budget_min: number | null;
          business_profile_id: string;
          category: string;
          collaboration_type: string;
          created_at: string;
          currency: string;
          deliverables: string[];
          description: string;
          id: string;
          location: string | null;
          platforms: string[];
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          application_deadline?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          business_profile_id: string;
          category: string;
          collaboration_type: string;
          created_at?: string;
          currency?: string;
          deliverables?: string[];
          description: string;
          id?: string;
          location?: string | null;
          platforms?: string[];
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          application_deadline?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          business_profile_id?: string;
          category?: string;
          collaboration_type?: string;
          created_at?: string;
          currency?: string;
          deliverables?: string[];
          description?: string;
          id?: string;
          location?: string | null;
          platforms?: string[];
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_business_profile_id_fkey";
            columns: ["business_profile_id"];
            isOneToOne: false;
            referencedRelation: "business_profiles";
            referencedColumns: ["profile_id"];
          },
        ];
      };
      collaboration_requests: {
        Row: {
          business_profile_id: string;
          campaign_id: string | null;
          created_at: string;
          creator_profile_id: string;
          id: string;
          message: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_profile_id: string;
          campaign_id?: string | null;
          created_at?: string;
          creator_profile_id: string;
          id?: string;
          message?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          business_profile_id?: string;
          campaign_id?: string | null;
          created_at?: string;
          creator_profile_id?: string;
          id?: string;
          message?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collaboration_requests_business_profile_id_fkey";
            columns: ["business_profile_id"];
            isOneToOne: false;
            referencedRelation: "business_profiles";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "collaboration_requests_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collaboration_requests_creator_profile_id_fkey";
            columns: ["creator_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["profile_id"];
          },
        ];
      };
      collaborations: {
        Row: {
          agreed_price: number | null;
          application_id: string | null;
          business_profile_id: string;
          campaign_id: string | null;
          completed_at: string | null;
          created_at: string;
          creator_profile_id: string;
          currency: string;
          deadline: string | null;
          deliverables: NonNullable<Json>;
          id: string;
          revision_notes: string | null;
          status: string;
          submitted_at: string | null;
          terms: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agreed_price?: number | null;
          application_id?: string | null;
          business_profile_id: string;
          campaign_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          creator_profile_id: string;
          currency?: string;
          deadline?: string | null;
          deliverables?: NonNullable<Json>;
          id?: string;
          revision_notes?: string | null;
          status?: string;
          submitted_at?: string | null;
          terms?: string | null;
          updated_at?: string;
        };
        Update: {
          agreed_price?: number | null;
          application_id?: string | null;
          business_profile_id?: string;
          campaign_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          creator_profile_id?: string;
          currency?: string;
          deadline?: string | null;
          deliverables?: NonNullable<Json>;
          id?: string;
          revision_notes?: string | null;
          status?: string;
          submitted_at?: string | null;
          terms?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collaborations_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "campaign_applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collaborations_business_profile_id_fkey";
            columns: ["business_profile_id"];
            isOneToOne: false;
            referencedRelation: "business_profiles";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "collaborations_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collaborations_creator_profile_id_fkey";
            columns: ["creator_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["profile_id"];
          },
        ];
      };
      conversations: {
        Row: {
          collaboration_id: string;
          created_at: string;
          created_by: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          collaboration_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          collaboration_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_collaboration_id_fkey";
            columns: ["collaboration_id"];
            isOneToOne: true;
            referencedRelation: "collaborations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "conversations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_profiles: {
        Row: {
          bio: string | null;
          collaboration_preferences: string[];
          content_types: string[];
          created_at: string;
          languages: string[];
          niches: string[];
          onboarding_completed: boolean;
          onboarding_step: number;
          profile_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          collaboration_preferences?: string[];
          content_types?: string[];
          created_at?: string;
          languages?: string[];
          niches?: string[];
          onboarding_completed?: boolean;
          onboarding_step?: number;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          collaboration_preferences?: string[];
          content_types?: string[];
          created_at?: string;
          languages?: string[];
          niches?: string[];
          onboarding_completed?: boolean;
          onboarding_step?: number;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "creator_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_services: {
        Row: {
          active: boolean;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          price: number;
          profile_id: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          price: number;
          profile_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          price?: number;
          profile_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_services_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "creator_services_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          sender_profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_profile_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey";
            columns: ["sender_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey";
            columns: ["sender_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link_path: string | null;
          profile_id: string;
          read_at: string | null;
          title: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link_path?: string | null;
          profile_id: string;
          read_at?: string | null;
          title: string;
          type: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link_path?: string | null;
          profile_id?: string;
          read_at?: string | null;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "notifications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_items: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          media_type: string;
          media_url: string;
          position: number;
          profile_id: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          media_type: string;
          media_url: string;
          position?: number;
          profile_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          media_type?: string;
          media_url?: string;
          position?: number;
          profile_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_items_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "portfolio_items_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          city: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: string;
          state: string | null;
          updated_at: string;
          username: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: string;
          state?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: string;
          state?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          collaboration_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          reviewee_profile_id: string;
          reviewer_profile_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          collaboration_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          reviewee_profile_id: string;
          reviewer_profile_id: string;
          updated_at?: string;
        };
        Update: {
          collaboration_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          reviewee_profile_id?: string;
          reviewer_profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_collaboration_id_fkey";
            columns: ["collaboration_id"];
            isOneToOne: false;
            referencedRelation: "collaborations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewee_profile_id_fkey";
            columns: ["reviewee_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "reviews_reviewee_profile_id_fkey";
            columns: ["reviewee_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_profile_id_fkey";
            columns: ["reviewer_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "reviews_reviewer_profile_id_fkey";
            columns: ["reviewer_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      social_accounts: {
        Row: {
          created_at: string;
          follower_count: number;
          id: string;
          platform: string;
          platform_user_id: string | null;
          profile_id: string;
          updated_at: string;
          username: string;
          verification_method: string | null;
          verification_status: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          follower_count?: number;
          id?: string;
          platform: string;
          platform_user_id?: string | null;
          profile_id: string;
          updated_at?: string;
          username: string;
          verification_method?: string | null;
          verification_status?: string;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          follower_count?: number;
          id?: string;
          platform?: string;
          platform_user_id?: string | null;
          profile_id?: string;
          updated_at?: string;
          username?: string;
          verification_method?: string | null;
          verification_status?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_accounts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "social_accounts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      verifications: {
        Row: {
          created_at: string;
          evidence_path: string | null;
          expires_at: string | null;
          id: string;
          method: string | null;
          profile_id: string;
          review_notes: string | null;
          reviewed_by: string | null;
          social_account_id: string | null;
          status: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          evidence_path?: string | null;
          expires_at?: string | null;
          id?: string;
          method?: string | null;
          profile_id: string;
          review_notes?: string | null;
          reviewed_by?: string | null;
          social_account_id?: string | null;
          status?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          evidence_path?: string | null;
          expires_at?: string | null;
          id?: string;
          method?: string | null;
          profile_id?: string;
          review_notes?: string | null;
          reviewed_by?: string | null;
          social_account_id?: string | null;
          status?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verifications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "verifications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_social_account_id_fkey";
            columns: ["social_account_id"];
            isOneToOne: false;
            referencedRelation: "social_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      creator_directory: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          collaboration_preferences: string[];
          content_types: string[];
          created_at: string;
          full_name: string | null;
          languages: string[];
          niches: string[];
          profile_id: string;
          state: string | null;
          username: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
