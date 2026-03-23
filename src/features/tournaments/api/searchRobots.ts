import { supabase } from "@/lib/supabase/client";

export interface RobotRow {
  robot_id: string;
  data: {
    i: string;  // robot_id
    n: string;  // name
    t?: string; // team
    c?: string; // category
  };
  updated_at: string;
  created_at: string;
}

export async function searchRobots(query: string): Promise<RobotRow[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from("robot_cards")
    .select("robot_id, data, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(250);

  if (error) {
    console.error("Error searching robots:", error.message);
    throw new Error(error.message);
  }

  const qq = query.toLowerCase();
  return (data || [])
    .filter((r: RobotRow) => {
      const rid = (r.robot_id || "").toLowerCase();
      const n = (r?.data?.n || "").toLowerCase();
      const t = (r?.data?.t || "").toLowerCase();
      return rid.includes(qq) || n.includes(qq) || t.includes(qq);
    })
    .slice(0, 30);
}
