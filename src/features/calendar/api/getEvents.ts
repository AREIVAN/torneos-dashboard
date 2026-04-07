import { getSupabaseClient } from "@/lib/supabase/client";

export interface CalendarEvent {
  id: string;
  name: string;
  start_at: string;
  end_at?: string | null;
  venue?: string | null;
  city?: string | null;
  address?: string | null;
  categories?: string | string[] | null;
  tags?: string | string[] | null;
  poster_url?: string | null;
  official_url?: string | null;
  registration_url?: string | null;
  rules_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  fee?: string | null;
  country_code?: string | null;
  description?: string | null;
  timezone?: string | null;
  is_public?: boolean;
}

export async function getEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await getSupabaseClient()
    .from("events")
    .select("*")
    .eq("is_public", true)
    .order("start_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("Error fetching events:", error.message);
    return [];
  }

  return (data as CalendarEvent[]) || [];
}
