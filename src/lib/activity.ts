import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface ActivityMeta {
  label: string;
  icon: IconName;
}

const labels: Record<string, ActivityMeta> = {
  "photo.added": { label: "Photo ajoutée", icon: "images-outline" },
  "photo.updated": { label: "Photo modifiée", icon: "create-outline" },
  "photo.deleted": { label: "Photo supprimée", icon: "trash-outline" },
  "report.created": { label: "Rapport créé", icon: "document-text-outline" },
  "task.created": { label: "Tâche créée", icon: "checkbox-outline" },
  "task.updated": { label: "Tâche modifiée", icon: "create-outline" },
  "task.completed": { label: "Tâche terminée", icon: "checkmark-circle-outline" },
  "task.deleted": { label: "Tâche supprimée", icon: "trash-outline" },
  "payment.recorded": { label: "Paiement enregistré", icon: "cash-outline" },
  "payment.deleted": { label: "Paiement supprimé", icon: "trash-outline" },
  "quote.accepted": { label: "Devis accepté", icon: "checkmark-circle-outline" },
  "quote.refused": { label: "Devis refusé", icon: "close-circle-outline" },
  "team.created": { label: "Membre ajouté", icon: "person-add-outline" },
  "team.updated": { label: "Membre modifié", icon: "person-outline" },
  "team.deleted": { label: "Membre supprimé", icon: "person-remove-outline" },
};

export function activityMeta(action: string): ActivityMeta {
  return labels[action] ?? { label: action, icon: "ellipse-outline" };
}
