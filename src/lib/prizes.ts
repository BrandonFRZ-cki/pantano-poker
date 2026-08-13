// Cálculo del bote y el reparto de premios.
//
// Cómo se arma el bote: cada buy-in/recompra/addon ya trae incluido el
// bounty (ver pantano-poker-resumen.md), así que se resta del total
// recaudado el bounty efectivamente pagado (bountyPerElimination × cantidad
// de bounties cobrados). Lo que queda es lo que se reparte entre los
// puestos, según los porcentajes de prizeSplit (ej. 70/30).
//
// El "puesto" de cada jugador sigue el mismo criterio que el tablero de
// posiciones: los activos ordenados por fichas, seguidos de los eliminados
// en orden inverso de salida (el último eliminado queda justo después de
// los activos).

import type { Player, TournamentSettings, Transaction } from "@/types/tournament";

export interface RankedPlayer {
  player: Player;
  rank: number;
}

/** Ordena a los jugadores registrados por puesto: activos por fichas, luego eliminados por orden de salida. */
export function rankPlayers(players: Player[]): RankedPlayer[] {
  const registered = players.filter((p) => p.buyInAt);

  const active = registered
    .filter((p) => p.status === "active")
    .sort((a, b) => b.chips - a.chips);

  const eliminated = registered
    .filter((p) => p.status === "eliminated")
    .sort((a, b) => (b.eliminationOrder ?? 0) - (a.eliminationOrder ?? 0));

  return [...active, ...eliminated].map((player, i) => ({
    player,
    rank: i + 1,
  }));
}

export interface PrizeAmount {
  rank: number;
  amount: number;
  player: Player | null;
}

export interface PotSummary {
  totalCollected: number;
  totalBounty: number;
  netPool: number;
  totalFines: number;
  prizes: PrizeAmount[];
  /** true si hay un monto garantizado para el 1er puesto y el bote ya lo cubre */
  guaranteedMet: boolean;
}

/**
 * Reparte el bote entre los puestos pagados (tournament.prizeSplit, uno por
 * puesto). Si hay un monto garantizado para el 1er puesto:
 * - si el bote lo alcanza a cubrir, el 1er puesto se lleva ese monto fijo y
 *   el resto de puestos se reparten lo que sobra, en la misma proporción
 *   relativa que tenían entre ellos.
 * - si el bote todavía no lo alcanza (la "burbuja" no se completó), se cae
 *   al reparto puramente por porcentaje, como si no hubiera garantía.
 */
function splitPrizes(netPool: number, prizeSplit: number[], guaranteedFirstPlace: number) {
  const guaranteeApplies =
    guaranteedFirstPlace > 0 &&
    prizeSplit.length > 1 &&
    netPool >= guaranteedFirstPlace;

  if (!guaranteeApplies) {
    return {
      amounts: prizeSplit.map((pct) => netPool * pct),
      guaranteedMet: guaranteedFirstPlace > 0 && netPool >= guaranteedFirstPlace,
    };
  }

  const remaining = netPool - guaranteedFirstPlace;
  const restSplit = prizeSplit.slice(1);
  const restTotalPct = restSplit.reduce((sum, p) => sum + p, 0) || 1;

  const amounts = [
    guaranteedFirstPlace,
    ...restSplit.map((pct) => remaining * (pct / restTotalPct)),
  ];

  return { amounts, guaranteedMet: true };
}

export function computePot(
  tournament: TournamentSettings,
  players: Player[],
  transactions: Transaction[]
): PotSummary {
  const totalCollected = transactions
    .filter(
      (t) => t.type === "buyin" || t.type === "rebuy" || t.type === "addon"
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFines = transactions
    .filter((t) => t.type === "fine")
    .reduce((sum, t) => sum + t.amount, 0);

  const bountiesPaid = players.reduce(
    (sum, p) => sum + p.bountiesWon.length,
    0
  );
  const totalBounty = bountiesPaid * tournament.bountyPerElimination;

  const netPool = Math.max(totalCollected - totalBounty, 0);

  const ranked = rankPlayers(players);

  const { amounts, guaranteedMet } = splitPrizes(
    netPool,
    tournament.prizeSplit,
    tournament.guaranteedFirstPlace ?? 0
  );

  const prizes: PrizeAmount[] = amounts.map((amount, i) => ({
    rank: i + 1,
    amount,
    player: ranked.find((r) => r.rank === i + 1)?.player ?? null,
  }));

  return { totalCollected, totalBounty, netPool, totalFines, prizes, guaranteedMet };
}
