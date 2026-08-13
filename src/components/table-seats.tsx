"use client";

import Image from "next/image";
import { computeBlindSeats, computePositionLabels } from "@/lib/table-order";
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

/** Dibuja la mesa en óvalo con cada jugador en su asiento, botón/posición y turno actual. */
export function SeatDiagram({
  table,
  players,
  currentUid,
  dealerName,
  compact = false,
  onSeatTap,
}: {
  table: PokerTable;
  players: Player[];
  currentUid: string;
  /** Nombre a mostrar en la banca del dealer, arriba de la mesa (null = genérico). */
  dealerName?: string | null;
  /** Versión chica (sin fichas/posición/mano), para mostrar un modelo por mesa en una lista. */
  compact?: boolean;
  /** Si se pasa, cada asiento se puede tocar (ej. el dealer, para editar/eliminar/recomprar). */
  onSeatTap?: (player: Player) => void;
}) {
  const blinds = computeBlindSeats(table);
  const positionLabels = computePositionLabels(table);
  const positions = seatPositionsWithDealerGap(table.playerIds.length);
  const avatarSize = compact ? 22 : 32;

  return (
    <div
      className={`relative w-full aspect-[1503/825] mx-auto ${
        compact ? "max-w-xs mt-3" : "max-w-xl mt-6"
      }`}
    >
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
        <span
          className={`rounded-full bg-pp-brown text-pp-cream font-medium shadow whitespace-nowrap ${
            compact ? "text-[8px] px-2 py-0.5" : "text-[10px] px-3 py-1"
          }`}
        >
          🂠 Dealer{dealerName ? ` · ${dealerName}` : ""}
        </span>
      </div>

      {table.playerIds.map((uid, i) => {
        const player = nameFor(players, uid);
        if (!player) return null;
        const pos = positions[i];
        const isButton = blinds?.buttonUid === uid;
        const isTurn = table.currentActorUid === uid;
        const isMe = uid === currentUid;
        const posLabel = positionLabels?.[uid];
        const tappable = !compact && !!onSeatTap;

        return (
          <div
            key={uid}
            className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <button
              type="button"
              disabled={!tappable}
              onClick={() => tappable && onSeatTap?.(player)}
              className={`flex flex-col items-center rounded-xl ${
                compact ? "gap-0 px-1 py-1 w-14 min-h-[44px]" : "gap-1 px-2 py-1.5 w-20 min-h-[92px]"
              } ${
                isTurn
                  ? "bg-pp-green-light/40 ring-2 ring-pp-green-dark"
                  : "bg-white/90"
              } ${tappable ? "cursor-pointer hover:ring-2 hover:ring-pp-green-mid" : "cursor-default"}`}
            >
              <div className="relative">
                <Avatar name={player.displayName} size={avatarSize} />
                {isButton && (
                  <span
                    className={`absolute flex items-center justify-center rounded-full bg-pp-brown font-bold text-pp-cream ${
                      compact
                        ? "-top-1 -right-1 w-3 h-3 text-[7px]"
                        : "-top-1.5 -right-1.5 w-4 h-4 text-[9px]"
                    }`}
                  >
                    D
                  </span>
                )}
              </div>
              <span
                className={`text-pp-brown text-center leading-tight truncate ${
                  compact ? "text-[9px] max-w-[3.5rem]" : "text-[11px] max-w-[5rem]"
                }`}
              >
                {player.displayName}
                {!compact && isMe && (
                  <span className="text-pp-brown/50"> (tú)</span>
                )}
              </span>
              {!compact && (
                <>
                  <span className="text-[10px] text-pp-brown/60">
                    {formatChips(player.chips)}
                  </span>
                  {posLabel && (
                    <span className="text-[9px] font-medium text-pp-green-dark">
                      {posLabel}
                    </span>
                  )}
                  {player.revealedHand && player.revealedHand.length > 0 && (
                    <span className="text-[10px] font-medium text-pp-brown">
                      {player.revealedHand.join(" ")}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
