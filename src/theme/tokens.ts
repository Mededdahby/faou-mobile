export const colors = {
  ink: "#0B2239",
  inkSoft: "#173B57",
  primary: "#0F6B84",
  primaryDark: "#0A4B5D",
  primarySoft: "#E4F1F4",
  accent: "#E2A23F",
  accentSoft: "#FBF0DE",
  cta: "#C2603A",
  background: "#F6F2EC",
  surface: "#FFFFFF",
  surfaceMuted: "#F1ECE3",
  muted: "#6B7280",
  mutedSoft: "#9CA3AF",
  success: "#2F7D5D",
  successSoft: "#E6F4EC",
  warning: "#B26A1B",
  warningSoft: "#FCEEDC",
  danger: "#B23A3A",
  dangerSoft: "#FBE9E7",
  info: "#2563EB",
  infoSoft: "#E8EEFB",
  violet: "#6D4AA6",
  violetSoft: "#F0EAF8",
  border: "#E8E1D6",
  white: "#FFFFFF",
  overlay: "rgba(11, 34, 57, 0.46)",
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
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const fontSize = {
  micro: 10,
  caption: 11,
  small: 13,
  body: 15,
  title: 17,
  heading: 22,
  display: 30,
  hero: 34,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
} as const;

export const shadows = {
  card: {
    shadowColor: "#0B2239",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 22,
    elevation: 2,
  },
  floating: {
    shadowColor: "#0B2239",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 8,
  },
} as const;
