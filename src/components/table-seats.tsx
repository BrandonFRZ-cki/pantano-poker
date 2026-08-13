"use client";

import Image from "next/image";
import { computeBlindSeats } from "@/lib/table-order";
import type { Player, PokerTable } from "@/types/tournament";
import { formatChips } from "@/lib/format";
import { Avatar } from "@/components/ui";

function nameFor(players: Player[], uid: string): Player | undefined {
  return players.find((p) => p.uid === uid);
}

/**
 * Posiciones (x%, y%) alrededor del dibujo de la mesa, afuera del fieltro
 * (que ocupa el 9%-91% del contenedor), corridas medio asiento para que
 * nadie quede justo arriba del todo: esa zona (la curva) es la banca del
 * dealer, no un asiento.
 */
function seatPositionsWithDealerGap(
  count: number
): { x: number; y: number }[] {
  if (count === 0) return [];
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    // Arranca arriba (-90°) y se corre medio asiento para dejar el hueco
    // del dealer libre en el centro de arriba.
    const angle = -90 + 360 / count / 2 + (360 / count) * i;
    const rad = (angle * Math.PI) / 180;
    const x = 50 + 49 * Math.cos(rad);
    const y = 50 + 48 * Math.sin(rad);
    positions.push({ x, y });
  }
  return positions;
}

/** Dibuja la mesa en óvalo con cada jugador en su asiento, botón/SB/BB y turno actual. */
export function SeatDiagram({
  table,
  players,
  currentUid,
  dealerName,
}: {
  table: PokerTable;
  players: Player[];
  currentUid: string;
  /** Nombre a mostrar en la banca del dealer, arriba de la mesa (null = genérico). */
  dealerName?: string | null;
}) {
  const blinds = computeBlindSeats(table);
  const positions = seatPositionsWithDealerGap(table.playerIds.length);

  return (
    <div className="relative w-full aspect-[1503/825] max-w-xl mx-auto mt-6">
      {/* El fieltro va adentro, con margen alrededor para que los asientos
          floten afuera de él (como en el diseño), no encima. */}
      <div className="absolute inset-[9%_9%_10%_9%]">
        <Image
          src="/icons/mesa.svg"
          alt="Mesa de Pantano Poker"
          fill
          unoptimized
          className="pointer-events-none select-none"
        />
      </div>

      {/* Banca del dealer: adentro de la curva de arriba del dibujo. */}
      <div className="absolute left-1/2 top-[19%] -translate-x-1/2 flex flex-col items-center z-10">
        <span className="rounded-full bg-pp-brown text-pp-cream text-[10px] font-medium px-3 py-1 shadow whitespace-nowrap">
          🂠 Dealer{dealerName ? ` · ${dealerName}` : ""}
        </span>
      </div>

      {table.playerIds.map((uid, i) => {
        const player = nameFor(players, uid);
        if (!player) return null;
        const pos = positions[i];
        const isButton = blinds?.buttonUid === uid;
        const isSb = blinds?.sbUid === uid && !isButton;
        const isBb = blinds?.bbUid === uid;
        const isTurn = table.currentActorUid === uid;
        const isMe = uid === currentUid;

        return (
          <div
            key={uid}
            className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 ${
                isTurn
                  ? "bg-pp-green-light/40 ring-2 ring-pp-green-dark"
                  : "bg-white/90"
              }`}
            >
              <div className="relative">
                <Avatar name={player.displayName} size={32} />
                {isButton && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-pp-brown text-[9px] font-bold text-pp-cream">
                    D
                  </span>
                )}
              </div>
              <span className="text-[11px] text-pp-brown text-center leading-tight max-w-[5rem] truncate">
                {player.displayName}
                {isMe && <span className="text-pp-brown/50"> (tú)</span>}
              </span>
              <span className="text-[10px] text-pp-brown/60">
                {formatChips(player.chips)}
              </span>
              {(isSb || isBb) && (
                <span className="text-[9px] font-medium text-pp-green-dark">
                  {isSb ? "SB" : "BB"}
                </span>
              )}
              {player.revealedHand && player.revealedHand.length > 0 && (
                <span className="text-[10px] font-medium text-pp-brown">
                  {player.revealedHand.join(" ")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
