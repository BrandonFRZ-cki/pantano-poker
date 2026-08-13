// Modelo de datos de Firestore para Pantano Poker.
// Colecciones raíz: "tournaments/{tournamentId}" con subcolecciones
// "players", "tables", "transactions".

// "owner" = quien creó el torneo (único, no rotativo). "dealer" = puede
// controlar el timer, recompras y eliminaciones; el owner se lo puede dar o
// sacar a cualquier jugador. "player" = jugador normal.
export type PlayerRole = "owner" | "dealer" | "player";

/** Perfil de usuario autenticado (Google o invitado) */
export interface AppUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  /** ids de los torneos (tournaments/{id}) de los que participa, como creador o invitado */
  tournamentIds: string[];
}

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak?: boolean;
}

export type TournamentStatus =
  | "scheduled"
  | "registering"
  | "in_progress"
  | "paused"
  | "break"
  | "finished";

export interface ChipDenominations {
  white: number;
  green: number;
  red: number;
  blue: number;
  black: number;
}

export interface TournamentSettings {
  id: string;
  name: string;

  buyIn: number;
  rebuyAmount: number;
  addonAmount: number;
  /** Parte de cada buy-in/recompra/addon que se destina al bounty del jugador */
  bountyPerElimination: number;
  /** Porcentaje del bote por puesto, ej. [0.7, 0.3] para 1º y 2º */
  prizeSplit: number[];
  /** Monto de la multa de las reglas de la casa (fondo de trofeo/gastos) */
  houseRuleFine: number;
  /** Lista de motivos de multa definidos al crear el torneo, para elegir en un combobox */
  houseRules: string[];

  chipValues: ChipDenominations;
  startingStack: ChipDenominations;
  /** fichas que se entregan en el addon; 0 en los colores que no aplican */
  addonStack: ChipDenominations;

  blindStructure: BlindLevel[];
  /** Minutos desde el inicio del torneo en que cierran las recompras */
  rebuyDeadlineMinutes: number;
  /** Jugadores por mesa antes de necesitar balanceo/mesa nueva */
  seatsPerTable: number;
  /** "fixed": un dealer fijo. "rotating": el rol de dealer puede pasar entre jugadores */
  dealerMode: "fixed" | "rotating";

  status: TournamentStatus;
  currentLevel: number;
  /** epoch ms en que termina el nivel actual — fuente de verdad del timer, la fija el dealer */
  levelEndsAt: number | null;
  /** epoch ms restante congelado cuando el dealer pausa el timer */
  pausedRemainingMs: number | null;
  /** cuántos jugadores fueron eliminados hasta ahora (define el orden de salida) */
  eliminationsCount: number;

  createdAt: number;
  /** uid de quien creó el torneo */
  ownerUid: string;
  /** uids con permiso de dealer/admin sobre este torneo (el creador + respaldos) */
  dealerUids: string[];
  /** código corto para unirse al torneo, ej. "PANT2026" */
  joinCode: string;
}

export interface PokerTable {
  id: string;
  tournamentId: string;
  name: string;
  /** uids en orden de asiento: el índice 0 es el asiento 1, etc. */
  playerIds: string[];
}

export type TransactionType = "buyin" | "rebuy" | "addon" | "fine";

export interface Transaction {
  id: string;
  tournamentId: string;
  playerId: string;
  type: TransactionType;
  amount: number;
  chipsAwarded?: number;
  /** motivo de la multa, ej. "jugar fuera de turno" */
  reason?: string;
  createdAt: number;
  /** uid del dealer/admin que registró el movimiento */
  createdBy: string;
}

export type PlayerStatus = "active" | "eliminated";

export interface Player {
  id: string;
  tournamentId: string;
  uid: string;
  displayName: string;
  role: PlayerRole;
  tableId: string | null;
  seat: number | null;
  chips: number;
  status: PlayerStatus;
  /** epoch ms en que el dealer le registró el buy-in inicial; sin esto, todavía no jugó */
  buyInAt?: number;
  /** cuántas recompras hizo, para poder mostrar el desglose de fichas */
  rebuyCount?: number;
  /** ya usó su addon (solo se puede una vez) */
  usedAddon?: boolean;
  eliminatedAt?: number;
  /** playerId de quien lo eliminó, para asignar el bounty */
  eliminatedBy?: string;
  eliminationOrder?: number;
  /** cuántas fichas tenía justo antes de ser eliminado, por si el dealer deshace la eliminación */
  chipsAtElimination?: number;
  /** ids de jugadores por los que cobró bounty */
  bountiesWon: string[];
  registeredAt: number;
}
