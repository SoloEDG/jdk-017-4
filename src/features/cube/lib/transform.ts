import type { FaceTransform } from "../../../shared/types";

export const defaultFaceTransform = (): FaceTransform => ({
  rotate: 0,
  flipH: false,
  flipV: false,
});

/**
 * 把校准参数烘焙进面像素：先翻转、再顺时针旋转。
 * 90° 旋转与翻转都是精确的纹素置换，烘焙后的面与原始面
 * 在同一套双线性过滤规则下采样结果完全一致。
 */
export function bakeFace(src: ImageData, t: FaceTransform): ImageData {
  const n = src.width;
  const out = new ImageData(n, n);
  const s = src.data,
    o = out.data;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let a = x,
        b = y;
      // 顺时针旋转的逆映射：(a, b) ← (b, n-1-a)
      for (let i = 0; i < t.rotate; i++) {
        const na = b;
        b = n - 1 - a;
        a = na;
      }
      if (t.flipH) a = n - 1 - a;
      if (t.flipV) b = n - 1 - b;
      const from = (b * n + a) * 4,
        to = (y * n + x) * 4;
      o[to] = s[from];
      o[to + 1] = s[from + 1];
      o[to + 2] = s[from + 2];
      o[to + 3] = s[from + 3];
    }
  return out;
}
