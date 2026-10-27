import { Linking } from "react-native";

function phoneDigits(value: string) {
  return value.replace(/[^\d+]/g, "");
}

async function safeOpen(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // The device has no handler for this scheme.
  }
}

export async function callPhone(phone?: string) {
  const value = phoneDigits(phone ?? "");
  if (!value) return;
  await safeOpen(`tel:${value}`);
}

export async function sendEmail(email?: string) {
  if (!email) return;
  await safeOpen(`mailto:${email}`);
}

export async function openWhatsApp(phone?: string) {
  const value = phoneDigits(phone ?? "").replace(/^\+/, "");
  if (!value) return;
  await safeOpen(`https://wa.me/${value}`);
}

export async function openDirections(address?: string, city?: string) {
  const query = [address, city]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return;
  await safeOpen(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
  );
}

export async function openUrl(url?: string) {
  if (!url) return;
  await safeOpen(url);
}
