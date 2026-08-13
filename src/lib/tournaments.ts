import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  AppUser,
  BlindLevel,
  ChipDenominations,
  Player,
  PlayerRole,
  TournamentSettings,
  Transaction,
  TransactionType,
} from "@/types/tournament";

// Sin caracteres ambiguos (0/O, 1/I) para que sea fácil de tipear en un celular.
const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)];
  }
  return code;
}

export interface CreateTournamentInput {
  name: string;
  buyIn: number;
  rebuyAmount: number;
  addonAmount: number;
  bountyPerElimination: number;
  prizeSplit: number[];
  houseRuleFine: number;
  chipValues: ChipDenominations;
  startingStack: ChipDenominations;
  addonStack: ChipDenominations;
  blindStructure: BlindLevel[];
  rebuyDeadlineMinutes: number;
  seatsPerTable: number;
  dealerMode: "fixed" | "rotating";
}

/** Crea un torneo nuevo. Quien lo crea queda como "owner" (dueño) del torneo. */
export async function createTournament(
  input: CreateTournamentInput,
  owner: AppUser
): Promise<string> {
  const newDocRef = doc(collection(db, "tournaments"));

  const settings: TournamentSettings = {
    id: newDocRef.id,
    ...input,
    status: "registering",
    currentLevel: 1,
    levelEndsAt: null,
    pausedRemainingMs: null,
    createdAt: Date.now(),
    ownerUid: owner.uid,
    dealerUids: [owner.uid],
    joinCode: generateJoinCode(),
  };

  await setDoc(newDocRef, settings);

  const ownerPlayer: Player = {
    id: owner.uid,
    tournamentId: newDocRef.id,
    uid: owner.uid,
    displayName: owner.displayName,
    role: "owner",
    tableId: null,
    seat: null,
    chips: 0,
    status: "active",
    bountiesWon: [],
    registeredAt: Date.now(),
  };
  await setDoc(
    doc(db, "tournaments", newDocRef.id, "players", owner.uid),
    ownerPlayer
  );

  await updateDoc(doc(db, "users", owner.uid), {
    tournamentIds: arrayUnion(newDocRef.id),
  });

  return newDocRef.id;
}

/** Busca un torneo por su código corto y suma al usuario como jugador. */
export async function joinTournamentByCode(
  code: string,
  user: AppUser
): Promise<string> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    throw new Error("Ingresá un código.");
  }

  const matches = await getDocs(
    query(collection(db, "tournaments"), where("joinCode", "==", normalized))
  );

  if (matches.empty) {
    throw new Error("No encontramos ningún torneo con ese código.");
  }

  const tournamentId = matches.docs[0].id;
  const playerRef = doc(db, "tournaments", tournamentId, "players", user.uid);
  const existingPlayer = await getDoc(playerRef);

  if (!existingPlayer.exists()) {
    const player: Player = {
      id: user.uid,
      tournamentId,
      uid: user.uid,
      displayName: user.displayName,
      role: "player",
      tableId: null,
      seat: null,
      chips: 0,
      status: "active",
      bountiesWon: [],
      registeredAt: Date.now(),
    };
    await setDoc(playerRef, player);
  }

  await updateDoc(doc(db, "users", user.uid), {
    tournamentIds: arrayUnion(tournamentId),
  });

  return tournamentId;
}

export async function getTournament(
  tournamentId: string
): Promise<TournamentSettings | null> {
  const snap = await getDoc(doc(db, "tournaments", tournamentId));
  return snap.exists() ? (snap.data() as TournamentSettings) : null;
}

/**
 * Se suscribe a los cambios del torneo en vivo: así el timer y el estado
 * (pausado, nivel actual) se actualizan en el celular de todos sin que
 * nadie tenga que refrescar la página.
 */
export function subscribeToTournament(
  tournamentId: string,
  onChange: (tournament: TournamentSettings | null) => void
): () => void {
  return onSnapshot(doc(db, "tournaments", tournamentId), (snap) => {
    onChange(snap.exists() ? (snap.data() as TournamentSettings) : null);
  });
}

/** Arranca el torneo: pasa a "en curso" y pone en marcha el nivel 1. */
export async function startTournament(
  tournament: TournamentSettings
): Promise<void> {
  const firstLevel = tournament.blindStructure[0];
  if (!firstLevel) return;

  await updateDoc(doc(db, "tournaments", tournament.id), {
    status: "in_progress",
    currentLevel: 1,
    levelEndsAt: Date.now() + firstLevel.durationMinutes * 60_000,
    pausedRemainingMs: null,
  });
}

/** Pausa el timer, guardando cuánto tiempo le quedaba al nivel actual. */
export async function pauseTournament(
  tournament: TournamentSettings
): Promise<void> {
  if (!tournament.levelEndsAt) return;
  const remaining = Math.max(tournament.levelEndsAt - Date.now(), 0);

  await updateDoc(doc(db, "tournaments", tournament.id), {
    status: "paused",
    levelEndsAt: null,
    pausedRemainingMs: remaining,
  });
}

/** Reanuda el timer desde el tiempo que le quedaba cuando se pausó. */
export async function resumeTournament(
  tournament: TournamentSettings
): Promise<void> {
  const remaining = tournament.pausedRemainingMs ?? 0;

  await updateDoc(doc(db, "tournaments", tournament.id), {
    status: "in_progress",
    levelEndsAt: Date.now() + remaining,
    pausedRemainingMs: null,
  });
}

/** Salta a un nivel específico de la estructura de ciegas (siguiente o anterior). */
export async function goToLevel(
  tournament: TournamentSettings,
  levelNumber: number
): Promise<void> {
  const clamped = Math.min(
    Math.max(levelNumber, 1),
    tournament.blindStructure.length
  );
  const level = tournament.blindStructure[clamped - 1];
  if (!level) return;

  await updateDoc(doc(db, "tournaments", tournament.id), {
    status: "in_progress",
    currentLevel: clamped,
    levelEndsAt: Date.now() + level.durationMinutes * 60_000,
    pausedRemainingMs: null,
  });
}

export async function finishTournament(tournamentId: string): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId), {
    status: "finished",
    levelEndsAt: null,
    pausedRemainingMs: null,
  });
}

/** Actualiza la configuración de un torneo ya creado (no toca timer ni jugadores). */
export async function updateTournamentSettings(
  tournamentId: string,
  input: CreateTournamentInput
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId), { ...input });
}

export async function getPlayerInTournament(
  tournamentId: string,
  uid: string
): Promise<Player | null> {
  const snap = await getDoc(doc(db, "tournaments", tournamentId, "players", uid));
  return snap.exists() ? (snap.data() as Player) : null;
}

/** Se suscribe al documento del jugador (por si el dueño le cambia el rol en vivo). */
export function subscribeToPlayer(
  tournamentId: string,
  uid: string,
  onChange: (player: Player | null) => void
): () => void {
  return onSnapshot(
    doc(db, "tournaments", tournamentId, "players", uid),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as Player) : null);
    }
  );
}

/** Trae los torneos de un usuario a partir de su lista de ids guardada en el perfil. */
export async function getUserTournaments(
  tournamentIds: string[]
): Promise<TournamentSettings[]> {
  const results = await Promise.all(
    tournamentIds.map((id) => getTournament(id))
  );
  return results.filter((t): t is TournamentSettings => t !== null);
}

export async function listPlayers(tournamentId: string): Promise<Player[]> {
  const snap = await getDocs(collection(db, "tournaments", tournamentId, "players"));
  return snap.docs.map((d) => d.data() as Player);
}

/** Lista de jugadores en vivo: cambios de fichas o rol se ven al instante. */
export function subscribeToPlayers(
  tournamentId: string,
  onChange: (players: Player[]) => void
): () => void {
  return onSnapshot(
    collection(db, "tournaments", tournamentId, "players"),
    (snap) => {
      onChange(snap.docs.map((d) => d.data() as Player));
    }
  );
}

/**
 * Le asigna o le saca el rol de dealer a un jugador. Solo debería llamarse
 * desde la pantalla del owner (no hay chequeo de permisos acá, lo hacen las
 * reglas de Firestore: solo alguien en dealerUids puede escribir el torneo).
 */
export async function setPlayerRole(
  tournamentId: string,
  targetUid: string,
  role: Extract<PlayerRole, "dealer" | "player">
): Promise<void> {
  await updateDoc(
    doc(db, "tournaments", tournamentId, "players", targetUid),
    { role }
  );

  const tournamentRef = doc(db, "tournaments", tournamentId);
  await updateDoc(tournamentRef, {
    dealerUids: role === "dealer" ? arrayUnion(targetUid) : arrayRemove(targetUid),
  });
}

function chipsValue(
  chipValues: ChipDenominations,
  counts: ChipDenominations
): number {
  return (Object.keys(chipValues) as (keyof ChipDenominations)[]).reduce(
    (sum, color) => sum + chipValues[color] * counts[color],
    0
  );
}

async function logTransaction(
  tournamentId: string,
  playerId: string,
  type: TransactionType,
  amount: number,
  createdBy: string,
  extra?: { chipsAwarded?: number; reason?: string }
): Promise<void> {
  const ref = doc(collection(db, "tournaments", tournamentId, "transactions"));
  const transaction: Transaction = {
    id: ref.id,
    tournamentId,
    playerId,
    type,
    amount,
    createdAt: Date.now(),
    createdBy,
    ...extra,
  };
  await setDoc(ref, transaction);
}

/** Registra el buy-in inicial de un jugador y le entrega su stack de fichas. */
export async function registerBuyIn(
  tournament: TournamentSettings,
  targetUid: string,
  actingUid: string
): Promise<void> {
  const chipsAwarded = chipsValue(
    tournament.chipValues,
    tournament.startingStack
  );

  await logTransaction(
    tournament.id,
    targetUid,
    "buyin",
    tournament.buyIn,
    actingUid,
    { chipsAwarded }
  );

  await updateDoc(
    doc(db, "tournaments", tournament.id, "players", targetUid),
    { chips: chipsAwarded, buyInAt: Date.now(), status: "active" }
  );
}

/** Registra una recompra: mismas fichas que el buy-in inicial. */
export async function registerRebuy(
  tournament: TournamentSettings,
  targetUid: string,
  actingUid: string
): Promise<void> {
  const chipsAwarded = chipsValue(
    tournament.chipValues,
    tournament.startingStack
  );

  await logTransaction(
    tournament.id,
    targetUid,
    "rebuy",
    tournament.rebuyAmount,
    actingUid,
    { chipsAwarded }
  );

  await updateDoc(
    doc(db, "tournaments", tournament.id, "players", targetUid),
    { chips: increment(chipsAwarded) }
  );
}

/** Registra el addon (una sola vez por jugador). */
export async function registerAddon(
  tournament: TournamentSettings,
  targetUid: string,
  actingUid: string
): Promise<void> {
  const chipsAwarded = chipsValue(tournament.chipValues, tournament.addonStack);

  await logTransaction(
    tournament.id,
    targetUid,
    "addon",
    tournament.addonAmount,
    actingUid,
    { chipsAwarded }
  );

  await updateDoc(
    doc(db, "tournaments", tournament.id, "players", targetUid),
    { chips: increment(chipsAwarded), usedAddon: true }
  );
}

/** Registra una multa de las reglas de la casa (no cambia fichas). */
export async function registerFine(
  tournament: TournamentSettings,
  targetUid: string,
  actingUid: string,
  reason?: string
): Promise<void> {
  await logTransaction(
    tournament.id,
    targetUid,
    "fine",
    tournament.houseRuleFine,
    actingUid,
    reason ? { reason } : undefined
  );
}
