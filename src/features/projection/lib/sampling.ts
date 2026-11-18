import type { Asset } from "../../../shared/types";
import { clamp, wrap, smoothstep } from "../../../shared/math";
import { sampleCube } from "../../cube";
function bilinear(img: ImageData, u: number, v: number) {
  const x = wrap(u) * img.width - 0.5,
    y = clamp(v * img.height - 0.5, 0, img.height - 1),
    x0 = Math.floor(x),
    y0 = Math.floor(y),
    fx = x - x0,
    fy = y - y0;
  const out = [0, 0, 0, 0];
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 2; i++) {
      const at =
        (Math.min(y0 + j, img.height - 1) * img.width +
          wrap(x0 + i, img.width)) *
        4;
      const weight = (i ? fx : 1 - fx) * (j ? fy : 1 - fy);
      for (let c = 0; c < 4; c++) out[c] += img.data[at + c] * weight;
    }
  return out;
}
export function sample(asset: Asset, u: number, v: number, seam: number) {
  // 立方体素材直接读取六面纹理，跨面采样天然连续，无需接缝融合
  if (asset.cube) return sampleCube(asset.cube, u, v);
  const img = asset.data;
  if (!img) return [0, 0, 0, 0];
  const original = bilinear(img, u, v);
  if (seam <= 0) return original;
  const d = Math.min(u, 1 - u);
  if (d >= seam) return original;
  const opposite = bilinear(img, 1 - u, v),
    mix = (1 - smoothstep(0, seam, d)) * 0.5;
  return original.map((n, i) => n * (1 - mix) + opposite[i] * mix);
}
