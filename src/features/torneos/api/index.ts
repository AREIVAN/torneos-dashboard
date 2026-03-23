/**
 * Torneos API - Export all tournament-related API functions
 */

// Tournament CRUD
export {
  createTournament,
  getTournament,
  getTournamentWithParticipants,
  getTournamentWithDetails,
  getTournaments,
  updateTournament,
  updateTournamentStatus,
  saveBracketData,
  deleteTournament,
  duplicateTournament,
} from './tournaments';

// Participants
export {
  addParticipant,
  addParticipants,
  getParticipants,
  getParticipant,
  getParticipantCount,
  updateParticipantSeed,
  reorderParticipants,
  removeParticipant,
  removeAllParticipants,
  playerToRobotData,
} from './participants';

// Matches
export {
  createMatch,
  createMatches,
  getMatch,
  getTournamentMatches,
  getMatchesByRobot,
  getPendingMatches,
  updateMatch,
  recordMatchScore,
  incrementWin,
  assignMatchRobots,
  resetMatch,
  deleteMatch,
  deleteTournamentMatches,
  syncTournamentMatches,
  getMatchStats,
} from './matches';

// Standings
export {
  createStanding,
  createStandings,
  initializeStandings,
  getStanding,
  getTournamentStandings,
  getGroupStandings,
  getFinalPlacements,
  updateStanding,
  recordMatchResult,
  setFinalPosition,
  setFinalPlacements,
  deleteStanding,
  deleteTournamentStandings,
  recalculateStandings,
} from './standings';

// Robot search (existing)
export { searchRobots } from './searchRobots';

// Re-export types
export type {
  DbTournament,
  DbTournamentInsert,
  DbTournamentUpdate,
  DbParticipant,
  DbParticipantInsert,
  ParticipantRobotData,
  DbMatch,
  DbMatchInsert,
  DbMatchUpdate,
  DbStanding,
  DbStandingInsert,
  DbStandingUpdate,
  TournamentWithParticipants,
  TournamentWithDetails,
  TournamentFormat,
  TournamentStatus,
  BracketType,
  BracketData,
} from '@/lib/supabase/database.types';
