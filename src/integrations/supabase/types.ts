export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contractor_profiles: {
        Row: {
          bio: string | null
          company_name: string | null
          completed_services: number | null
          created_at: string | null
          id: string
          is_service_provider: boolean | null
          is_verified: boolean | null
          license_number: string | null
          license_type: string | null
          portfolio_images: string[] | null
          rating: number | null
          service_areas: string[] | null
          service_specializations: string[] | null
          specializations: string[] | null
          total_ratings: number | null
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          company_name?: string | null
          completed_services?: number | null
          created_at?: string | null
          id?: string
          is_service_provider?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          license_type?: string | null
          portfolio_images?: string[] | null
          rating?: number | null
          service_areas?: string[] | null
          service_specializations?: string[] | null
          specializations?: string[] | null
          total_ratings?: number | null
          updated_at?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          company_name?: string | null
          completed_services?: number | null
          created_at?: string | null
          id?: string
          is_service_provider?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          license_type?: string | null
          portfolio_images?: string[] | null
          rating?: number | null
          service_areas?: string[] | null
          service_specializations?: string[] | null
          specializations?: string[] | null
          total_ratings?: number | null
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          project_description: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          project_description?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          project_description?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      equipment_maintenance: {
        Row: {
          completed_date: string | null
          contractor_id: string
          cost: number | null
          created_at: string
          equipment_name: string | null
          equipment_type: string
          id: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          mileage_hours: number | null
          notes: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["maintenance_status"]
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          contractor_id: string
          cost?: number | null
          created_at?: string
          equipment_name?: string | null
          equipment_type: string
          id?: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          mileage_hours?: number | null
          notes?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          contractor_id?: string
          cost?: number | null
          created_at?: string
          equipment_name?: string | null
          equipment_type?: string
          id?: string
          maintenance_type?: Database["public"]["Enums"]["maintenance_type"]
          mileage_hours?: number | null
          notes?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          updated_at?: string
        }
        Relationships: []
      }
      equipment_marketplace: {
        Row: {
          brand: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          equipment_type: string
          hours_used: number | null
          id: string
          image_url: string | null
          is_sold: boolean | null
          location: string
          model: string | null
          price: number
          seller_id: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          equipment_type: string
          hours_used?: number | null
          id?: string
          image_url?: string | null
          is_sold?: boolean | null
          location: string
          model?: string | null
          price: number
          seller_id: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          equipment_type?: string
          hours_used?: number | null
          id?: string
          image_url?: string | null
          is_sold?: boolean | null
          location?: string
          model?: string | null
          price?: number
          seller_id?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_marketplace_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rentals: {
        Row: {
          brand: string | null
          created_at: string | null
          daily_rate: number
          description: string | null
          equipment_type: string
          id: string
          image_url: string | null
          is_available: boolean | null
          location: string
          model: string | null
          monthly_rate: number | null
          owner_id: string
          updated_at: string | null
          weekly_rate: number | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          daily_rate: number
          description?: string | null
          equipment_type: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          location: string
          model?: string | null
          monthly_rate?: number | null
          owner_id: string
          updated_at?: string | null
          weekly_rate?: number | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          daily_rate?: number
          description?: string | null
          equipment_type?: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          location?: string
          model?: string | null
          monthly_rate?: number | null
          owner_id?: string
          updated_at?: string | null
          weekly_rate?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rentals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_orders: {
        Row: {
          contractor_id: string
          created_at: string
          delivery_date: string
          equipment_name: string | null
          equipment_type: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          location: string
          notes: string | null
          price: number | null
          quantity: number
          status: Database["public"]["Enums"]["fuel_order_status"]
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          delivery_date: string
          equipment_name?: string | null
          equipment_type?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          location: string
          notes?: string | null
          price?: number | null
          quantity: number
          status?: Database["public"]["Enums"]["fuel_order_status"]
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          delivery_date?: string
          equipment_name?: string | null
          equipment_type?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          location?: string
          notes?: string | null
          price?: number | null
          quantity?: number
          status?: Database["public"]["Enums"]["fuel_order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      job_requests: {
        Row: {
          accepted_by: string | null
          contractor_id: string
          created_at: string | null
          id: string
          location: string
          notes: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["job_status"] | null
          updated_at: string | null
          urgency: Database["public"]["Enums"]["urgency_level"] | null
          work_date: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          accepted_by?: string | null
          contractor_id: string
          created_at?: string | null
          id?: string
          location: string
          notes?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["job_status"] | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          work_date: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          accepted_by?: string | null
          contractor_id?: string
          created_at?: string | null
          id?: string
          location?: string
          notes?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["job_status"] | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          work_date?: string
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "job_requests_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_quotes: {
        Row: {
          arrival_time: string | null
          availability: string | null
          created_at: string | null
          description: string | null
          details_pdf_url: string | null
          estimated_duration: string | null
          id: string
          price: number
          provider_id: string
          request_id: string
          status: string | null
        }
        Insert: {
          arrival_time?: string | null
          availability?: string | null
          created_at?: string | null
          description?: string | null
          details_pdf_url?: string | null
          estimated_duration?: string | null
          id?: string
          price: number
          provider_id: string
          request_id: string
          status?: string | null
        }
        Update: {
          arrival_time?: string | null
          availability?: string | null
          created_at?: string | null
          description?: string | null
          details_pdf_url?: string | null
          estimated_duration?: string | null
          id?: string
          price?: number
          provider_id?: string
          request_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          budget_range: string | null
          contractor_id: string
          created_at: string | null
          description: string | null
          equipment_name: string | null
          equipment_type: string
          id: string
          images: string[] | null
          location: string
          maintenance_type: string
          manufacturer: string | null
          model: string | null
          preferred_date: string | null
          serial_number: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          budget_range?: string | null
          contractor_id: string
          created_at?: string | null
          description?: string | null
          equipment_name?: string | null
          equipment_type: string
          id?: string
          images?: string[] | null
          location: string
          maintenance_type: string
          manufacturer?: string | null
          model?: string | null
          preferred_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          budget_range?: string | null
          contractor_id?: string
          created_at?: string | null
          description?: string | null
          equipment_name?: string | null
          equipment_type?: string
          id?: string
          images?: string[] | null
          location?: string
          maintenance_type?: string
          manufacturer?: string | null
          model?: string | null
          preferred_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      materials_orders: {
        Row: {
          contractor_id: string
          created_at: string | null
          delivery_date: string
          delivery_location: string
          id: string
          material_type: string
          notes: string | null
          price: number | null
          quantity: number
          status: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          delivery_date: string
          delivery_location: string
          id?: string
          material_type: string
          notes?: string | null
          price?: number | null
          quantity: number
          status?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          delivery_date?: string
          delivery_location?: string
          id?: string
          material_type?: string
          notes?: string | null
          price?: number | null
          quantity?: number
          status?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          general_chat: boolean | null
          id: string
          job_updates: boolean | null
          maintenance_updates: boolean | null
          personal_messages: boolean | null
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          general_chat?: boolean | null
          id?: string
          job_updates?: boolean | null
          maintenance_updates?: boolean | null
          personal_messages?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          general_chat?: boolean | null
          id?: string
          job_updates?: boolean | null
          maintenance_updates?: boolean | null
          personal_messages?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          contractor_id: string
          created_at: string | null
          id: string
          job_id: string
          rating: number
          review: string | null
          worker_id: string
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          id?: string
          job_id: string
          rating: number
          review?: string | null
          worker_id: string
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          id?: string
          job_id?: string
          rating?: number
          review?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technician_profiles: {
        Row: {
          bio: string | null
          completed_services: number | null
          created_at: string | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          location: string | null
          phone: string | null
          portfolio_images: string[] | null
          rating: number | null
          specializations: string[] | null
          total_ratings: number | null
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          completed_services?: number | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          portfolio_images?: string[] | null
          rating?: number | null
          specializations?: string[] | null
          total_ratings?: number | null
          updated_at?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          completed_services?: number | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          portfolio_images?: string[] | null
          rating?: number | null
          specializations?: string[] | null
          total_ratings?: number | null
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      technician_ratings: {
        Row: {
          contractor_id: string
          created_at: string | null
          id: string
          quote_id: string | null
          rating: number
          request_id: string | null
          review: string | null
          technician_id: string
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          id?: string
          quote_id?: string | null
          rating: number
          request_id?: string | null
          review?: string | null
          technician_id: string
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          id?: string
          quote_id?: string | null
          rating?: number
          request_id?: string | null
          review?: string | null
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_ratings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "maintenance_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          equipment_skills: string[] | null
          experience_years: number | null
          has_own_equipment: boolean | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          location: string | null
          owned_equipment: string[] | null
          rating: number | null
          total_ratings: number | null
          updated_at: string | null
          user_id: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          equipment_skills?: string[] | null
          experience_years?: number | null
          has_own_equipment?: boolean | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          owned_equipment?: string[] | null
          rating?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          user_id: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          equipment_skills?: string[] | null
          experience_years?: number | null
          has_own_equipment?: boolean | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          owned_equipment?: string[] | null
          rating?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          user_id?: string
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "worker_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "contractor" | "worker" | "admin" | "customer" | "technician"
      fuel_order_status: "pending" | "confirmed" | "delivered" | "cancelled"
      fuel_type: "diesel" | "gasoline"
      job_status: "open" | "accepted" | "completed" | "cancelled"
      maintenance_status: "scheduled" | "in_progress" | "completed" | "overdue"
      maintenance_type:
        | "oil_change"
        | "tire_change"
        | "filter_change"
        | "general_service"
        | "repair"
      service_type:
        | "operator_with_equipment"
        | "equipment_only"
        | "operator_only"
      urgency_level: "low" | "medium" | "high" | "urgent"
      user_role: "contractor" | "worker" | "admin"
      work_type:
        | "backhoe"
        | "loader"
        | "bobcat"
        | "grader"
        | "truck_driver"
        | "semi_trailer"
        | "laborer"
        | "mini_excavator"
        | "excavator"
        | "mini_backhoe"
        | "wheeled_backhoe"
        | "telescopic_loader"
        | "full_trailer"
        | "bathtub"
        | "double"
        | "flatbed"
        | "breaker"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["contractor", "worker", "admin", "customer", "technician"],
      fuel_order_status: ["pending", "confirmed", "delivered", "cancelled"],
      fuel_type: ["diesel", "gasoline"],
      job_status: ["open", "accepted", "completed", "cancelled"],
      maintenance_status: ["scheduled", "in_progress", "completed", "overdue"],
      maintenance_type: [
        "oil_change",
        "tire_change",
        "filter_change",
        "general_service",
        "repair",
      ],
      service_type: [
        "operator_with_equipment",
        "equipment_only",
        "operator_only",
      ],
      urgency_level: ["low", "medium", "high", "urgent"],
      user_role: ["contractor", "worker", "admin"],
      work_type: [
        "backhoe",
        "loader",
        "bobcat",
        "grader",
        "truck_driver",
        "semi_trailer",
        "laborer",
        "mini_excavator",
        "excavator",
        "mini_backhoe",
        "wheeled_backhoe",
        "telescopic_loader",
        "full_trailer",
        "bathtub",
        "double",
        "flatbed",
        "breaker",
      ],
    },
  },
} as const
