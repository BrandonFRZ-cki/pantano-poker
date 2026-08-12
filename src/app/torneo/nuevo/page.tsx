"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createTournament } from "@/lib/tournaments";
import {
  CHIP_COLOR_LABEL,
  EMPTY_CHIPS,
  PANTANO_DEFAULTS,
} from "@/lib/tournament-defaults";
import type { BlindLevel, ChipDenominations } from "@/types/tournament";

type ChipColor = keyof ChipDenominations;
const CHIP_COLORS = Object.keys(CHIP_COLOR_LABEL) as ChipColor[];

interface FormState {
  name: string;
  buyIn: number;
  rebuyAmount: number;
  addonAmount: number;
  bountyPerElimination: number;
  prizeFirst: number;
  prizeSecond: number;
  houseRuleFine: number;
  chipValues: ChipDenominations;
  startingStack: ChipDenominations;
  addonStack: ChipDenominations;
  blindStructure: BlindLevel[];
  rebuyDeadlineMinutes: number;
  seatsPerTable: number;
  dealerMode: "fixed" | "rotating";
}

const BLANK_STATE: FormState = {
  name: "",
  buyIn: 0,
  rebuyAmount: 0,
  addonAmount: 0,
  bountyPerElimination: 0,
  prizeFirst: 70,
  prizeSecond: 30,
  houseRuleFine: 0,
  chipValues: { ...EMPTY_CHIPS },
  startingStack: { ...EMPTY_CHIPS },
  addonStack: { ...EMPTY_CHIPS },
  blindStructure: [
    { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 15 },
  ],
  rebuyDeadlineMinutes: 90,
  seatsPerTable: 9,
  dealerMode: "fixed",
};

const PANTANO_STATE: FormState = {
  name: PANTANO_DEFAULTS.name,
  buyIn: PANTANO_DEFAULTS.buyIn,
  rebuyAmount: PANTANO_DEFAULTS.rebuyAmount,
  addonAmount: PANTANO_DEFAULTS.addonAmount,
  bountyPerElimination: PANTANO_DEFAULTS.bountyPerElimination,
  prizeFirst: PANTANO_DEFAULTS.prizeSplitFirst,
  prizeSecond: PANTANO_DEFAULTS.prizeSplitSecond,
  houseRuleFine: PANTANO_DEFAULTS.houseRuleFine,
  chipValues: PANTANO_DEFAULTS.chipValues,
  startingStack: PANTANO_DEFAULTS.startingStack,
  addonStack: PANTANO_DEFAULTS.addonStack,
  blindStructure: PANTANO_DEFAULTS.blindStructure,
  rebuyDeadlineMinutes: PANTANO_DEFAULTS.rebuyDeadlineMinutes,
  seatsPerTable: PANTANO_DEFAULTS.seatsPerTable,
  dealerMode: PANTANO_DEFAULTS.dealerMode,
};

function numberInputProps(value: number) {
  return { value: Number.isNaN(value) ? "" : value };
}

export default function NuevoTorneoPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading } = useAuth();
  const [form, setForm] = useState<FormState>(PANTANO_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  const updateChip = (
    group: "chipValues" | "startingStack" | "addonStack",
    color: ChipColor,
    value: number
  ) => {
    setForm((prev) => ({
      ...prev,
      [group]: { ...prev[group], [color]: value },
    }));
  };

  const updateBlindLevel = (
    index: number,
    field: keyof BlindLevel,
    value: number
  ) => {
    setForm((prev) => ({
      ...prev,
      blindStructure: prev.blindStructure.map((lvl, i) =>
        i === index ? { ...lvl, [field]: value } : lvl
      ),
    }));
  };

  const addBlindLevel = () => {
    setForm((prev) => {
      const last = prev.blindStructure[prev.blindStructure.length - 1];
      return {
        ...prev,
        blindStructure: [
          ...prev.blindStructure,
          {
            level: prev.blindStructure.length + 1,
            smallBlind: last ? last.smallBlind * 2 : 25,
            bigBlind: last ? last.bigBlind * 2 : 50,
            ante: last ? last.ante * 2 : 0,
            durationMinutes: last?.durationMinutes ?? 15,
          },
        ],
      };
    });
  };

  const removeBlindLevel = (index: number) => {
    setForm((prev) => ({
      ...prev,
      blindStructure: prev.blindStructure
        .filter((_, i) => i !== index)
        .map((lvl, i) => ({ ...lvl, level: i + 1 })),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    setError(null);
    try {
      const id = await createTournament(
        {
          name: form.name.trim() || "Torneo sin nombre",
          buyIn: form.buyIn,
          rebuyAmount: form.rebuyAmount,
          addonAmount: form.addonAmount,
          bountyPerElimination: form.bountyPerElimination,
          prizeSplit: [form.prizeFirst / 100, form.prizeSecond / 100],
          houseRuleFine: form.houseRuleFine,
          chipValues: form.chipValues,
          startingStack: form.startingStack,
          addonStack: form.addonStack,
          blindStructure: form.blindStructure,
          rebuyDeadlineMinutes: form.rebuyDeadlineMinutes,
          seatsPerTable: form.seatsPerTable,
          dealerMode: form.dealerMode,
        },
        profile
      );
      router.push(`/torneo/${id}`);
    } catch {
      setError("No se pudo crear el torneo. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !firebaseUser || !profile) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16">
        <p className="text-pp-brown/70">Cargando…</p>
      </div>
    );
  }

  const inputClass =
    "rounded-lg border border-pp-green-mid/40 bg-white px-3 py-2 text-pp-brown outline-none focus:border-pp-green-dark w-full";
  const labelClass = "text-sm text-pp-brown/70";

  return (
    <div className="flex flex-col flex-1 items-center bg-pp-cream px-6 py-12 gap-8">
      <div className="text-center max-w-md">
        <h1 className="font-display text-2xl text-pp-green-dark">
          Crear torneo
        </h1>
        <div className="flex gap-2 justify-center mt-4">
          <button
            type="button"
            onClick={() => setForm(PANTANO_STATE)}
            className="text-sm rounded-full border border-pp-green-dark text-pp-green-dark px-4 py-1.5 hover:bg-pp-green-light/20"
          >
            Usar valores de Pantano Poker
          </button>
          <button
            type="button"
            onClick={() => setForm(BLANK_STATE)}
            className="text-sm rounded-full border border-pp-brown/30 text-pp-brown/70 px-4 py-1.5 hover:bg-pp-brown/5"
          >
            Empezar en blanco
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-pp-green-dark">Datos generales</h2>
          <label className={labelClass}>
            Nombre del torneo
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className={labelClass}>
              Buy-in ($)
              <input
                type="number"
                min={0}
                step="0.5"
                className={inputClass}
                {...numberInputProps(form.buyIn)}
                onChange={(e) =>
                  setForm((p) => ({ ...p, buyIn: e.target.valueAsNumber || 0 }))
                }
              />
            </label>
            <label className={labelClass}>
              Recompra ($)
              <input
                type="number"
                min={0}
                step="0.5"
                className={inputClass}
                {...numberInputProps(form.rebuyAmount)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    rebuyAmount: e.target.valueAsNumber || 0,
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Addon ($)
              <input
                type="number"
                min={0}
                step="0.5"
                className={inputClass}
                {...numberInputProps(form.addonAmount)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    addonAmount: e.target.valueAsNumber || 0,
                  }))
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Bounty por eliminación ($)
              <input
                type="number"
                min={0}
                step="0.5"
                className={inputClass}
                {...numberInputProps(form.bountyPerElimination)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    bountyPerElimination: e.target.valueAsNumber || 0,
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Multa reglas de la casa ($)
              <input
                type="number"
                min={0}
                step="0.5"
                className={inputClass}
                {...numberInputProps(form.houseRuleFine)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    houseRuleFine: e.target.valueAsNumber || 0,
                  }))
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Reparto 1º puesto (%)
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                {...numberInputProps(form.prizeFirst)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    prizeFirst: e.target.valueAsNumber || 0,
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Reparto 2º puesto (%)
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                {...numberInputProps(form.prizeSecond)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    prizeSecond: e.target.valueAsNumber || 0,
                  }))
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Recompras cierran a los (minutos)
              <input
                type="number"
                min={0}
                className={inputClass}
                {...numberInputProps(form.rebuyDeadlineMinutes)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    rebuyDeadlineMinutes: e.target.valueAsNumber || 0,
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Jugadores por mesa
              <input
                type="number"
                min={2}
                className={inputClass}
                {...numberInputProps(form.seatsPerTable)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    seatsPerTable: e.target.valueAsNumber || 0,
                  }))
                }
              />
            </label>
          </div>
          <label className={labelClass}>
            ¿Quién puede ser dealer?
            <select
              className={inputClass}
              value={form.dealerMode}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  dealerMode: e.target.value as "fixed" | "rotating",
                }))
              }
            >
              <option value="fixed">
                Dealer fijo (vos elegís quién controla el timer)
              </option>
              <option value="rotating">
                Dealer rotativo (cualquier jugador puede serlo)
              </option>
            </select>
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-pp-green-dark">Fichas</h2>
          <div className="grid grid-cols-4 gap-2 text-xs text-pp-brown/60 px-1">
            <span>Color</span>
            <span>Valor</span>
            <span>Stack inicial</span>
            <span>Addon</span>
          </div>
          {CHIP_COLORS.map((color) => (
            <div key={color} className="grid grid-cols-4 gap-2 items-center">
              <span className="text-sm text-pp-brown">
                {CHIP_COLOR_LABEL[color]}
              </span>
              <input
                type="number"
                min={0}
                className={inputClass}
                {...numberInputProps(form.chipValues[color])}
                onChange={(e) =>
                  updateChip("chipValues", color, e.target.valueAsNumber || 0)
                }
              />
              <input
                type="number"
                min={0}
                className={inputClass}
                {...numberInputProps(form.startingStack[color])}
                onChange={(e) =>
                  updateChip(
                    "startingStack",
                    color,
                    e.target.valueAsNumber || 0
                  )
                }
              />
              <input
                type="number"
                min={0}
                className={inputClass}
                {...numberInputProps(form.addonStack[color])}
                onChange={(e) =>
                  updateChip("addonStack", color, e.target.valueAsNumber || 0)
                }
              />
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-pp-green-dark">
              Estructura de ciegas
            </h2>
            <button
              type="button"
              onClick={addBlindLevel}
              className="text-sm text-pp-green-dark underline"
            >
              + Agregar nivel
            </button>
          </div>
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_2rem] gap-2 text-xs text-pp-brown/60 px-1">
            <span>#</span>
            <span>Chica</span>
            <span>Grande</span>
            <span>Ante</span>
            <span>Min.</span>
            <span></span>
          </div>
          {form.blindStructure.map((lvl, index) => (
            <div
              key={index}
              className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_2rem] gap-2 items-center"
            >
              <span className="text-sm text-pp-brown/60">{lvl.level}</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                {...numberInputProps(lvl.smallBlind)}
                onChange={(e) =>
                  updateBlindLevel(
                    index,
                    "smallBlind",
                    e.target.valueAsNumber || 0
                  )
                }
              />
              <input
                type="number"
                min={0}
                className={inputClass}
                {...numberInputProps(lvl.bigBlind)}
                onChange={(e) =>
                  updateBlindLevel(
                    index,
                    "bigBlind",
                    e.target.valueAsNumber || 0
                  )
                }
              />
              <input
                type="number"
                min={0}
                className={inputClass}
                {...numberInputProps(lvl.ante)}
                onChange={(e) =>
                  updateBlindLevel(index, "ante", e.target.valueAsNumber || 0)
                }
              />
              <input
                type="number"
                min={1}
                className={inputClass}
                {...numberInputProps(lvl.durationMinutes)}
                onChange={(e) =>
                  updateBlindLevel(
                    index,
                    "durationMinutes",
                    e.target.valueAsNumber || 0
                  )
                }
              />
              <button
                type="button"
                onClick={() => removeBlindLevel(index)}
                className="text-pp-brown/40 hover:text-red-700"
                aria-label={`Eliminar nivel ${lvl.level}`}
              >
                ✕
              </button>
            </div>
          ))}
        </section>

        {error && <p className="text-sm text-red-700 text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-pp-green-dark text-pp-cream font-display py-3 px-6 hover:bg-pp-green-mid transition-colors disabled:opacity-50"
        >
          {submitting ? "Creando…" : "Crear torneo"}
        </button>
      </form>
    </div>
  );
}
