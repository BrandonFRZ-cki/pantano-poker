// Tabla estándar de reparto de premios que usan la mayoría de los torneos
// garantizados: según cuántos jugadores entraron en total, define cuántos
// puestos cobran y qué % del bote le toca a cada uno. Reemplaza el reparto
// manual (70/30 fijo) por algo que se ajusta solo al tamaño del torneo.
//
// Cada entrada define el límite superior de jugadores para ese bloque y los
// % de cada puesto (deben sumar ~100). Las posiciones "en banda" (ej.
// 10º-12º con el mismo %) se repiten para cada puesto de la banda.

interface PayoutBracket {
  maxEntries: number;
  payouts: number[];
}

const PAYOUT_BRACKETS: PayoutBracket[] = [
  { maxEntries: 12, payouts: [50, 30, 20] },
  { maxEntries: 18, payouts: [40, 30, 20, 10] },
  { maxEntries: 27, payouts: [40, 23, 16, 12, 9] },
  { maxEntries: 36, payouts: [33, 20, 15, 11, 8, 7, 6] },
  { maxEntries: 50, payouts: [29, 18, 13, 10, 8, 7, 6, 5, 4] },
  {
    maxEntries: 66,
    payouts: [26, 16.5, 12, 9.5, 8, 6.5, 5, 4, 3.5, 3, 3, 3],
  },
  {
    maxEntries: 83,
    payouts: [
      25.5, 16, 11.5, 9, 7.5, 6, 4.5, 3.5, 3, 2.5, 2.5, 2.5, 2, 2, 2,
    ],
  },
  {
    maxEntries: 117,
    payouts: [
      25, 15.5, 11, 8.5, 7, 5.5, 4, 3, 2.5, 2.2, 2.2, 2.2, 2, 2, 2, 1.8, 1.8,
      1.8,
    ],
  },
];

/**
 * Devuelve el % (como fracción 0-1) que le toca a cada puesto pagado, según
 * cuántos jugadores entraron en total (headcount de jugadores registrados,
 * sin contar recompras aparte). Con menos de 3 jugadores se paga solo al
 * 1er puesto (100%); no tiene sentido repartir en mesas tan chicas.
 */
export function standardPayoutSplit(entries: number): number[] {
  if (entries <= 0) return [];
  if (entries < 3) return [1];

  const bracket =
    PAYOUT_BRACKETS.find((b) => entries <= b.maxEntries) ??
    PAYOUT_BRACKETS[PAYOUT_BRACKETS.length - 1];

  return bracket.payouts.map((pct) => pct / 100);
}
