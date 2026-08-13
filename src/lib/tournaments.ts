import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
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
  PokerTable,
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
  houseRules: string[];
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
    eliminationsCount: 0,
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
/**
 * Borra un torneo por completo: sus jugadores, mesas, transacciones y el
 * documento del torneo. No hay vuelta atrás, así que solo se ofrece desde el
 * panel para torneos ya finalizados.
 */
export async function deleteTournament(tournamentId: string): Promise<void> {
  const subcollections = ["players", "tables", "transactions"] as const;
  for (const sub of subcollections) {
    const snap = await getDocs(
      collection(db, "tournaments", tournamentId, sub)
    );
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  await deleteDoc(doc(db, "tournaments", tournamentId));
}

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

/** Cuánto valen en fichas N unidades de cada color (buy-in, recompra o addon). */
export function chipsValue(
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

/**
 * Registra una recompra: mismas fichas que el buy-in inicial. Solo tiene
 * sentido para un jugador ya eliminado (reingresa a la mesa); por eso
 * también lo vuelve a marcar como "active".
 */
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

  // Se resetea el stack (no se suma al que tenía): un jugador eliminado se
  // queda en 0 fichas, así que la recompra le entrega un stack nuevo, igual
  // que el buy-in inicial.
  await updateDoc(
    doc(db, "tournaments", tournament.id, "players", targetUid),
    {
      chips: chipsAwarded,
      rebuyCount: increment(1),
      status: "active",
    }
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

/** Lista de mesas en vivo, ordenadas por nombre. */
export function subscribeToTables(
  tournamentId: string,
  onChange: (tables: PokerTable[]) => void
): () => void {
  return onSnapshot(
    collection(db, "tournaments", tournamentId, "tables"),
    (snap) => {
      const tables = snap.docs
        .map((d) => d.data() as PokerTable)
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
      onChange(tables);
    }
  );
}

/**
 * Arma (o rehace desde cero) las mesas del torneo: reparte a los jugadores
 * activos y ya registrados en tantas mesas como haga falta según
 * seatsPerTable, en orden aleatorio. Útil también para rebalancear después
 * de varias eliminaciones.
 */
export async function assignTables(
  tournament: TournamentSettings,
  players: Player[]
): Promise<void> {
  const eligible = players.filter((p) => p.buyInAt && p.status === "active");

  const existing = await getDocs(
    collection(db, "tournaments", tournament.id, "tables")
  );
  await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));

  if (eligible.length === 0) return;

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const tableCount = Math.max(
    Math.ceil(shuffled.length / tournament.seatsPerTable),
    1
  );

  const tables: PokerTable[] = Array.from({ length: tableCount }, (_, i) => ({
    id: `mesa-${i + 1}`,
    tournamentId: tournament.id,
    name: `Mesa ${i + 1}`,
    playerIds: [],
  }));

  shuffled.forEach((player, index) => {
    tables[index % tableCount].playerIds.push(player.uid);
  });

  await Promise.all(
    tables.map((t) =>
      setDoc(doc(db, "tournaments", tournament.id, "tables", t.id), t)
    )
  );

  await Promise.all(
    tables.flatMap((table) =>
      table.playerIds.map((uid, seatIndex) =>
        updateDoc(doc(db, "tournaments", tournament.id, "players", uid), {
          tableId: table.id,
          seat: seatIndex + 1,
        })
      )
    )
  );
}

/** Mueve manualmente a un jugador a otra mesa (se le asigna el último asiento libre ahí). */
export async function movePlayerToTable(
  tournamentId: string,
  tables: PokerTable[],
  playerUid: string,
  targetTableId: string
): Promise<void> {
  const currentTable = tables.find((t) => t.playerIds.includes(playerUid));
  const targetTable = tables.find((t) => t.id === targetTableId);
  if (!targetTable || currentTable?.id === targetTableId) return;

  if (currentTable) {
    await updateDoc(
      doc(db, "tournaments", tournamentId, "tables", currentTable.id),
      { playerIds: currentTable.playerIds.filter((uid) => uid !== playerUid) }
    );
  }

  const newPlayerIds = [...targetTable.playerIds, playerUid];
  await updateDoc(
    doc(db, "tournaments", tournamentId, "tables", targetTableId),
    { playerIds: newPlayerIds }
  );

  await updateDoc(doc(db, "tournaments", tournamentId, "players", playerUid), {
    tableId: targetTableId,
    seat: newPlayerIds.length,
  });
}

/**
 * Elimina a un jugador. Si se indica quién lo eliminó, le suma el bounty.
 * Lo saca de su mesa (queda fuera del juego).
 */
export async function eliminatePlayer(
  tournament: TournamentSettings,
  tables: PokerTable[],
  eliminatedPlayer: Player,
  eliminatedByUid: string | null
): Promise<void> {
  const order = tournament.eliminationsCount + 1;
  const eliminatedUid = eliminatedPlayer.uid;

  await updateDoc(doc(db, "tournaments", tournament.id), {
    eliminationsCount: increment(1),
  });

  // Se guarda el stack que tenía justo antes de salir (chipsAtElimination) y
  // se le pone el contador en 0: ya no tiene fichas en juego. Si el dealer
  // deshace la eliminación, se restaura ese valor.
  await updateDoc(
    doc(db, "tournaments", tournament.id, "players", eliminatedUid),
    {
      status: "eliminated",
      eliminatedAt: Date.now(),
      eliminatedBy: eliminatedByUid ?? deleteField(),
      eliminationOrder: order,
      tableId: null,
      seat: null,
      chips: 0,
      chipsAtElimination: eliminatedPlayer.chips,
    }
  );

  const table = tables.find((t) => t.playerIds.includes(eliminatedUid));
  if (table) {
    await updateDoc(
      doc(db, "tournaments", tournament.id, "tables", table.id),
      { playerIds: table.playerIds.filter((uid) => uid !== eliminatedUid) }
    );
  }

  if (eliminatedByUid) {
    await updateDoc(
      doc(db, "tournaments", tournament.id, "players", eliminatedByUid),
      { bountiesWon: arrayUnion(eliminatedUid) }
    );
  }
}

/**
 * Deshace la última eliminación registrada (por si el dealer se equivocó).
 * Solo funciona sobre la eliminación más reciente, para no desordenar el
 * conteo de puestos.
 */
export async function undoLastElimination(
  tournament: TournamentSettings,
  eliminatedPlayer: Player
): Promise<void> {
  if (eliminatedPlayer.eliminationOrder !== tournament.eliminationsCount) return;

  await updateDoc(doc(db, "tournaments", tournament.id), {
    eliminationsCount: increment(-1),
  });

  await updateDoc(
    doc(db, "tournaments", tournament.id, "players", eliminatedPlayer.uid),
    {
      status: "active",
      chips: eliminatedPlayer.chipsAtElimination ?? eliminatedPlayer.chips,
      chipsAtElimination: deleteField(),
      eliminatedAt: deleteField(),
      eliminatedBy: deleteField(),
      eliminationOrder: deleteField(),
    }
  );

  if (eliminatedPlayer.eliminatedBy) {
    await updateDoc(
      doc(db, "tournaments", tournament.id, "players", eliminatedPlayer.eliminatedBy),
      { bountiesWon: arrayRemove(eliminatedPlayer.uid) }
    );
  }
}
