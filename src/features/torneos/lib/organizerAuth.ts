export const ORGANIZER_MASTER_TOKEN = "areivan";

export function validateOrganizerToken(token: string): boolean {
  return token.trim() === ORGANIZER_MASTER_TOKEN;
}
