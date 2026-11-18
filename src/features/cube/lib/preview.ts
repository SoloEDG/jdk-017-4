import type { CubeFaceName } from "../../../shared/types";
import { sampleCubeFaces } from "./sampling";

/** 把六面按等距柱状展开渲染到画布（导入器预览与素材缩略图共用）。 */
export function renderEquirect(
  faces: Record<CubeFaceName, ImageData>,
  size: number,
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const rgba = sampleCubeFaces(faces, size, (x + 0.5) / w, (y + 0.5) / h);
      const at = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) image.data[at + c] = rgba[c];
    }
  ctx.putImageData(image, 0, 0);
}

/** 立方体素材缩略图：与主管线同一采样规则展开成 240 × 120。 */
export function cubeThumbnail(
  faces: Record<CubeFaceName, ImageData>,
  size: number,
): string {
  const canvas = document.createElement("canvas");
  renderEquirect(faces, size, canvas, 240, 120);
  return canvas.toDataURL("image/jpeg", 0.7);
}

/** 单面校准后的小预览图。 */
export function imageThumb(img: ImageData, size = 96): string {
  const src = document.createElement("canvas");
  src.width = img.width;
  src.height = img.height;
  src.getContext("2d")!.putImageData(img, 0, 0);
  const out = document.createElement("canvas");
  out.width = out.height = size;
  out.getContext("2d")!.drawImage(src, 0, 0, size, size);
  return out.toDataURL("image/jpeg", 0.75);
}
