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
import {
  computeBlindSeats,
  nextActiveInTable,
  nextInTable,
  prevActiveInTable,
  prevInTable,
} from "@/lib/table-order";
import type {
  AppUser,
  BlindLevel,
  ChipDenominations,
  ExtraChip,
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
  bountyMode: "fixed" | "mystery";
  chipLeaderBonus: number;
  prizeSplit: number[];
  guaranteedFirstPlace: number;
  houseRuleFine: number;
  houseRules: string[];
  chipValues: ChipDenominations;
  startingStack: ChipDenominations;
  addonStack: ChipDenominations;
  extraChips: ExtraChip[];
  blindStructure: BlindLevel[];
  rebuyUntilLevel: number;
  addonLevel: number;
  seatsPerTable: number;
  dealerMode: "fixed" | "rotating";
  dealerRotationLevels: number;
}

/**
 * El receso y el addon van juntos: la última recompra y la ventana de
 * addon son justo el nivel marcado como receso (isBreak) en la
 * estructura de ciegas, no algo que se configure aparte. Si no hay ningún
 * nivel marcado como receso, cae al último nivel (nunca antes de tiempo).
 */
function breakLevelOf(blindStructure: BlindLevel[]): number {
  const found = blindStructure.find((lvl) => lvl.isBreak);
  return found ? found.level : blindStructure.length;
}

/** Crea un torneo nuevo. Quien lo crea queda como "owner" (dueño) del torneo. */
export async function createTournament(
  input: CreateTournamentInput,
  owner: AppUser
): Promise<string> {
  const newDocRef = doc(collection(db, "tournaments"));
  const breakLevel = breakLevelOf(input.blindStructure);

  const settings: TournamentSettings = {
    id: newDocRef.id,
    ...input,
    rebuyUntilLevel: breakLevel,
    addonLevel: breakLevel,
    status: "registering",
    currentLevel: 1,
    levelEndsAt: null,
    pausedRemainingMs: null,
    eliminationsCount: 0,
    lastDealerRotationLevel: 1,
    lastBreakBalanceLevel: 0,
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

/**
 * Crea un jugador temporal (sin cuenta ni celular propio), para quien no
 * tiene cómo unirse por su cuenta. Vive dentro de este torneo nomás: se
 * borra junto con él, y el dueño lo maneja y lo puede ver "como" él desde
 * Mi mesa.
 */
export async function createLocalPlayer(
  tournamentId: string,
  displayName: string
): Promise<string> {
  const ref = doc(collection(db, "tournaments", tournamentId, "players"));
  const player: Player = {
    id: ref.id,
    tournamentId,
    uid: ref.id,
    displayName: displayName.trim() || "Jugador temporal",
    role: "player",
    tableId: null,
    seat: null,
    chips: 0,
    status: "active",
    bountiesWon: [],
    registeredAt: Date.now(),
    isLocal: true,
  };
  await setDoc(ref, player);
  return ref.id;
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
  const breakLevel = breakLevelOf(input.blindStructure);
  await updateDoc(doc(db, "tournaments", tournamentId), {
    ...input,
    rebuyUntilLevel: breakLevel,
    addonLevel: breakLevel,
  });
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

/** Lo mismo que chipsValue pero para los colores extra que agregó el dueño. */
export function extraChipsValue(
  extraChips: ExtraChip[],
  field: "startingStack" | "addonStack"
): number {
  return extraChips.reduce((sum, chip) => sum + chip.value * chip[field], 0);
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

/**
 * Elige una mesa para sentar a un jugador nuevo (buy-in) o que reingresa
 * (recompra): sortea al azar entre las mesas que todavía tienen un asiento
 * libre (según seatsPerTable). Si ya están todas llenas, cae en la que
 * tenga menos jugadores para no desbalancear más de la cuenta.
 */
function pickTableForSeat(
  tables: PokerTable[],
  seatsPerTable: number
): PokerTable | null {
  if (tables.length === 0) return null;
  const withRoom = tables.filter((t) => t.playerIds.length < seatsPerTable);
  if (withRoom.length > 0) {
    return withRoom[Math.floor(Math.random() * withRoom.length)];
  }
  return [...tables].sort((a, b) => a.playerIds.length - b.playerIds.length)[0];
}

/**
 * Sienta a un jugador (buy-in o recompra) en una mesa sorteada al azar
 * entre las que tienen asiento libre, y le anota mesa/asiento en su doc.
 */
async function seatNewEntry(
  tournamentId: string,
  targetUid: string,
  tables: PokerTable[],
  seatsPerTable: number,
  updates: Record<string, unknown>
): Promise<void> {
  const table = pickTableForSeat(tables, seatsPerTable);
  if (table) {
    updates.tableId = table.id;
    updates.seat = table.playerIds.length + 1;
  }

  await updateDoc(
    doc(db, "tournaments", tournamentId, "players", targetUid),
    updates
  );

  if (table) {
    await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
      playerIds: arrayUnion(targetUid),
    });
  }
}

/**
 * Registra el buy-in inicial de un jugador y le entrega su stack de fichas.
 * Si ya hay mesas armadas, lo sienta directo en una mesa sorteada con
 * asiento libre (así no queda "fantasma" sin mesa hasta que el dealer lo
 * mueva a mano).
 */
export async function registerBuyIn(
  tournament: TournamentSettings,
  targetUid: string,
  actingUid: string,
  tables?: PokerTable[]
): Promise<void> {
  const chipsAwarded =
    chipsValue(tournament.chipValues, tournament.startingStack) +
    extraChipsValue(tournament.extraChips ?? [], "startingStack");

  await logTransaction(
    tournament.id,
    targetUid,
    "buyin",
    tournament.buyIn,
    actingUid,
    { chipsAwarded }
  );

  const updates: Record<string, unknown> = {
    chips: chipsAwarded,
    buyInAt: Date.now(),
    status: "active",
  };

  if (tables && tables.length > 0) {
    await seatNewEntry(
      tournament.id,
      targetUid,
      tables,
      tournament.seatsPerTable,
      updates
    );
  } else {
    await updateDoc(
      doc(db, "tournaments", tournament.id, "players", targetUid),
      updates
    );
  }
}

/**
 * Registra una recompra: mismas fichas que el buy-in inicial. Solo tiene
 * sentido para un jugador ya eliminado (reingresa a la mesa); por eso
 * también lo vuelve a marcar como "active". Si se le pasan las mesas
 * actuales, lo asienta directo en una mesa sorteada con asiento libre (así
 * no queda "fantasma" sin mesa hasta que el dealer lo mueva a mano) y
 * limpia cualquier solicitud de recompra pendiente.
 */
export async function registerRebuy(
  tournament: TournamentSettings,
  targetUid: string,
  actingUid: string,
  tables?: PokerTable[]
): Promise<void> {
  const chipsAwarded =
    chipsValue(tournament.chipValues, tournament.startingStack) +
    extraChipsValue(tournament.extraChips ?? [], "startingStack");

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
  const updates: Record<string, unknown> = {
    chips: chipsAwarded,
    rebuyCount: increment(1),
    status: "active",
    rebuyRequestedAt: deleteField(),
    eliminatedAtTableId: deleteField(),
  };

  if (tables && tables.length > 0) {
    await seatNewEntry(
      tournament.id,
      targetUid,
      tables,
      tournament.seatsPerTable,
      updates
    );
  } else {
    await updateDoc(
      doc(db, "tournaments", tournament.id, "players", targetUid),
      updates
    );
  }
}

/**
 * El propio jugador eliminado pide recompra (por ejemplo desde la pantalla
 * de "fuiste eliminado"); solo marca la solicitud, el dealer la aprueba
 * después con el botón normal de "Recompra".
 */
export async function requestRebuy(
  tournamentId: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId, "players", uid), {
    rebuyRequestedAt: Date.now(),
  });
}

/** Actualiza el nombre del jugador en este torneo (por si cambió el nombre de su perfil). */
export async function updatePlayerDisplayName(
  tournamentId: string,
  uid: string,
  displayName: string
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId, "players", uid), {
    displayName,
  });
}

/** Registra el addon (una sola vez por jugador). */
export async function registerAddon(
  tournament: TournamentSettings,
  targetUid: string,
  actingUid: string
): Promise<void> {
  const chipsAwarded =
    chipsValue(tournament.chipValues, tournament.addonStack) +
    extraChipsValue(tournament.extraChips ?? [], "addonStack");

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

/** Lista de movimientos (buy-in, recompra, addon, multa) en vivo, más reciente primero. */
export function subscribeToTransactions(
  tournamentId: string,
  onChange: (transactions: Transaction[]) => void
): () => void {
  return onSnapshot(
    collection(db, "tournaments", tournamentId, "transactions"),
    (snap) => {
      const transactions = snap.docs
        .map((d) => d.data() as Transaction)
        .sort((a, b) => b.createdAt - a.createdAt);
      onChange(transactions);
    }
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
 * Grupo de dealers a repartir automáticamente uno por mesa (al armar las
 * mesas) o a contar para el aviso de "faltan dealers". El dueño tiene
 * privilegios de dealer en todo el torneo, pero no cuenta como uno de mesa
 * "extra": si ya hay otros dealers asignados, no se lo toma en cuenta acá
 * (igual sigue apareciendo en el selector manual de cada mesa, por si se
 * quiere asignar él mismo a propósito). Si el dueño es el único dealer que
 * hay, sí se lo cuenta — si no, ningún torneo chico podría arrancar.
 */
export function tableDealerPool(tournament: TournamentSettings): string[] {
  const nonOwner = tournament.dealerUids.filter(
    (uid) => uid !== tournament.ownerUid
  );
  return nonOwner.length > 0 ? nonOwner : tournament.dealerUids;
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

  // Con dealer fijo, cada mesa necesita su propio dealer (uno no puede
  // repartir en dos mesas a la vez): se reparten los dealers disponibles
  // (sin contar al dueño si hay otros) uno por mesa; si faltan, esas mesas
  // quedan sin asignar y el dueño las completa a mano (la UI avisa cuando
  // falten).
  const availableDealers =
    tournament.dealerMode === "fixed" ? tableDealerPool(tournament) : [];

  const tables: PokerTable[] = Array.from({ length: tableCount }, (_, i) => ({
    id: `mesa-${i + 1}`,
    tournamentId: tournament.id,
    name: `Mesa ${i + 1}`,
    playerIds: [],
    dealerUid: availableDealers[i] ?? null,
    buttonUid: null,
    currentActorUid: null,
    speakClockEndsAt: null,
    speakClockPausedMs: null,
    speakClockSeconds: 30,
  }));

  shuffled.forEach((player, index) => {
    tables[index % tableCount].playerIds.push(player.uid);
  });

  // El primer asiento de cada mesa arranca con el botón, para que "Mi mesa"
  // ya tenga algo que mostrar antes de la primera "Siguiente mano".
  tables.forEach((t) => {
    t.buttonUid = t.playerIds[0] ?? null;
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

/**
 * Balancea las mesas moviendo el mínimo de jugadores posible (en vez de
 * rehacer todo desde cero): pasa jugadores de la mesa más llena a la más
 * vacía hasta que la diferencia entre mesas sea de a lo sumo 1, y borra las
 * mesas que hayan quedado en 0 jugadores (por eliminaciones).
 */
export async function balanceTables(
  tournamentId: string,
  tables: PokerTable[]
): Promise<void> {
  const working = tables.map((t) => ({ ...t, playerIds: [...t.playerIds] }));

  let changed = true;
  while (changed) {
    changed = false;
    const sorted = [...working].sort(
      (a, b) => b.playerIds.length - a.playerIds.length
    );
    const largest = sorted[0];
    const smallest = sorted[sorted.length - 1];
    if (
      largest &&
      smallest &&
      largest.id !== smallest.id &&
      largest.playerIds.length - smallest.playerIds.length > 1
    ) {
      const movedUid = largest.playerIds.pop();
      if (movedUid) {
        smallest.playerIds.push(movedUid);
        changed = true;
      }
    }
  }

  const nonEmpty = working.filter((t) => t.playerIds.length > 0);
  const emptyIds = working
    .filter((t) => t.playerIds.length === 0)
    .map((t) => t.id);

  await Promise.all([
    ...nonEmpty.map((t) =>
      updateDoc(doc(db, "tournaments", tournamentId, "tables", t.id), {
        playerIds: t.playerIds,
      })
    ),
    ...emptyIds.map((id) =>
      deleteDoc(doc(db, "tournaments", tournamentId, "tables", id))
    ),
  ]);

  await Promise.all(
    nonEmpty.flatMap((table) =>
      table.playerIds.map((uid, seatIndex) =>
        updateDoc(doc(db, "tournaments", tournamentId, "players", uid), {
          tableId: table.id,
          seat: seatIndex + 1,
        })
      )
    )
  );
}

/** El dueño asigna (o cambia) quién es el dealer a cargo de una mesa. */
export async function setTableDealer(
  tournamentId: string,
  tableId: string,
  dealerUid: string | null
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId, "tables", tableId), {
    dealerUid,
  });
}

/**
 * Rota a los dealers entre mesas (cada mesa le pasa su dealer a la
 * siguiente), y anota en qué nivel se hizo la rotación para no repetirla.
 * Se llama sola desde el watcher global cada tournament.dealerRotationLevels
 * niveles.
 */
export async function rotateTableDealers(
  tournamentId: string,
  tables: PokerTable[],
  currentLevel: number
): Promise<void> {
  if (tables.length < 2) {
    await updateDoc(doc(db, "tournaments", tournamentId), {
      lastDealerRotationLevel: currentLevel,
    });
    return;
  }

  const dealerUids = tables.map((t) => t.dealerUid ?? null);
  const rotated = [dealerUids[dealerUids.length - 1], ...dealerUids.slice(0, -1)];

  await Promise.all(
    tables.map((t, i) =>
      updateDoc(doc(db, "tournaments", tournamentId, "tables", t.id), {
        dealerUid: rotated[i],
      })
    )
  );

  await updateDoc(doc(db, "tournaments", tournamentId), {
    lastDealerRotationLevel: currentLevel,
  });
}

/**
 * Balancea las mesas automáticamente al llegar al receso/addon (mismo
 * criterio que balanceTables) y anota el nivel para no repetirlo. Se llama
 * sola desde el watcher global.
 */
export async function autoBalanceForBreak(
  tournamentId: string,
  tables: PokerTable[],
  currentLevel: number
): Promise<void> {
  if (tables.length > 1) {
    await balanceTables(tournamentId, tables);
  }
  await updateDoc(doc(db, "tournaments", tournamentId), {
    lastBreakBalanceLevel: currentLevel,
  });
}

/**
 * Saca por completo a alguien del torneo (no solo le cambia el rol): borra
 * su registro y lo saca de la mesa si estaba sentado. Pensado para corregir
 * errores, ej. haber marcado sin querer a un dealer como jugador.
 */
export async function removePlayerFromTournament(
  tournamentId: string,
  uid: string,
  tables: PokerTable[]
): Promise<void> {
  const table = tables.find((t) => t.playerIds.includes(uid));
  if (table) {
    await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
      playerIds: arrayRemove(uid),
    });
  }

  // Si era dealer de alguna mesa o del torneo, se lo saca de esas listas
  // también, para no dejar referencias colgando a un jugador que ya no existe.
  const tablesWithHimAsDealer = tables.filter((t) => t.dealerUid === uid);
  await Promise.all(
    tablesWithHimAsDealer.map((t) =>
      updateDoc(doc(db, "tournaments", tournamentId, "tables", t.id), {
        dealerUid: null,
      })
    )
  );
  await updateDoc(doc(db, "tournaments", tournamentId), {
    dealerUids: arrayRemove(uid),
  });

  await deleteDoc(doc(db, "tournaments", tournamentId, "players", uid));
}

/**
 * Sienta a un jugador en una mesa dada, sin asumir que ya estaba en otra
 * (a diferencia de movePlayerToTable). Pensado para después de una
 * eliminación/recompra rápida, donde el jugador ya quedó sin mesa.
 */
export async function seatPlayerAtTable(
  tournamentId: string,
  table: PokerTable,
  playerUid: string
): Promise<void> {
  const newPlayerIds = table.playerIds.includes(playerUid)
    ? table.playerIds
    : [...table.playerIds, playerUid];

  await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
    playerIds: newPlayerIds,
  });

  await updateDoc(doc(db, "tournaments", tournamentId, "players", playerUid), {
    tableId: table.id,
    seat: newPlayerIds.length,
  });
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
 * Pasa a la siguiente mano en una mesa: mueve el botón al siguiente asiento
 * y limpia el turno de habla y su reloj (arrancan de nuevo con "Iniciar
 * reloj").
 */
export async function advanceButton(
  tournamentId: string,
  table: PokerTable
): Promise<void> {
  const next = nextInTable(table, table.buttonUid);
  await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
    buttonUid: next,
    currentActorUid: null,
    speakClockEndsAt: null,
    speakClockPausedMs: null,
    // Mano nueva: nadie está retirado todavía.
    foldedUids: [],
  });
}

/**
 * Deshace el último "Siguiente mano" (por si el dealer se apuró o hubo una
 * confusión): vuelve el botón un asiento para atrás y reinicia el turno de
 * habla, igual que advanceButton pero en la dirección contraria.
 */
export async function undoAdvanceButton(
  tournamentId: string,
  table: PokerTable
): Promise<void> {
  const prev = prevInTable(table, table.buttonUid);
  await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
    buttonUid: prev,
    currentActorUid: null,
    speakClockEndsAt: null,
    speakClockPausedMs: null,
    foldedUids: [],
  });
}

/** Arranca el reloj de habla en el primer jugador después de la ciega grande. */
export async function startSpeakClock(
  tournamentId: string,
  table: PokerTable
): Promise<void> {
  const seconds = table.speakClockSeconds ?? 30;
  const blinds = computeBlindSeats(table);
  const firstActor = blinds
    ? nextActiveInTable(table, blinds.bbUid)
    : (table.playerIds[0] ?? null);

  await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
    currentActorUid: firstActor,
    speakClockEndsAt: Date.now() + seconds * 1000,
    speakClockPausedMs: null,
  });
}

/** Pausa el reloj de habla (para contar fichas, armar un pozo de all-in, etc.). */
export async function pauseSpeakClock(
  tournamentId: string,
  table: PokerTable
): Promise<void> {
  if (!table.speakClockEndsAt) return;
  const remaining = Math.max(table.speakClockEndsAt - Date.now(), 0);
  await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
    speakClockEndsAt: null,
    speakClockPausedMs: remaining,
  });
}

/** Reanuda el reloj de habla desde donde se pausó. */
export async function resumeSpeakClock(
  tournamentId: string,
  table: PokerTable
): Promise<void> {
  const remaining = table.speakClockPausedMs ?? (table.speakClockSeconds ?? 30) * 1000;
  await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
    speakClockEndsAt: Date.now() + remaining,
    speakClockPausedMs: null,
  });
}

/** Pasa el turno de habla al siguiente jugador de la mesa y reinicia el reloj (salta a los retirados). */
export async function nextSpeaker(
  tournamentId: string,
  table: PokerTable
): Promise<void> {
  const seconds = table.speakClockSeconds ?? 30;
  const next = nextActiveInTable(table, table.currentActorUid);
  await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
    currentActorUid: next,
    speakClockEndsAt: Date.now() + seconds * 1000,
    speakClockPausedMs: null,
  });
}

/**
 * Vuelve al turno del jugador anterior (por si el dealer se confundió) y
 * reinicia el reloj. También salta a los retirados de la mano actual.
 */
export async function prevSpeaker(
  tournamentId: string,
  table: PokerTable
): Promise<void> {
  const seconds = table.speakClockSeconds ?? 30;
  const prev = prevActiveInTable(table, table.currentActorUid);
  await updateDoc(doc(db, "tournaments", tournamentId, "tables", table.id), {
    currentActorUid: prev,
    speakClockEndsAt: Date.now() + seconds * 1000,
    speakClockPausedMs: null,
  });
}

/**
 * Un jugador se retira (fold) de la mano actual: sale del orden de turno
 * hasta la próxima mano, pero sigue sentado en la mesa. Si tenía el turno,
 * pasa automáticamente al siguiente jugador activo.
 */
export async function foldPlayer(
  tournamentId: string,
  table: PokerTable,
  uid: string
): Promise<void> {
  const wasCurrentActor = table.currentActorUid === uid;
  const updatedTable: PokerTable = {
    ...table,
    foldedUids: [...(table.foldedUids ?? []), uid],
  };

  const updates: Record<string, unknown> = {
    foldedUids: arrayUnion(uid),
  };

  if (wasCurrentActor) {
    const seconds = table.speakClockSeconds ?? 30;
    const next = nextActiveInTable(updatedTable, uid);
    updates.currentActorUid = next;
    updates.speakClockEndsAt = Date.now() + seconds * 1000;
    updates.speakClockPausedMs = null;
  }

  await updateDoc(
    doc(db, "tournaments", tournamentId, "tables", table.id),
    updates
  );
}

/** Cambia cuántos segundos dura el turno de cada jugador en esa mesa. */
export async function setSpeakClockSeconds(
  tournamentId: string,
  tableId: string,
  seconds: number
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId, "tables", tableId), {
    speakClockSeconds: seconds,
  });
}

/** El dealer corrige a mano el stack de un jugador (conteo real en la mesa). */
export async function updatePlayerChips(
  tournamentId: string,
  targetUid: string,
  chips: number
): Promise<void> {
  await updateDoc(
    doc(db, "tournaments", tournamentId, "players", targetUid),
    { chips: Math.max(Math.round(chips), 0) }
  );
}

/**
 * El jugador muestra (o vuelve a ocultar) su propia mano. Nunca es
 * obligatorio: cards=null la esconde de nuevo.
 */
export async function setRevealedHand(
  tournamentId: string,
  uid: string,
  cards: string[] | null
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tournamentId, "players", uid), {
    revealedHand: cards && cards.length > 0 ? cards : null,
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
  eliminatedByUid: string | null,
  players?: Player[]
): Promise<void> {
  const order = tournament.eliminationsCount + 1;
  const eliminatedUid = eliminatedPlayer.uid;

  await updateDoc(doc(db, "tournaments", tournament.id), {
    eliminationsCount: increment(1),
  });

  const table = tables.find((t) => t.playerIds.includes(eliminatedUid));

  // Se guarda el stack que tenía justo antes de salir (chipsAtElimination) y
  // se le pone el contador en 0: ya no tiene fichas en juego. Si el dealer
  // deshace la eliminación, se restaura ese valor. También se anota en qué
  // mesa estaba sentado, para que el dealer de esa mesa le pueda aprobar la
  // recompra directo desde Mi mesa.
  await updateDoc(
    doc(db, "tournaments", tournament.id, "players", eliminatedUid),
    {
      status: "eliminated",
      eliminatedAt: Date.now(),
      eliminatedBy: eliminatedByUid ?? deleteField(),
      eliminatedAtTableId: table?.id ?? null,
      eliminationOrder: order,
      tableId: null,
      seat: null,
      chips: 0,
      chipsAtElimination: eliminatedPlayer.chips,
    }
  );

  if (table) {
    // Una eliminación corta la mano en seco: se pausa el reloj de habla de
    // esa mesa (el dealer lo reanuda cuando esté listo) y, si el eliminado
    // tenía el botón o el turno, se limpia para que el dealer lo reasigne.
    const remaining = table.speakClockEndsAt
      ? Math.max(table.speakClockEndsAt - Date.now(), 0)
      : (table.speakClockPausedMs ?? null);

    await updateDoc(
      doc(db, "tournaments", tournament.id, "tables", table.id),
      {
        playerIds: table.playerIds.filter((uid) => uid !== eliminatedUid),
        buttonUid: table.buttonUid === eliminatedUid ? null : table.buttonUid,
        currentActorUid:
          table.currentActorUid === eliminatedUid
            ? null
            : table.currentActorUid,
        speakClockEndsAt: null,
        speakClockPausedMs: remaining,
      }
    );
  }

  if (eliminatedByUid) {
    await updateDoc(
      doc(db, "tournaments", tournament.id, "players", eliminatedByUid),
      { bountiesWon: arrayUnion(eliminatedUid) }
    );
  }

  // Si antes de esta eliminación solo quedaban 2 jugadores activos, el otro
  // ya ganó: el torneo se cierra solo (queda como 1er puesto en el reparto).
  if (players) {
    const activeCount = players.filter(
      (p) => p.status === "active" && !!p.buyInAt
    ).length;
    if (activeCount === 2) {
      await finishTournament(tournament.id);
    }
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
