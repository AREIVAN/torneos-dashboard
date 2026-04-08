import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizeCategoryLookupKey, normalizeRobotCategory } from "@/lib/categoryNormalization";
import type { Player } from "../lib/types";

interface RobotRow {
  robot_id: string;
  data: Record<string, unknown>;
  updated_at: string;
  created_at: string;
}

export function robotLabel(p: Partial<Player> | null): {
  name: string;
  sub: string;
} {
  if (!p) return { name: "—", sub: "—" };
  const name = p.n || p.i || "—";
  const team = p.t || "—";
  const cat = normalizeRobotCategory(p.c) || "—";
  return { name, sub: `${team} · ${cat}` };
}

export async function searchRobots(
  query: string
): Promise<{ robot_id: string; data: Player }[]> {
  if (!query?.trim()) {
    return [];
  }

  const { data, error } = await getSupabaseClient()
    .from("robot_cards")
    .select("robot_id, data, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(250);

  if (error) {
    console.error("searchRobots error:", error);
    throw error;
  }

  const rows = (data || []) as RobotRow[];
  const qq = query.toLowerCase();
  const qqCategory = normalizeCategoryLookupKey(query);

  return rows
    .filter((r) => {
      const rid = (r.robot_id || "").toLowerCase();
      const n = ((r.data?.n as string) || "").toLowerCase();
      const t = ((r.data?.t as string) || "").toLowerCase();
      const c = normalizeCategoryLookupKey((r.data?.c as string) || "");
      const byCategory = qqCategory ? c.includes(qqCategory) : false;
      return rid.includes(qq) || n.includes(qq) || t.includes(qq) || byCategory;
    })
    .slice(0, 30)
    .map((r) => ({
      robot_id: r.robot_id,
      data: {
        ...(r.data as unknown as Player),
        c: normalizeRobotCategory((r.data?.c as string) || ""),
      },
    }));
}
