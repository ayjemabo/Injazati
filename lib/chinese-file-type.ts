import type { ChineseFileType } from "@/lib/types";

const markerPrefix = "__chinese_file_type:";
const fileMarkerPrefix = "__chinese_file_type_file:";

export type ChineseFileTypeSelection = ChineseFileType | null;

export function normalizeChineseFileType(value: unknown): ChineseFileTypeSelection | undefined {
  if (value === "solution" || value === "model") {
    return value;
  }

  if (value === null || value === "" || value === "none") {
    return null;
  }

  return undefined;
}

export function buildChineseFileTypeMarker(value: ChineseFileTypeSelection) {
  return `${markerPrefix}${value ?? "none"}`;
}

export function buildChineseFileTypeFileMarker(fileId: string, value: ChineseFileTypeSelection) {
  return `${fileMarkerPrefix}${fileId}:${value ?? "none"}`;
}

export function parseChineseFileTypeMarker(content: string): ChineseFileTypeSelection | undefined {
  if (!content.startsWith(markerPrefix)) {
    return undefined;
  }

  return normalizeChineseFileType(content.slice(markerPrefix.length));
}

export function parseChineseFileTypeFileMarker(content: string) {
  if (!content.startsWith(fileMarkerPrefix)) {
    return undefined;
  }

  const marker = content.slice(fileMarkerPrefix.length);
  const separatorIndex = marker.lastIndexOf(":");
  if (separatorIndex <= 0) {
    return undefined;
  }

  const fileId = marker.slice(0, separatorIndex);
  const value = normalizeChineseFileType(marker.slice(separatorIndex + 1));
  if (value === undefined) {
    return undefined;
  }

  return { fileId, value };
}

export function isChineseFileTypeMarker(content: string) {
  return content.startsWith(markerPrefix) || content.startsWith(fileMarkerPrefix);
}

export function getChineseFileTypeLabel(value: ChineseFileType) {
  return value === "solution" ? "حل" : "نموذج";
}
