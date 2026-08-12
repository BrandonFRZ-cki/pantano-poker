"use client";

import { CHIP_COLOR_LABEL } from "@/lib/tournament-defaults";
import type { TournamentFormState } from "@/lib/tournament-form-state";
import type { BlindLevel, ChipDenominations } from "@/types/tournament";

type ChipColor = keyof ChipDenominations;
const CHIP_COLORS = Object.keys(CHIP_COLOR_LABEL) as ChipColor[];

function numberInputProps(value: number) {
  return { value: Number.isNaN(value) ? "" : value };
}

const inputClass =
  "rounded-lg border border-pp-green-mid/40 bg-white px-3 py-2 text-pp-brown outline-none focus:border-pp-green-dark w-full";
const labelClass = "text-sm text-pp-brown/70";

export function TournamentFormFields({
  form,
  setForm,
}: {
  form: TournamentFormState;
  setForm: (updater: (prev: TournamentFormState) => TournamentFormState) => void;
}) {
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

  return (
    <>
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
              Dealer fijo (tú eliges quién controla el timer)
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
                updateChip("startingStack", color, e.target.valueAsNumber || 0)
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
                updateBlindLevel(index, "smallBlind", e.target.valueAsNumber || 0)
              }
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              {...numberInputProps(lvl.bigBlind)}
              onChange={(e) =>
                updateBlindLevel(index, "bigBlind", e.target.valueAsNumber || 0)
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
    </>
  );
}
