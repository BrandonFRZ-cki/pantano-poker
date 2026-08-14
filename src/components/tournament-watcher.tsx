"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  autoBalanceForBreak,
  goToLevel,
  rotateTableDealers,
  subscribeToTables,
  subscribeToTournament,
} from "@/lib/tournaments";
import type { PokerTable, TournamentSettings } from "@/types/tournament";

/**
 * Componente invisible, montado en el Header en cualquier pantalla dentro
 * de un torneo. Antes estas cosas vivían solo en la tarjeta del timer de la
 * pantalla principal, así que si el dealer se quedaba en "Mi mesa" (lo más
 * común mientras se juega), el nivel no avanzaba solo hasta que volvía a la
 * pantalla principal. Al vivir acá, corren sin importar qué pantalla tenga
 * abierta.
 *
 * Hace 3 cosas, todas solo si eres dealer de este torneo:
 * 1. Avanza el nivel solo cuando se acaba el tiempo.
 * 2. Rota los dealers entre mesas cada X niveles (configurable).
 * 3. Balancea las mesas automáticamente al llegar al receso/addon.
 */
export function TournamentWatcher({ tournamentId }: { tournamentId: string }) {
  const { profile } = useAuth();
  const [tournament, setTournament] = useState<TournamentSettings | null>(null);
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const advancingRef = useRef(false);
  const rotatingRef = useRef(false);
  const balancingRef = useRef(false);

  useEffect(() => subscribeToTournament(tournamentId, setTournament), [tournamentId]);
  useEffect(() => subscribeToTables(tournamentId, setTables), [tournamentId]);

  const isDealer = !!(
    tournament &&
    profile &&
    tournament.dealerUids.includes(profile.uid)
  );
  const isRunning = tournament?.status === "in_progress";

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // 1. Auto-avance de nivel cuando se acaba el tiempo.
  useEffect(() => {
    if (!tournament || !isDealer || !isRunning || advancingRef.current) return;
    const remainingMs = (tournament.levelEndsAt ?? now) - now;
    const isLastLevel = tournament.currentLevel >= tournament.blindStructure.length;
    if (remainingMs <= 0 && !isLastLevel) {
      advancingRef.current = true;
      goToLevel(tournament, tournament.currentLevel + 1).finally(() => {
        advancingRef.current = false;
      });
    }
  }, [tournament, isDealer, isRunning, now]);

  // 2. Rotación de dealers entre mesas cada X niveles.
  useEffect(() => {
    if (!tournament || !isDealer || rotatingRef.current) return;
    const every = tournament.dealerRotationLevels ?? 0;
    if (every <= 0 || tables.length < 2) return;
    const last = tournament.lastDealerRotationLevel ?? 1;
    if (tournament.currentLevel - last >= every) {
      rotatingRef.current = true;
      rotateTableDealers(tournamentId, tables, tournament.currentLevel).finally(() => {
        rotatingRef.current = false;
      });
    }
  }, [tournament, tables, isDealer, tournamentId]);

  // 3. Auto-balanceo de mesas al llegar al receso/addon. Si alguna mesa
  // todavía tiene una mano en curso (alguien con el turno de hablar activo),
  // se espera a que termine (se dé "Siguiente mano") para no mover a nadie
  // en medio de una jugada — el aviso en pantalla ya avisa que viene el
  // receso, pero el balanceo real recién pasa cuando todas las mesas están
  // "entre manos".
  useEffect(() => {
    if (!tournament || !isDealer || balancingRef.current) return;
    const currentBlindLevel = tournament.blindStructure[tournament.currentLevel - 1];
    const isBreakOrAddon =
      !!currentBlindLevel?.isBreak || tournament.currentLevel === tournament.addonLevel;
    if (!isBreakOrAddon) return;
    if (tournament.lastBreakBalanceLevel === tournament.currentLevel) return;
    if (tables.length < 2) return;
    const handInProgress = tables.some((t) => !!t.currentActorUid);
    if (handInProgress) return;
    balancingRef.current = true;
    autoBalanceForBreak(tournamentId, tables, tournament.currentLevel).finally(() => {
      balancingRef.current = false;
    });
  }, [tournament, tables, isDealer, tournamentId]);

  return null;
}
