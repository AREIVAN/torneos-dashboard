import { supabase } from "@/lib/supabase/client";
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
  const cat = p.c || "—";
  return { name, sub: `${team} · ${cat}` };
}

export async function searchRobots(
  query: string
): Promise<{ robot_id: string; data: Player }[]> {
  if (!query?.trim()) {
    return [];
  }

  const { data, error } = await supabase
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

  return rows
    .filter((r) => {
      const rid = (r.robot_id || "").toLowerCase();
      const n = ((r.data?.n as string) || "").toLowerCase();
      const t = ((r.data?.t as string) || "").toLowerCase();
      return rid.includes(qq) || n.includes(qq) || t.includes(qq);
    })
    .slice(0, 30)
    .map((r) => ({
      robot_id: r.robot_id,
      data: r.data as unknown as Player,
    }));
}
