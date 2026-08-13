// Cálculos de orden de asiento: quién tiene el botón, la ciega chica y la
// ciega grande, y a quién le toca el turno después de otro. El orden de
// playerIds en la mesa ES el orden de asientos (índice 0 = asiento 1).

import type { PokerTable } from "@/types/tournament";

/** Uid siguiente en la mesa, dando la vuelta al llegar al final. */
export function nextInTable(table: PokerTable, fromUid: string | null | undefined): string | null {
  const order = table.playerIds;
  if (order.length === 0) return null;
  if (!fromUid) return order[0];

  const idx = order.indexOf(fromUid);
  if (idx === -1) return order[0];

  return order[(idx + 1) % order.length];
}

export interface BlindSeats {
  buttonUid: string;
  sbUid: string;
  bbUid: string;
}

/**
 * A partir del botón, calcula quién tiene la ciega chica y la grande.
 * Con solo 2 jugadores (heads-up) el del botón también es la ciega chica,
 * como manda la regla estándar.
 */
export function computeBlindSeats(table: PokerTable): BlindSeats | null {
  const order = table.playerIds;
  if (order.length < 2) return null;

  const buttonUid =
    table.buttonUid && order.includes(table.buttonUid)
      ? table.buttonUid
      : order[0];

  if (order.length === 2) {
    const other = order.find((uid) => uid !== buttonUid) ?? order[0];
    return { buttonUid, sbUid: buttonUid, bbUid: other };
  }

  const sbUid = nextInTable(table, buttonUid) ?? buttonUid;
  const bbUid = nextInTable(table, sbUid) ?? buttonUid;
  return { buttonUid, sbUid, bbUid };
}

/** Posiciones (x%, y%) repartidas en óvalo para dibujar N asientos alrededor de la mesa. */
export function seatPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    // Arranca arriba (-90°) y reparte el resto en círculo.
    const angle = -90 + (360 / count) * i;
    const rad = (angle * Math.PI) / 180;
    const x = 50 + 44 * Math.cos(rad);
    const y = 50 + 40 * Math.sin(rad);
    positions.push({ x, y });
  }
  return positions;
}
