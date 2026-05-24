import type {
  Play,
  Position,
  Recruit,
  RecruitStatus,
} from "./types";

export function recruitsByPosition(
  recruits: Recruit[],
  position: Position,
): Recruit[] {
  return recruits.filter((r) => r.position === position);
}

export function recruitsByClassYear(
  recruits: Recruit[],
  classYear: number,
): Recruit[] {
  return recruits.filter((r) => r.classYear === classYear);
}

export function recruitsByStatus(
  recruits: Recruit[],
  status: RecruitStatus,
): Recruit[] {
  return recruits.filter((r) => r.status === status);
}

export function playsByOpponent(plays: Play[], opponent: string): Play[] {
  const needle = opponent.toLowerCase();
  return plays.filter((p) => p.opponent?.toLowerCase() === needle);
}

export function playsByFormation(plays: Play[], formation: string): Play[] {
  const needle = formation.toLowerCase();
  return plays.filter((p) => p.formation.toLowerCase() === needle);
}
