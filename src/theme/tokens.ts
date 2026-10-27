export const colors = {
  primary: "#219EBC",
  primarySoft: "#8ECAE6",
  ink: "#023047",
  accent: "#FFB703",
  cta: "#FB8500",
  background: "#F6F8FA",
  surface: "#FFFFFF",
  muted: "#64748B",
  mutedSoft: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  border: "#E2E8F0",
  white: "#FFFFFF",
  overlay: "rgba(2, 48, 71, 0.45)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fontSize = {
  caption: 11,
  small: 13,
  body: 15,
  title: 17,
  heading: 22,
  display: 28,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
