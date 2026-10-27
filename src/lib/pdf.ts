import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { apiBaseUrl } from "@/api/client";
import { getStoredToken } from "@/auth/storage";

export async function shareDocumentPdf(id: string, number: string) {
  const token = await getStoredToken();
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");

  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) throw new Error("Stockage indisponible sur cet appareil.");

  const safeName = (number || id).replace(/[^\w.-]+/g, "-");
  const target = `${directory}${safeName}.pdf`;

  const result = await FileSystem.downloadAsync(
    `${apiBaseUrl}/api/admin/documents/${id}/pdf`,
    target,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (result.status !== 200) throw new Error("Impossible de télécharger le PDF.");

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: number || "Document",
      UTI: "com.adobe.pdf",
    });
  }
}
