export type ReceiptPreviewKind = "image" | "pdf" | "other";

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
]);

export function getReceiptFileName(path: string): string {
  const cleanPath = path.split("?")[0].split("#")[0];
  return cleanPath.split("/").pop() || "receipt";
}

export function getReceiptPreviewKind(path: string): ReceiptPreviewKind {
  const fileName = getReceiptFileName(path).toLowerCase();
  const ext = fileName.includes(".") ? (fileName.split(".").pop() || "") : "";

  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  return "other";
}
