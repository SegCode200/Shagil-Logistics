const DEFAULT_IMAGE_TARGET_BYTES = 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 1600;
const MIN_MAX_DIMENSION = 320;

export async function compressImageFile(
  file: File,
  options: {
    targetBytes?: number;
    maxDimension?: number;
    outputType?: string;
  } = {},
): Promise<File> {
  const targetBytes = options.targetBytes ?? DEFAULT_IMAGE_TARGET_BYTES;
  if (!file.type.startsWith("image/") || file.size <= targetBytes) return file;
  if (typeof createImageBitmap === "undefined") {
    throw new Error("Image compression is not supported in this browser.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
    const initialScale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    const outputType = options.outputType ?? "image/webp";

    while (true) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare this image for upload.");
      context.drawImage(bitmap, 0, 0, width, height);

      for (let quality = 0.86; quality >= 0.35; quality -= 0.1) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, outputType, quality),
        );
        if (!blob) throw new Error("Could not compress this image for upload.");
        if (blob.size <= targetBytes) {
          const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1] || "webp";
          const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
          return new File([blob], `${baseName}.${extension}`, {
            type: blob.type,
            lastModified: Date.now(),
          });
        }
      }

      const currentMaxDimension = Math.max(width, height);
      if (currentMaxDimension <= MIN_MAX_DIMENSION) break;
      const nextMaxDimension = Math.max(
        MIN_MAX_DIMENSION,
        Math.round(currentMaxDimension * 0.75),
      );
      const scale = nextMaxDimension / currentMaxDimension;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    throw new Error("This image could not be compressed to 1 MB. Please choose another image.");
  } finally {
    bitmap.close();
  }
}
