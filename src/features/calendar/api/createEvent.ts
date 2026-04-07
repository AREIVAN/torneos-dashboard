import { getSupabaseClient } from "@/lib/supabase/client";
import type { CalendarEvent } from "./getEvents";

export interface CreateEventInput {
  name: string;
  start_at: string;
  end_at?: string | null;
  timezone?: string | null;
  venue?: string | null;
  city?: string | null;
  address?: string | null;
  categories?: string[] | null;
  tags?: string[] | null;
  poster_url?: string | null;
  official_url?: string | null;
  registration_url?: string | null;
  rules_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  fee?: string | null;
  description?: string | null;
  is_public?: boolean;
}

export interface CreateEventResult {
  success: boolean;
  error?: string;
  data?: CalendarEvent;
}

export async function createEvent(input: CreateEventInput): Promise<CreateEventResult> {
  // Validate required fields
  if (!input.name || !input.name.trim()) {
    return { success: false, error: "El nombre del torneo es requerido" };
  }

  if (!input.start_at) {
    return { success: false, error: "La fecha de inicio es requerida" };
  }

  // Prepare the event data
  const eventData = {
    name: input.name.trim(),
    start_at: input.start_at,
    end_at: input.end_at || null,
    timezone: input.timezone || "America/Mexico_City",
    venue: input.venue?.trim() || null,
    city: input.city?.trim() || null,
    address: input.address?.trim() || null,
    categories: input.categories || null,
    tags: input.tags || null,
    poster_url: input.poster_url?.trim() || null,
    official_url: input.official_url?.trim() || null,
    registration_url: input.registration_url?.trim() || null,
    rules_url: input.rules_url?.trim() || null,
    contact_email: input.contact_email?.trim() || null,
    contact_phone: input.contact_phone?.trim() || null,
    fee: input.fee?.trim() || null,
    description: input.description?.trim() || null,
    is_public: input.is_public ?? true,
  };

  const { data, error } = await getSupabaseClient()
    .from("events")
    .insert([eventData])
    .select()
    .single();

  if (error) {
    console.error("Error creating event:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as CalendarEvent };
}
