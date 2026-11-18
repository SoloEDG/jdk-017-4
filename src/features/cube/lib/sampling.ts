import type { CubeFaceName } from "../../../shared/types";
import { clamp } from "../../../shared/math";
import { dirFromUV, dirFromFaceTexel, projectToFace } from "./geometry";

export interface CubeSamplerSource {
  size: number;
  faces: Record<CubeFaceName, ImageData>;
}

/**
 * 读取面 (i, j) 处纹素并按权重累加。i、j 越界时不做边缘拉伸，
 * 而是把该虚拟纹素中心的空间方向重新投影到相邻面读取；
 * 角点方向同时涉及三面，由主轴投影自然落到第三面，保持方向连续。
 */
function accumulate(
  faces: Record<CubeFaceName, ImageData>,
  size: number,
  face: CubeFaceName,
  i: number,
  j: number,
  w: number,
  out: number[],
) {
  let img: ImageData,
    ii = i,
    jj = j;
  if (i >= 0 && i < size && j >= 0 && j < size) {
    img = faces[face];
  } else {
    const dir = dirFromFaceTexel(face, i, j, size);
    const p = projectToFace(dir[0], dir[1], dir[2]);
    img = faces[p.face];
    ii = clamp(Math.floor(p.s * size), 0, size - 1);
    jj = clamp(Math.floor(p.t * size), 0, size - 1);
  }
  const d = img.data,
    at = (jj * size + ii) * 4;
  out[0] += d[at] * w;
  out[1] += d[at + 1] * w;
  out[2] += d[at + 2] * w;
  out[3] += d[at + 3] * w;
}

/**
 * 直接读取六面纹理的双线性采样。预览、导入器展开图与高清导出
 * 共用这一条路径，方向与过滤规则完全一致。
 */
export function sampleCubeFaces(
  faces: Record<CubeFaceName, ImageData>,
  size: number,
  u: number,
  v: number,
): number[] {
  const d = dirFromUV(u, v);
  const p = projectToFace(d[0], d[1], d[2]);
  const x = p.s * size - 0.5,
    y = p.t * size - 0.5;
  const x0 = Math.floor(x),
    y0 = Math.floor(y);
  const fx = x - x0,
    fy = y - y0;
  const out = [0, 0, 0, 0];
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 2; i++)
      accumulate(
        faces,
        size,
        p.face,
        x0 + i,
        y0 + j,
        (i ? fx : 1 - fx) * (j ? fy : 1 - fy),
        out,
      );
  return out;
}

export function sampleCube(
  cube: CubeSamplerSource,
  u: number,
  v: number,
): number[] {
  return sampleCubeFaces(cube.faces, cube.size, u, v);
}
