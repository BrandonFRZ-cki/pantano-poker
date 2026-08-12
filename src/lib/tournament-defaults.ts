// Valores del torneo Pantano Poker original (ver pantano-poker-resumen.md),
// usados para precargar el formulario de "Crear torneo".

import type { BlindLevel, ChipDenominations } from "@/types/tournament";

export const PANTANO_CHIP_VALUES: ChipDenominations = {
  white: 25,
  green: 100,
  red: 500,
  blue: 1000,
  black: 2500,
};

export const PANTANO_STARTING_STACK: ChipDenominations = {
  white: 4,
  green: 3,
  red: 2,
  blue: 1,
  black: 0,
};

export const PANTANO_ADDON_STACK: ChipDenominations = {
  white: 0,
  green: 0,
  red: 0,
  blue: 1,
  black: 1,
};

export const PANTANO_BLIND_STRUCTURE: BlindLevel[] = [
  { level: 1, smallBlind: 25, bigBlind: 50, ante: 50, durationMinutes: 15 },
  { level: 2, smallBlind: 50, bigBlind: 100, ante: 100, durationMinutes: 15 },
  { level: 3, smallBlind: 75, bigBlind: 150, ante: 150, durationMinutes: 15 },
  { level: 4, smallBlind: 100, bigBlind: 200, ante: 200, durationMinutes: 15 },
  { level: 5, smallBlind: 150, bigBlind: 300, ante: 300, durationMinutes: 15 },
  {
    level: 6,
    smallBlind: 200,
    bigBlind: 400,
    ante: 400,
    durationMinutes: 15,
    isBreak: true,
  },
  { level: 7, smallBlind: 300, bigBlind: 600, ante: 600, durationMinutes: 15 },
  { level: 8, smallBlind: 400, bigBlind: 800, ante: 800, durationMinutes: 15 },
  {
    level: 9,
    smallBlind: 500,
    bigBlind: 1000,
    ante: 1000,
    durationMinutes: 15,
  },
  {
    level: 10,
    smallBlind: 600,
    bigBlind: 1200,
    ante: 1200,
    durationMinutes: 15,
  },
  {
    level: 11,
    smallBlind: 800,
    bigBlind: 1500,
    ante: 1500,
    durationMinutes: 15,
  },
  {
    level: 12,
    smallBlind: 1000,
    bigBlind: 2000,
    ante: 2000,
    durationMinutes: 15,
  },
];

// El % de reparto y el monto exacto del bounty seguían "pendientes de
// confirmar" en el resumen del torneo — quedan como valores editables.
export const PANTANO_DEFAULTS = {
  name: "Pantano Poker",
  buyIn: 5,
  rebuyAmount: 5,
  addonAmount: 5,
  bountyPerElimination: 1,
  prizeSplitFirst: 70,
  prizeSplitSecond: 30,
  houseRuleFine: 0.5,
  chipValues: PANTANO_CHIP_VALUES,
  startingStack: PANTANO_STARTING_STACK,
  addonStack: PANTANO_ADDON_STACK,
  blindStructure: PANTANO_BLIND_STRUCTURE,
  rebuyDeadlineMinutes: 90,
  seatsPerTable: 9,
  dealerMode: "fixed" as const,
};

export const CHIP_COLOR_LABEL: Record<keyof ChipDenominations, string> = {
  white: "Blanca",
  green: "Verde",
  red: "Roja",
  blue: "Azul",
  black: "Negra",
};

export const EMPTY_CHIPS: ChipDenominations = {
  white: 0,
  green: 0,
  red: 0,
  blue: 0,
  black: 0,
};
