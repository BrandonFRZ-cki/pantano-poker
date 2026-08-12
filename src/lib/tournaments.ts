import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
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

export async function getPlayerInTournament(
  tournamentId: string,
  uid: string
): Promise<Player | null> {
  const snap = await getDoc(doc(db, "tournaments", tournamentId, "players", uid));
  return snap.exists() ? (snap.data() as Player) : null;
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
