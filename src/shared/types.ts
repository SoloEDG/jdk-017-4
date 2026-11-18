export interface Projection {
  mode: "planet" | "tunnel";
  zoom: number;
  yaw: number;
  pitch: number;
  roll: number;
}
export interface Edge {
  seam: number;
  feather: number;
  background: string;
  transparent: boolean;
}
export type CubeFaceName = "front" | "back" | "left" | "right" | "up" | "down";
export interface FaceTransform {
  /** 顺时针 90° 的次数 */
  rotate: 0 | 1 | 2 | 3;
  flipH: boolean;
  flipV: boolean;
}
export interface CubeData {
  /** 单面边长（像素），六面一致 */
  size: number;
  /** 校准后的六面，渲染直接读取 */
  faces: Record<CubeFaceName, ImageData>;
  /** 导入时的原始六面，用于重新校准 */
  original: Record<CubeFaceName, ImageData>;
  /** 每面来源文件名 */
  names: Record<CubeFaceName, string>;
  /** 每面校准参数 */
  transforms: Record<CubeFaceName, FaceTransform>;
}
export interface Asset {
  id: string;
  name: string;
  width: number;
  height: number;
  /** 平面素材的等距像素；立方体素材为 null（不保存预转换图） */
  data: ImageData | null;
  thumbnail: string;
  /** 立方体素材：直接读取六面纹理 */
  cube: CubeData | null;
}
export interface StudioDocument {
  asset: Asset | null;
  projection: Projection;
  edge: Edge;
}
export interface ExportSettings {
  size: number;
  format: "png" | "jpeg";
  quality: number;
}
export interface RenderSnapshot {
  asset: Asset;
  projection: Projection;
  edge: Edge;
}
