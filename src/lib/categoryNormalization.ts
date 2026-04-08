export const ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO = "Mini Sumo Autonomo Profesional";
export const ROBOT_CATEGORY_MINI_SUMO_RC = "Mini Sumo RC";
export const ROBOT_CATEGORY_SEGUIDOR_LINEA_PRO = "Seguidor de Linea Profesional";
export const ROBOT_CATEGORY_SUMO_3KG_AUTONOMO = "Sumo 3kg Autonomo";
export const ROBOT_CATEGORY_SUMO_3KG_RC = "Sumo 3kg RC";
export const ROBOT_CATEGORY_COMBATE_1LB = "Combate 1lb";
export const ROBOT_CATEGORY_COMBATE_3LB = "Combate 3lb";
export const ROBOT_CATEGORY_COMBATE_12LB = "Combate 12lb";
export const ROBOT_CATEGORY_MICRO_SUMO = "Micro Sumo";
export const ROBOT_CATEGORY_NANO_SUMO = "Nano Sumo";

export const ROBOT_CATEGORY_OPTIONS = [
  ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  ROBOT_CATEGORY_MINI_SUMO_RC,
  ROBOT_CATEGORY_SEGUIDOR_LINEA_PRO,
  ROBOT_CATEGORY_SUMO_3KG_AUTONOMO,
  ROBOT_CATEGORY_SUMO_3KG_RC,
  ROBOT_CATEGORY_COMBATE_1LB,
  ROBOT_CATEGORY_COMBATE_3LB,
  ROBOT_CATEGORY_COMBATE_12LB,
  ROBOT_CATEGORY_MICRO_SUMO,
  ROBOT_CATEGORY_NANO_SUMO,
] as const;

export type RobotCategory = (typeof ROBOT_CATEGORY_OPTIONS)[number];

const COMBATE_CATEGORY_BY_WEIGHT: Record<string, RobotCategory> = {
  "1": ROBOT_CATEGORY_COMBATE_1LB,
  "3": ROBOT_CATEGORY_COMBATE_3LB,
  "12": ROBOT_CATEGORY_COMBATE_12LB,
};

const ROBOT_CATEGORY_ALIAS_TO_CANONICAL: Record<string, string> = {
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO)]: ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_MINI_SUMO_RC)]: ROBOT_CATEGORY_MINI_SUMO_RC,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_SEGUIDOR_LINEA_PRO)]: ROBOT_CATEGORY_SEGUIDOR_LINEA_PRO,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_SUMO_3KG_AUTONOMO)]: ROBOT_CATEGORY_SUMO_3KG_AUTONOMO,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_SUMO_3KG_RC)]: ROBOT_CATEGORY_SUMO_3KG_RC,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_COMBATE_1LB)]: ROBOT_CATEGORY_COMBATE_1LB,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_COMBATE_3LB)]: ROBOT_CATEGORY_COMBATE_3LB,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_COMBATE_12LB)]: ROBOT_CATEGORY_COMBATE_12LB,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_MICRO_SUMO)]: ROBOT_CATEGORY_MICRO_SUMO,
  [normalizeCategoryLookupKey(ROBOT_CATEGORY_NANO_SUMO)]: ROBOT_CATEGORY_NANO_SUMO,
  "mini sumo": ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  minisumo: ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  "mini-sumo": ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  "mini sumo autonomo profesional": ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  "mini sumo autónomo profesional": ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  "mini sumo autonomo pro": ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  "mini sumo autonomo amateur": ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  "mini sumo autónomo amateur": ROBOT_CATEGORY_MINI_SUMO_AUTONOMO_PRO,
  "mini sumo 500g": ROBOT_CATEGORY_MINI_SUMO_RC,
  "mini sumo 500 g": ROBOT_CATEGORY_MINI_SUMO_RC,
  "mini sumo rc": ROBOT_CATEGORY_MINI_SUMO_RC,
  "mini sumo rc profesional": ROBOT_CATEGORY_MINI_SUMO_RC,
  "mini sumo rc amateur": ROBOT_CATEGORY_MINI_SUMO_RC,
  "seguidor de linea": ROBOT_CATEGORY_SEGUIDOR_LINEA_PRO,
  "seguidor linea": ROBOT_CATEGORY_SEGUIDOR_LINEA_PRO,
  "line follower": ROBOT_CATEGORY_SEGUIDOR_LINEA_PRO,
  // Legacy ambiguity: plain "sumo 3kg" now defaults to autonomous.
  "sumo 3kg": ROBOT_CATEGORY_SUMO_3KG_AUTONOMO,
  "sumo 3 kg": ROBOT_CATEGORY_SUMO_3KG_AUTONOMO,
  "sumo 3kg autonomo": ROBOT_CATEGORY_SUMO_3KG_AUTONOMO,
  "sumo 3 kg autonomo": ROBOT_CATEGORY_SUMO_3KG_AUTONOMO,
  "sumo 3kg rc": ROBOT_CATEGORY_SUMO_3KG_RC,
  "sumo 3 kg rc": ROBOT_CATEGORY_SUMO_3KG_RC,
  "micro sumo": ROBOT_CATEGORY_MICRO_SUMO,
  microsumo: ROBOT_CATEGORY_MICRO_SUMO,
  "nano sumo": ROBOT_CATEGORY_NANO_SUMO,
  nanosumo: ROBOT_CATEGORY_NANO_SUMO,
};

export function normalizeCategoryLookupKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDisplayCase(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (/^\d+(kg|g|lb)$/i.test(word)) return word.toLowerCase();
      if (word.toLowerCase() === "rc") return "RC";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function inferCombateCategory(normalizedLookup: string): RobotCategory | null {
  if (!normalizedLookup.includes("combate")) return null;
  const weight = normalizedLookup.match(/\b(1|3|12)\s*(lb|libras?)\b/i)?.[1];
  if (!weight) return null;
  return COMBATE_CATEGORY_BY_WEIGHT[weight] || null;
}

export function isCanonicalRobotCategory(value: string | null | undefined): value is RobotCategory {
  if (!value) return false;
  return ROBOT_CATEGORY_OPTIONS.includes(value as RobotCategory);
}

export function normalizeRobotCategory(value: string | null | undefined): string {
  if (!value) return "";

  const normalizedDisplay = value.replace(/\s+/g, " ").trim();
  const normalizedLookup = normalizeCategoryLookupKey(normalizedDisplay);

  const byAlias = ROBOT_CATEGORY_ALIAS_TO_CANONICAL[normalizedLookup];
  if (byAlias) return byAlias;

  const inferredCombate = inferCombateCategory(normalizedLookup);
  if (inferredCombate) return inferredCombate;

  if (normalizedLookup === "combate") {
    return "Combate";
  }

  return toDisplayCase(normalizedLookup) || normalizedDisplay;
}

export function categoriesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const normalizedA = normalizeRobotCategory(a);
  const normalizedB = normalizeRobotCategory(b);
  if (normalizedA === normalizedB) return true;
  return normalizeCategoryLookupKey(normalizedA) === normalizeCategoryLookupKey(normalizedB);
}
