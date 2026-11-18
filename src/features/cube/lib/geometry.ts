import type { CubeFaceName } from "../../../shared/types";

export const FACE_NAMES: CubeFaceName[] = [
  "front",
  "back",
  "left",
  "right",
  "up",
  "down",
];
export const FACE_LABELS: Record<CubeFaceName, string> = {
  front: "前",
  back: "后",
  left: "左",
  right: "右",
  up: "上",
  down: "下",
};

type Vec3 = readonly [number, number, number];
interface FaceFrame {
  /** 面法线 */
  axis: Vec3;
  /** 面内向右 */
  u: Vec3;
  /** 面内向下 */
  v: Vec3;
}
/**
 * 六面的空间坐标架，与 OpenGL 立方体贴图约定一致：
 * 前=+Z 后=-Z 右=+X 左=-X 上=+Y 下=-Y，侧面图像上方对应世界 +Y。
 * 相邻面共用棱边方向，保证跨面读取时方向连续。
 */
export const FACE_FRAMES: Record<CubeFaceName, FaceFrame> = {
  front: { axis: [0, 0, 1], u: [1, 0, 0], v: [0, -1, 0] },
  back: { axis: [0, 0, -1], u: [-1, 0, 0], v: [0, -1, 0] },
  right: { axis: [1, 0, 0], u: [0, 0, -1], v: [0, -1, 0] },
  left: { axis: [-1, 0, 0], u: [0, 0, 1], v: [0, -1, 0] },
  up: { axis: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  down: { axis: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1] },
};

/**
 * 等距全景 (u, v) → 单位方向。v=0 为 +Y（天顶）；
 * u=0.5 为前面中心，u 增大向右展开（u=0.75 右面，u=0/1 后面）。
 */
export function dirFromUV(u: number, v: number): [number, number, number] {
  const phi = Math.PI * v;
  const lambda = Math.PI * (1.5 - 2 * u);
  const r = Math.sin(phi);
  return [r * Math.cos(lambda), Math.cos(phi), r * Math.sin(lambda)];
}

/** 方向 → 所属面与面内坐标 (s, t) ∈ [0, 1]²，按主轴投影。 */
export function projectToFace(
  dx: number,
  dy: number,
  dz: number,
): { face: CubeFaceName; s: number; t: number } {
  const ax = Math.abs(dx),
    ay = Math.abs(dy),
    az = Math.abs(dz);
  let face: CubeFaceName, sc: number, tc: number, ma: number;
  if (ax >= ay && ax >= az) {
    ma = ax;
    if (dx > 0) {
      face = "right";
      sc = -dz;
      tc = -dy;
    } else {
      face = "left";
      sc = dz;
      tc = -dy;
    }
  } else if (ay >= az) {
    ma = ay;
    if (dy > 0) {
      face = "up";
      sc = dx;
      tc = dz;
    } else {
      face = "down";
      sc = dx;
      tc = -dz;
    }
  } else {
    ma = az;
    if (dz > 0) {
      face = "front";
      sc = dx;
      tc = -dy;
    } else {
      face = "back";
      sc = -dx;
      tc = -dy;
    }
  }
  return { face, s: 0.5 * (sc / ma + 1), t: 0.5 * (tc / ma + 1) };
}

/** 面上某个纹素中心对应的空间方向（i, j 可越界，用于跨面读取）。 */
export function dirFromFaceTexel(
  face: CubeFaceName,
  i: number,
  j: number,
  size: number,
): [number, number, number] {
  const f = FACE_FRAMES[face];
  const sc = ((i + 0.5) / size) * 2 - 1;
  const tc = ((j + 0.5) / size) * 2 - 1;
  return [
    f.axis[0] + f.u[0] * sc + f.v[0] * tc,
    f.axis[1] + f.u[1] * sc + f.v[1] * tc,
    f.axis[2] + f.u[2] * sc + f.v[2] * tc,
  ];
}

/** 等距全景 (u, v) → 所属面（投影画面反查用）。 */
export function faceFromUV(u: number, v: number): CubeFaceName {
  const d = dirFromUV(u, v);
  return projectToFace(d[0], d[1], d[2]).face;
}
