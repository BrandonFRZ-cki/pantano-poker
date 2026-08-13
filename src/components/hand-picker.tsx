"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["♠", "♥", "♦", "♣"];

/**
 * Selector opcional de las 2 cartas para mostrarlas a los demás en la mesa.
 * Nunca es obligatorio: el jugador decide cuándo mostrar y cuándo ocultar.
 */
export function HandPicker({
  revealedHand,
  onSave,
}: {
  revealedHand: string[] | null | undefined;
  onSave: (cards: string[] | null) => Promise<void>;
}) {
  const [card1, setCard1] = useState({ rank: "A", suit: "♠" });
  const [card2, setCard2] = useState({ rank: "K", suit: "♠" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRevealed = !!revealedHand && revealedHand.length > 0;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-medium text-pp-brown/70">Tu mano</p>
      <p className="text-xs text-pp-brown/50">
        Es opcional: solo la ven los demás si vos decidís mostrarla.
      </p>

      {isRevealed ? (
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-lg text-pp-brown">
            {revealedHand!.join("  ")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => run(() => onSave(null))}
          >
            Ocultar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {[
              [card1, setCard1] as const,
              [card2, setCard2] as const,
            ].map(([card, setCard], i) => (
              <div key={i} className="flex gap-1">
                <select
                  className="text-sm border border-pp-green-mid/30 rounded-lg px-2 py-1.5 bg-white text-pp-brown"
                  value={card.rank}
                  onChange={(e) =>
                    setCard((c) => ({ ...c, rank: e.target.value }))
                  }
                >
                  {RANKS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  className="text-sm border border-pp-green-mid/30 rounded-lg px-2 py-1.5 bg-white text-pp-brown"
                  value={card.suit}
                  onChange={(e) =>
                    setCard((c) => ({ ...c, suit: e.target.value }))
                  }
                >
                  {SUITS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              run(() =>
                onSave([
                  `${card1.rank}${card1.suit}`,
                  `${card2.rank}${card2.suit}`,
                ])
              )
            }
          >
            Mostrar mi mano
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </Card>
  );
}
