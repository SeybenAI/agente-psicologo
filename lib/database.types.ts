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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      consents: {
        Row: {
          accepted_at: string
          id: string
          patient_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          patient_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          id?: string
          patient_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_flags: {
        Row: {
          detected_at: string
          id: string
          level: Database["public"]["Enums"]["risk_level"]
          notes: string | null
          patient_id: string
          resolved: boolean
          resolved_by: string | null
          session_id: string | null
          source: Database["public"]["Enums"]["crisis_source"]
          trigger: string | null
        }
        Insert: {
          detected_at?: string
          id?: string
          level?: Database["public"]["Enums"]["risk_level"]
          notes?: string | null
          patient_id: string
          resolved?: boolean
          resolved_by?: string | null
          session_id?: string | null
          source?: Database["public"]["Enums"]["crisis_source"]
          trigger?: string | null
        }
        Update: {
          detected_at?: string
          id?: string
          level?: Database["public"]["Enums"]["risk_level"]
          notes?: string | null
          patient_id?: string
          resolved?: boolean
          resolved_by?: string | null
          session_id?: string | null
          source?: Database["public"]["Enums"]["crisis_source"]
          trigger?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crisis_flags_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crisis_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crisis_flags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "therapy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_records: {
        Row: {
          alta: boolean
          alta_at: string | null
          created_at: string
          instrucciones_proxima_sesion: string | null
          motivo_derivacion: string | null
          notas_clinicas: string | null
          patient_id: string
          puede_iniciar_sesion: boolean
        }
        Insert: {
          alta?: boolean
          alta_at?: string | null
          created_at?: string
          instrucciones_proxima_sesion?: string | null
          motivo_derivacion?: string | null
          notas_clinicas?: string | null
          patient_id: string
          puede_iniciar_sesion?: boolean
        }
        Update: {
          alta?: boolean
          alta_at?: string | null
          created_at?: string
          instrucciones_proxima_sesion?: string | null
          motivo_derivacion?: string | null
          notas_clinicas?: string | null
          patient_id?: string
          puede_iniciar_sesion?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "patient_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          doctor_id: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          doctor_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          doctor_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_summaries: {
        Row: {
          ai_generated: boolean
          created_at: string
          doctor_approved: boolean
          doctor_notes: string | null
          doctor_reviewed: boolean
          patient_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          session_id: string
          summary: string | null
          topics: Json
        }
        Insert: {
          ai_generated?: boolean
          created_at?: string
          doctor_approved?: boolean
          doctor_notes?: string | null
          doctor_reviewed?: boolean
          patient_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          session_id: string
          summary?: string | null
          topics?: Json
        }
        Update: {
          ai_generated?: boolean
          created_at?: string
          doctor_approved?: boolean
          doctor_notes?: string | null
          doctor_reviewed?: boolean
          patient_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          session_id?: string
          summary?: string | null
          topics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "session_summaries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_summaries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "therapy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_transcripts: {
        Row: {
          created_at: string
          patient_id: string
          raw: Json | null
          session_id: string
          transcript: Json
        }
        Insert: {
          created_at?: string
          patient_id: string
          raw?: Json | null
          session_id: string
          transcript?: Json
        }
        Update: {
          created_at?: string
          patient_id?: string
          raw?: Json | null
          session_id?: string
          transcript?: Json
        }
        Relationships: [
          {
            foreignKeyName: "session_transcripts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "therapy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      therapy_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          elevenlabs_conversation_id: string | null
          ended_at: string | null
          id: string
          mensaje_paciente: string | null
          patient_id: string
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          id?: string
          mensaje_paciente?: string | null
          patient_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          id?: string
          mensaje_paciente?: string | null
          patient_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "therapy_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
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
      is_doctor_of: { Args: { p: string }; Returns: boolean }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      crisis_source: "realtime" | "post_call"
      risk_level: "low" | "medium" | "high" | "crisis"
      session_status: "in_progress" | "completed" | "flagged" | "expired"
      user_role: "doctor" | "patient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T]
