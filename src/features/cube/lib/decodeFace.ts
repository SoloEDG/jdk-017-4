export const MIN_FACE = 64;
export const MAX_FACE = 2048;

export interface DecodedFace {
  image: ImageData;
  hash: string;
  fileName: string;
}

/** 解码单面照片：必须为正方形，超大自动缩小到 MAX_FACE。 */
export async function decodeFace(
  blob: Blob,
  fileName: string,
): Promise<DecodedFace> {
  if (blob.size > 40 * 1024 * 1024)
    throw new Error("照片超过 40 MB，请先缩小后导入");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error("无法解码，支持 JPG / PNG / WebP");
  }
  try {
    if (bitmap.width !== bitmap.height)
      throw new Error(
        `不是正方形（${bitmap.width} × ${bitmap.height}），每个方向都必须是正方形照片`,
      );
    if (bitmap.width < MIN_FACE)
      throw new Error(`太小，单面至少需要 ${MIN_FACE} × ${MIN_FACE} 像素`);
    const size = Math.min(bitmap.width, MAX_FACE);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, size, size);
    const image = ctx.getImageData(0, 0, size, size);
    return { image, hash: hashImage(image, blob.size), fileName };
  } finally {
    bitmap.close();
  }
}

/** 轻量内容指纹：尺寸 + 文件字节数 + 均匀采样像素，用于重复方向检查。 */
function hashImage(image: ImageData, byteSize: number): string {
  const d = image.data,
    total = image.width * image.height;
  const parts: string[] = [`${image.width}x${image.height}`, String(byteSize)];
  for (let k = 0; k < 24; k++) {
    const at = Math.floor(((k + 0.5) / 24) * total) * 4;
    parts.push(d[at].toString(16), d[at + 1].toString(16), d[at + 2].toString(16));
  }
  return parts.join(".");
}
