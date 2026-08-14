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

/**
 * Un color de ficha adicional a los 5 fijos (white/green/red/blue/black),
 * definido libremente por el dueño del torneo: nombre, color (hex, para el
 * circulito) y cuánto vale/entrega en el buy-in y el addon.
 */
export interface ExtraChip {
  id: string;
  label: string;
  hex: string;
  value: number;
  startingStack: number;
  addonStack: number;
}

export interface TournamentSettings {
  id: string;
  name: string;

  buyIn: number;
  rebuyAmount: number;
  addonAmount: number;
  /** Parte de cada buy-in/recompra/addon que se destina al bounty del jugador */
  bountyPerElimination: number;
  /**
   * "fixed": se ve el monto de cada bounty apenas se cierra la etapa de
   * reinscripciones. "mystery": el monto total se sabe, pero no se revela
   * quién ganó cuánto hasta el resumen final (más suspenso).
   */
  bountyMode: "fixed" | "mystery";
  /**
   * Premio extra ($ , 0 = desactivado) para quien tenga más fichas justo al
   * cerrarse las reinscripciones/addon (el receso). Si hay empate en la
   * cima, no se lo lleva nadie.
   */
  chipLeaderBonus: number;
  /**
   * Porcentaje del bote por puesto (cuántos puestos pagan = el largo de
   * este array). Ya NO se usa para calcular el reparto (ver
   * lib/payout-table.ts, que lo calcula automático según la cantidad de
   * jugadores) — queda solo por compatibilidad con torneos viejos.
   */
  prizeSplit: number[];
  /**
   * Monto fijo garantizado para el 1er puesto, sin importar el %. Si el
   * bote no alcanza a cubrirlo, se cae al reparto por porcentaje nomás.
   * 0 = sin garantía, reparto puramente por porcentaje.
   */
  guaranteedFirstPlace: number;
  /** Monto de la multa de las reglas de la casa (fondo de trofeo/gastos) */
  houseRuleFine: number;
  /** Lista de motivos de multa definidos al crear el torneo, para elegir en un combobox */
  houseRules: string[];

  chipValues: ChipDenominations;
  startingStack: ChipDenominations;
  /** fichas que se entregan en el addon; 0 en los colores que no aplican */
  addonStack: ChipDenominations;
  /** colores de ficha adicionales a los 5 de siempre, definidos por el dueño */
  extraChips: ExtraChip[];

  blindStructure: BlindLevel[];
  /** Último nivel (inclusive) en el que todavía se aceptan recompras/reingresos */
  rebuyUntilLevel: number;
  /** Nivel en el que se habilita el addon (normalmente el del receso) */
  addonLevel: number;
  /** Jugadores por mesa antes de necesitar balanceo/mesa nueva */
  seatsPerTable: number;
  /** "fixed": un dealer fijo. "rotating": el rol de dealer puede pasar entre jugadores */
  dealerMode: "fixed" | "rotating";
  /** Cada cuántos niveles se turnan los dealers entre mesas (0 = nunca rotan) */
  dealerRotationLevels: number;
  /** Último nivel en el que se rotaron los dealers (para no repetir la rotación) */
  lastDealerRotationLevel?: number;
  /** Último nivel de receso/addon en el que ya se auto-balancearon las mesas */
  lastBreakBalanceLevel?: number;

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
  /** uid del dealer a cargo de esta mesa (solo con dealerMode "fixed"); null = sin asignar */
  dealerUid?: string | null;

  /** uid de quien tiene el botón de dealer en la mano actual de esta mesa */
  buttonUid?: string | null;
  /** uid de quien tiene el turno de hablar ahora mismo */
  currentActorUid?: string | null;
  /** epoch ms en que se acaba el tiempo del jugador actual (null si está pausado) */
  speakClockEndsAt?: number | null;
  /** ms restantes congelados cuando el dealer pausa el reloj de habla */
  speakClockPausedMs?: number | null;
  /** segundos que dura el turno de cada jugador (configurable, 30 por defecto) */
  speakClockSeconds?: number;
  /** uids que se retiraron (foldearon) en la mano actual; se limpia en cada mano nueva */
  foldedUids?: string[];
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
  /** epoch ms en que pidió recompra (a la espera de que el dealer la apruebe) */
  rebuyRequestedAt?: number | null;
  /**
   * true si es un jugador temporal creado por el dueño (sin cuenta ni
   * celular propio): vive solo dentro de este torneo y se borra junto con
   * él. El dueño puede manejarlo y ver la app "como" él.
   */
  isLocal?: boolean;
  /**
   * Sus 2 cartas si decidió mostrarlas (ej. ["As","Kd"]), opcional y nunca
   * obligatorio. null/undefined = las tiene ocultas.
   */
  revealedHand?: string[] | null;
}
