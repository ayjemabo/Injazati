import type { ChineseFileType } from "@/lib/types";

const markerPrefix = "__chinese_file_type:";

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

export function parseChineseFileTypeMarker(content: string): ChineseFileTypeSelection | undefined {
  if (!content.startsWith(markerPrefix)) {
    return undefined;
  }

  return normalizeChineseFileType(content.slice(markerPrefix.length));
}

export function isChineseFileTypeMarker(content: string) {
  return content.startsWith(markerPrefix);
}

export function getChineseFileTypeLabel(value: ChineseFileType) {
  return value === "solution" ? "حل" : "نموذج";
}
