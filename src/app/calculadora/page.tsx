"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CHIP_COLOR_HEX, CHIP_COLOR_LABEL, PANTANO_CHIP_VALUES } from "@/lib/tournament-defaults";
import type { ChipDenominations } from "@/types/tournament";
import { formatChips } from "@/lib/format";
import { Card, IconArrowLeft } from "@/components/ui";

type ChipColor = keyof ChipDenominations;
const CHIP_COLORS = Object.keys(CHIP_COLOR_LABEL) as ChipColor[];

// Fichas disponibles por defecto (las que trae el set típico de Pantano
// Poker): 200 blancas, 100 de cada una del resto.
const DEFAULT_AVAILABLE: ChipDenominations = {
  white: 200,
  green: 100,
  red: 100,
  blue: 100,
  black: 100,
};

const inputClass =
  "rounded-lg border border-pp-green-mid/40 bg-white px-3 py-2 text-pp-brown outline-none focus:border-pp-green-dark w-full";

export default function CalculadoraPage() {
  const [values, setValues] = useState<ChipDenominations>(PANTANO_CHIP_VALUES);
  const [available, setAvailable] = useState<ChipDenominations>(DEFAULT_AVAILABLE);
  const [players, setPlayers] = useState(10);

  const rows = useMemo(() => {
    return CHIP_COLORS.map((color) => {
      const total = available[color];
      const perPlayer = players > 0 ? Math.floor(total / players) : 0;
      const leftover = total - perPlayer * players;
      return { color, value: values[color], total, perPlayer, leftover };
    });
  }, [available, values, players]);

  const stackValue = rows.reduce((sum, r) => sum + r.perPlayer * r.value, 0);
  const totalLeftoverChips = rows.reduce((sum, r) => sum + r.leftover, 0);

  const updateValue = (color: ChipColor, value: number) =>
    setValues((prev) => ({ ...prev, [color]: value }));

  const updateAvailable = (color: ChipColor, value: number) =>
    setAvailable((prev) => ({ ...prev, [color]: value }));

  return (
    <div className="flex flex-col flex-1 items-center bg-pp-cream px-6 py-12 gap-6">
      <div className="w-full max-w-lg flex flex-col items-center gap-2 text-center">
        <div className="w-full max-w-md">
          <Link
            href="/panel"
            className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown"
          >
            <IconArrowLeft />
            Mis torneos
          </Link>
        </div>
        <Image src="/icons/logo.svg" alt="Pantano Poker" width={40} height={40} unoptimized />
        <h1 className="font-display text-2xl text-pp-green-dark">
          Calculadora de fichas
        </h1>
        <p className="text-sm text-pp-brown/70 max-w-md">
          Pon cuántas fichas de cada color tienes en total y cuántos
          jugadores hay: te dice cuántas le toca a cada uno y cuántas
          sobran.
        </p>
      </div>

      <Card className="w-full max-w-lg flex flex-col gap-4">
        <label className="text-sm text-pp-brown/70 max-w-[10rem]">
          Jugadores
          <input
            type="number"
            min={1}
            className={inputClass}
            value={Number.isNaN(players) ? "" : players}
            onChange={(e) => setPlayers(e.target.valueAsNumber || 0)}
          />
        </label>

        <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr] gap-2 text-xs text-pp-brown/60 px-1">
          <span></span>
          <span>Valor</span>
          <span>Total</span>
          <span>Por jugador</span>
          <span>Sobran</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.color}
            className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr] gap-2 items-center"
          >
            <span
              className="inline-block w-5 h-5 rounded-full border-2 border-dashed"
              style={{
                backgroundColor: CHIP_COLOR_HEX[row.color],
                borderColor: "rgba(0,0,0,0.15)",
              }}
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              value={Number.isNaN(row.value) ? "" : row.value}
              onChange={(e) => updateValue(row.color, e.target.valueAsNumber || 0)}
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              value={Number.isNaN(row.total) ? "" : row.total}
              onChange={(e) => updateAvailable(row.color, e.target.valueAsNumber || 0)}
            />
            <span className="text-sm font-medium text-pp-green-dark text-center">
              {row.perPlayer}
            </span>
            <span className="text-sm text-pp-brown/50 text-center">
              {row.leftover}
            </span>
          </div>
        ))}

        <div className="pt-3 border-t border-pp-green-mid/10 flex flex-col gap-1 text-center">
          <p className="text-sm text-pp-brown/70">
            Stack por jugador: {formatChips(stackValue)} fichas
          </p>
          {totalLeftoverChips > 0 && (
            <p className="text-xs text-pp-brown/50">
              Sobran {totalLeftoverChips} fichas en total (por color arriba)
              — repártelas como addon o guárdalas de repuesto.
            </p>
          )}
        </div>
      </Card>

      <p className="text-xs text-pp-brown/40 max-w-lg text-center">
        Solo es una herramienta suelta: no toca ningún torneo. Usa la
        columna &quot;Por jugador&quot; para llenar el stack inicial al crear
        tu torneo.
      </p>
    </div>
  );
}
