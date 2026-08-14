"use client";

import type { Player, TournamentSettings, Transaction } from "@/types/tournament";
import { computeChipLeaderBonus, computePot, rankPlayers } from "@/lib/prizes";
import { standardPayoutSplit } from "@/lib/payout-table";
import { formatMoney } from "@/lib/format";
import { Avatar, Card } from "@/components/ui";

/**
 * Tarjeta pública de la burbuja de premios: cuánto se recaudó, cuánto le
 * toca a cada puesto (1º, 2º, 3º...) y un círculo por puesto que solo se
 * "llena" con el nombre de alguien cuando ese puesto ya quedó decidido de
 * verdad (fue eliminado ahí). A propósito NO se le pone nombre a un monto
 * mientras el puesto todavía lo puede ocupar cualquiera de los activos —
 * antes se mostraba el líder de fichas de turno con su premio al lado, y
 * daba la sensación de que ya había ganado. Reemplaza a la vieja tarjeta
 * "Bote y premios".
 */
export function BubbleCard({
  tournament,
  players,
  transactions,
}: {
  tournament: TournamentSettings;
  players: Player[];
  transactions: Transaction[];
}) {
  const ranked = rankPlayers(players);
  const entries = ranked.length;
  if (entries < 2) return null;

  // Los puestos 1..activeCount todavía los puede ocupar cualquiera de los
  // jugadores activos (no se sabe el orden final entre ellos); solo los
  // puestos de los ya eliminados (activeCount+1..entries) están decididos.
  const activeCount = ranked.filter((r) => r.player.status === "active").length;
  const paidPlaces = standardPayoutSplit(entries).length;

  // Torneos creados antes de estos campos: se asume que seguían abiertos
  // en cualquier nivel.
  const rebuyUntilLevel =
    tournament.rebuyUntilLevel ?? tournament.blindStructure.length;
  const addonLevel = tournament.addonLevel ?? 1;
  const closeLevel = Math.max(rebuyUntilLevel, addonLevel);
  const entriesClosed =
    tournament.status === "finished" || tournament.currentLevel > closeLevel;

  const pot = entriesClosed ? computePot(tournament, players, transactions) : null;
  const chipLeader = entriesClosed
    ? computeChipLeaderBonus(tournament, players)
    : null;
  const bountyMode = tournament.bountyMode ?? "fixed";

  const slots = Array.from({ length: entries }, (_, i) => {
    const rank = i + 1;
    const locked = rank > activeCount;
    const entry = locked ? ranked.find((r) => r.rank === rank) : undefined;
    const amount = pot?.prizes.find((p) => p.rank === rank)?.amount ?? null;
    return { rank, locked, player: entry?.player ?? null, amount };
  });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-pp-brown/70">
          Burbuja de premios
        </p>
        {pot && (
          <span className="font-display text-lg text-pp-green-dark">
            {formatMoney(pot.netPool)}
          </span>
        )}
      </div>

      {pot ? (
        <p className="text-xs text-pp-brown/50">
          Recaudado {formatMoney(pot.totalCollected)}
          {pot.totalBounty > 0 &&
            (bountyMode === "mystery"
              ? " · bounty misterioso (se revela al final)"
              : ` · bounty pagado ${formatMoney(pot.totalBounty)}`)}
        </p>
      ) : (
        <p className="text-xs text-pp-brown/50">
          El bote todavía puede crecer: el monto de cada puesto se muestra
          cuando cierren las recompras y el addon (nivel {closeLevel}).
        </p>
      )}

      {chipLeader && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-pp-green-light/20 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={chipLeader.player.displayName} size={28} />
            <span className="text-sm text-pp-brown truncate">
              👑 Líder de fichas: {chipLeader.player.displayName}
            </span>
          </div>
          <span className="text-sm font-medium text-pp-green-dark shrink-0">
            {formatMoney(chipLeader.amount)}
          </span>
        </div>
      )}

      {pot && tournament.guaranteedFirstPlace > 0 && (
        <p className="text-xs text-pp-brown/50">
          {pot.guaranteedMet
            ? `1er puesto asegurado: ${formatMoney(tournament.guaranteedFirstPlace)}`
            : `Todavía no se alcanza el mínimo garantizado para el 1er puesto (${formatMoney(tournament.guaranteedFirstPlace)}), así que por ahora se reparte por porcentaje.`}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {slots.map((slot) => {
          const isPaid = slot.rank <= paidPlaces;
          return (
            <div
              key={slot.rank}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                isPaid ? "bg-pp-green-dark/5" : "bg-pp-brown/5"
              }`}
            >
              {slot.locked && slot.player ? (
                <Avatar name={slot.player.displayName} size={36} />
              ) : (
                <div
                  className={`flex items-center justify-center w-9 h-9 shrink-0 rounded-full border-2 border-dashed text-xs font-medium ${
                    isPaid
                      ? "border-pp-green-dark/50 text-pp-green-dark"
                      : "border-pp-brown/30 text-pp-brown/50"
                  }`}
                >
                  {slot.rank}
                </div>
              )}
              <span
                className={`flex-1 text-sm truncate ${
                  isPaid ? "text-pp-green-dark font-medium" : "text-pp-brown/70"
                }`}
              >
                {slot.locked && slot.player ? slot.player.displayName : "Por definir"}
              </span>
              <span
                className={`text-xs shrink-0 text-right ${
                  isPaid ? "text-pp-green-dark font-medium" : "text-pp-brown/50"
                }`}
              >
                {slot.amount != null
                  ? formatMoney(slot.amount)
                  : slot.locked
                    ? `${slot.rank}º`
                    : isPaid
                      ? "En el dinero"
                      : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-pp-brown/40">
        Los puestos en verde son los que pagan. Un círculo se llena con un
        nombre recién cuando ese puesto ya quedó decidido (el jugador fue
        eliminado ahí); antes de eso el monto es solo un estimado que se
        actualiza en vivo — se confirma cuando el torneo termina.
      </p>
    </Card>
  );
}
