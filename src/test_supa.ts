import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  const { data, error } = await supabase
    .from("robot_cards")
    .select("*")
    .limit(5);
  console.log("Error:", error);
  console.log("Data keys:", data ? Object.keys(data[0] || {}) : "No data");
  console.log("Data sample:", JSON.stringify(data, null, 2));
}
main();
