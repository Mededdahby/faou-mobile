import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { apiBaseUrl } from "@/api/client";
import { getStoredToken } from "@/auth/storage";

async function sharePdf(path: string, fileName: string, dialogTitle: string) {
  const token = await getStoredToken();
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");

  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) throw new Error("Stockage indisponible sur cet appareil.");

  const safeName = (fileName || "document").replace(/[^\w.-]+/g, "-");
  const target = `${directory}${safeName}.pdf`;

  const result = await FileSystem.downloadAsync(
    `${apiBaseUrl}${path}`,
    target,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (result.status !== 200) throw new Error("Impossible de télécharger le PDF.");

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: dialogTitle || "Document",
      UTI: "com.adobe.pdf",
    });
  }
}

export async function shareDocumentPdf(id: string, number: string) {
  await sharePdf(`/api/admin/documents/${id}/pdf`, number, number);
}

export async function sharePaymentReceiptPdf(paymentId: string, receiptNumber: string) {
  await sharePdf(
    `/api/mobile/v1/payments/${paymentId}/receipt`,
    receiptNumber || "recu",
    receiptNumber || "Reçu de paiement",
  );
}

export async function shareProjectReportPdf(reportId: string, title: string) {
  await sharePdf(
    `/api/mobile/v1/reports/${reportId}/pdf`,
    title || "rapport-chantier",
    title || "Rapport de chantier",
  );
}
