export interface CalculatorRates {
  floorPerM2: number;
  backsplashPerM2: number;
  worktopPerMl: number;
  baseUnit: number;
  highUnit: number;
  islandPerMl: number;
  installation: number;
}

export interface CalculatorInput {
  length: number;
  width: number;
  backsplashLength: number;
  backsplashHeight: number;
  baseUnits: number;
  highUnits: number;
  islandLength: number;
  worktopLength: number;
  wastePercent: number;
  rates: CalculatorRates;
}

export interface CalculatorLine {
  label: string;
  amountCents: number;
}

function money(value: number) {
  return Math.max(0, Math.round(value * 100));
}

function quantity(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

export function calculateQuote(input: CalculatorInput): {
  lines: CalculatorLine[];
  totalCents: number;
} {
  const waste = 1 + Math.max(input.wastePercent, 0) / 100;
  const floorArea = Math.max(input.length, 0) * Math.max(input.width, 0) * waste;
  const backsplashArea =
    Math.max(input.backsplashLength, 0) *
    Math.max(input.backsplashHeight, 0) *
    waste;
  const worktopLength = Math.max(input.worktopLength, 0) * waste;
  const islandLength = Math.max(input.islandLength, 0) * waste;
  const baseUnits = Math.max(input.baseUnits, 0);
  const highUnits = Math.max(input.highUnits, 0);

  const lines: CalculatorLine[] = [
    {
      label: `Sol — ${quantity(floorArea)} m²`,
      amountCents: money(floorArea * Math.max(input.rates.floorPerM2, 0)),
    },
    {
      label: `Crédence — ${quantity(backsplashArea)} m²`,
      amountCents: money(backsplashArea * Math.max(input.rates.backsplashPerM2, 0)),
    },
    {
      label: `Plan de travail — ${quantity(worktopLength)} ml`,
      amountCents: money(worktopLength * Math.max(input.rates.worktopPerMl, 0)),
    },
    {
      label: `Meubles bas — ${quantity(baseUnits)} unité${baseUnits > 1 ? "s" : ""}`,
      amountCents: money(baseUnits * Math.max(input.rates.baseUnit, 0)),
    },
    {
      label: `Meubles hauts — ${quantity(highUnits)} unité${highUnits > 1 ? "s" : ""}`,
      amountCents: money(highUnits * Math.max(input.rates.highUnit, 0)),
    },
    {
      label: `Îlot — ${quantity(islandLength)} ml`,
      amountCents: money(islandLength * Math.max(input.rates.islandPerMl, 0)),
    },
    {
      label: "Installation & pose",
      amountCents: money(Math.max(input.rates.installation, 0)),
    },
  ].filter((line) => line.amountCents > 0);

  return {
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.amountCents, 0),
  };
}
