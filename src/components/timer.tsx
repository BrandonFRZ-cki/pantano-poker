"use client";

import { useEffect, useRef, useState } from "react";
import {
  finishTournament,
  goToLevel,
  pauseTournament,
  resumeTournament,
  startTournament,
} from "@/lib/tournaments";
import type { TournamentSettings } from "@/types/tournament";
import { Button, Card } from "@/components/ui";

function formatClock(ms: number): string {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Franja chica con el timer de niveles y las ciegas/ante, para mostrar arriba de otras pantallas (ej. Mi mesa). */
export function MiniLevelTimer({ tournament }: { tournament: TournamentSettings }) {
  const [now, setNow] = useState(() => Date.now());
  const isRunning = tournament.status === "in_progress";

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  if (tournament.status === "registering" || tournament.status === "finished") {
    return null;
  }

  const remainingMs = isRunning
    ? (tournament.levelEndsAt ?? now) - now
    : tournament.pausedRemainingMs ?? 0;
  const currentLevel = tournament.blindStructure[tournament.currentLevel - 1];

  return (
    <div className="flex items-center justify-center gap-3 rounded-full bg-white/70 border border-pp-green-mid/15 px-4 py-1.5 mx-auto text-sm">
      <span className="text-pp-brown/70">
        {currentLevel?.isBreak ? "Receso" : `Nivel ${tournament.currentLevel}`}
        {tournament.status === "paused" && " · pausado"}
      </span>
      <span className="font-display text-pp-green-dark tabular-nums">
        {formatClock(remainingMs)}
      </span>
      {currentLevel && !currentLevel.isBreak && (
        <span className="text-pp-brown">
          {currentLevel.smallBlind}/{currentLevel.bigBlind}
          {currentLevel.ante ? ` · ante ${currentLevel.ante}` : ""}
        </span>
      )}
    </div>
  );
}

export function TimerCard({
  tournament,
  isDealer,
}: {
  tournament: TournamentSettings;
  isDealer: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const advancingRef = useRef(false);

  const isRunning = tournament.status === "in_progress";

  // Tic-tac de un segundo mientras el timer está corriendo, solo para
  // recalcular cuánto falta — la fuente de verdad sigue siendo levelEndsAt
  // en Firestore, no este contador local.
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const remainingMs = isRunning
    ? (tournament.levelEndsAt ?? now) - now
    : tournament.pausedRemainingMs ?? 0;

  const currentLevel = tournament.blindStructure[tournament.currentLevel - 1];
  const nextLevel = tournament.blindStructure[tournament.currentLevel];
  const isLastLevel =
    tournament.currentLevel >= tournament.blindStructure.length;

  // Si el tiempo se acabó y hay más niveles, el cliente del dealer avanza
  // solo. Es una limitación de una app sin servidor propio: si el dealer
  // cierra la app, el timer no avanza hasta que la vuelva a abrir.
  useEffect(() => {
    if (
      isDealer &&
      isRunning &&
      remainingMs <= 0 &&
      !isLastLevel &&
      !advancingRef.current
    ) {
      advancingRef.current = true;
      goToLevel(tournament, tournament.currentLevel + 1).finally(() => {
        advancingRef.current = false;
      });
    }
  }, [isDealer, isRunning, remainingMs, isLastLevel, tournament]);

  const runAction = async (action: () => Promise<void>) => {
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

  if (tournament.status === "finished") {
    return (
      <Card className="text-center">
        <p className="font-display text-pp-green-dark">Torneo finalizado</p>
      </Card>
    );
  }

  if (tournament.status === "registering") {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-pp-brown/70">
          El torneo todavía no arrancó
        </p>
        {isDealer && (
          <Button
            disabled={busy}
            onClick={() => runAction(() => startTournament(tournament))}
          >
            {busy ? "Iniciando…" : "Iniciar torneo"}
          </Button>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-pp-brown/70">
        {currentLevel?.isBreak
          ? "Receso"
          : `Nivel ${tournament.currentLevel}`}
        {tournament.status === "paused" && " · pausado"}
      </p>

      <p className="font-display text-5xl text-pp-green-dark tabular-nums">
        {formatClock(remainingMs)}
      </p>

      {currentLevel && !currentLevel.isBreak && (
        <p className="text-pp-brown">
          Ciegas{" "}
          <span className="font-medium">
            {currentLevel.smallBlind}/{currentLevel.bigBlind}
          </span>{" "}
          · Ante <span className="font-medium">{currentLevel.ante}</span>
        </p>
      )}

      {nextLevel && (
        <p className="text-xs text-pp-brown/50">
          Siguiente: {nextLevel.smallBlind}/{nextLevel.bigBlind}
          {nextLevel.ante ? ` · ante ${nextLevel.ante}` : ""}
        </p>
      )}

      {isDealer && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {tournament.status === "in_progress" ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => runAction(() => pauseTournament(tournament))}
            >
              Pausar
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => runAction(() => resumeTournament(tournament))}
            >
              Reanudar
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || tournament.currentLevel <= 1}
            onClick={() =>
              runAction(() =>
                goToLevel(tournament, tournament.currentLevel - 1)
              )
            }
          >
            Nivel anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || isLastLevel}
            onClick={() =>
              runAction(() =>
                goToLevel(tournament, tournament.currentLevel + 1)
              )
            }
          >
            Nivel siguiente
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={() => runAction(() => finishTournament(tournament.id))}
          >
            Finalizar torneo
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </Card>
  );
}
