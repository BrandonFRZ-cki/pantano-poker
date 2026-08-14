"use client";

import type { Player } from "@/types/tournament";
import { rankPlayers } from "@/lib/prizes";
import { standardPayoutSplit } from "@/lib/payout-table";
import { Avatar, Card } from "@/components/ui";

/**
 * Tarjeta de la burbuja de premios: un círculo por puesto (del último al
 * primero), separado de "Posiciones" (que ordena por fichas en vivo). Acá
 * un círculo solo se "llena" cuando ese puesto ya quedó fijo — es decir,
 * cuando alguien fue eliminado en esa posición. Mientras un puesto todavía
 * lo puede ocupar cualquiera de los jugadores activos, queda vacío. Los
 * puestos que pagan (según la tabla estándar, calculada solo con la
 * cantidad de jugadores que entraron) se resaltan en verde.
 */
export function BubbleCard({ players }: { players: Player[] }) {
  const ranked = rankPlayers(players);
  const entries = ranked.length;
  if (entries < 2) return null;

  // Los puestos 1..activeCount todavía los puede ocupar cualquiera de los
  // jugadores activos (no se sabe el orden final entre ellos); solo los
  // puestos de los ya eliminados (activeCount+1..entries) están decididos.
  const activeCount = ranked.filter((r) => r.player.status === "active").length;
  const paidPlaces = standardPayoutSplit(entries).length;

  const slots = Array.from({ length: entries }, (_, i) => {
    const rank = i + 1;
    const locked = rank > activeCount;
    const entry = locked ? ranked.find((r) => r.rank === rank) : undefined;
    return { rank, locked, player: entry?.player ?? null };
  });

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-sm font-medium text-pp-brown/70">
        Burbuja de premios
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {slots.map((slot) => {
          const isPaid = slot.rank <= paidPlaces;
          return (
            <div
              key={slot.rank}
              className="flex flex-col items-center gap-1 w-14"
            >
              {slot.locked && slot.player ? (
                <Avatar name={slot.player.displayName} size={36} />
              ) : (
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 border-dashed text-xs font-medium ${
                    isPaid
                      ? "border-pp-green-dark/50 text-pp-green-dark"
                      : "border-pp-brown/30 text-pp-brown/50"
                  }`}
                >
                  {slot.rank}
                </div>
              )}
              <span
                className={`text-[10px] text-center leading-tight truncate w-full ${
                  isPaid ? "text-pp-green-dark font-medium" : "text-pp-brown/50"
                }`}
              >
                {slot.locked ? `${slot.rank}º` : isPaid ? "En el dinero" : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-pp-brown/40">
        Un círculo se llena recién cuando ese puesto ya quedó decidido (el
        jugador fue eliminado ahí). Los puestos en verde son los que pagan.
        Esto es distinto de &quot;Posiciones&quot;, que ordena por fichas en
        vivo.
      </p>
    </Card>
  );
}
