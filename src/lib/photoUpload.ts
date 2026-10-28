import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { PhotoPhase } from "@/api/types";
import { api } from "@/api/endpoints";

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string | null;
}

export async function pickImage(source: "camera" | "library"): Promise<PickedImage | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Autorisez l’accès à l’appareil photo dans les réglages.");
    }
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Autorisez l’accès à vos photos dans les réglages.");
    }
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 1,
          exif: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 1,
          selectionLimit: 1,
          exif: false,
        });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? "image/jpeg",
    fileName: asset.fileName ?? null,
  };
}

async function optimizeImage(uri: string, width: number) {
  const actions = width > 1600 ? [{ resize: { width: 1600 } }] : [];
  const result = await manipulateAsync(uri, actions, {
    compress: 0.75,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

async function createThumbnail(uri: string) {
  const result = await manipulateAsync(uri, [{ resize: { width: 400 } }], {
    compress: 0.65,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

async function uploadFile(uri: string, mimeType: string) {
  const { uploadUrl } = await api.uploads.url();
  const result = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": mimeType },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error("L’envoi de la photo a échoué. Réessayez.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(result.body);
  } catch {
    throw new Error("Réponse d’envoi invalide.");
  }

  const storageId =
    payload && typeof payload === "object" && "storageId" in payload
      ? String((payload as { storageId: unknown }).storageId)
      : "";

  if (!storageId) throw new Error("Le fichier n’a pas pu être stocké.");
  return storageId;
}

export interface UploadProjectPhotoInput {
  projectId: string;
  sourceUri: string;
  width: number;
  caption: string;
  room: string;
  phase: PhotoPhase;
  tags: string[];
  measurements?: string;
  takenAt?: string;
  onStage?: (stage: string) => void;
}

export async function uploadProjectPhoto(input: UploadProjectPhotoInput) {
  input.onStage?.("Optimisation de la photo…");
  const optimizedUri = await optimizeImage(input.sourceUri, input.width);

  input.onStage?.("Envoi de la photo…");
  const storageId = await uploadFile(optimizedUri, "image/jpeg");

  let thumbnailStorageId: string | undefined;
  try {
    const thumbnailUri = await createThumbnail(optimizedUri);
    thumbnailStorageId = await uploadFile(thumbnailUri, "image/jpeg");
  } catch (error) {
    console.warn("Thumbnail upload skipped", error);
  }

  input.onStage?.("Enregistrement…");
  return await api.photos.create({
    projectId: input.projectId,
    storageId,
    thumbnailStorageId,
    caption: input.caption,
    room: input.room,
    phase: input.phase,
    tags: input.tags,
    measurements: input.measurements,
    takenAt: input.takenAt,
  });
}
