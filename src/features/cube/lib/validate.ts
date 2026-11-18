import type { CubeFaceName } from "../../../shared/types";
import { FACE_LABELS, FACE_NAMES } from "./geometry";

export interface DraftFaceInfo {
  image: ImageData | null;
  hash: string;
  error: string;
}
export interface DraftValidation {
  ok: boolean;
  problems: string[];
  /** 校验通过时的单面边长 */
  size: number;
}

/** 整组校验：缺面、逐面错误、尺寸一致性、重复方向。全部通过才允许替换素材。 */
export function validateDraft(
  faces: Record<CubeFaceName, DraftFaceInfo>,
): DraftValidation {
  const problems: string[] = [];
  const present = FACE_NAMES.filter((f) => faces[f].image);
  const missing = FACE_NAMES.filter((f) => !faces[f].image);
  if (missing.length)
    problems.push(
      `还缺 ${missing.length} 面：${missing.map((f) => FACE_LABELS[f]).join("、")}`,
    );
  for (const f of FACE_NAMES)
    if (faces[f].error) problems.push(`${FACE_LABELS[f]}面：${faces[f].error}`);
  const bySize = new Map<number, CubeFaceName[]>();
  for (const f of present) {
    const n = faces[f].image!.width;
    bySize.set(n, [...(bySize.get(n) ?? []), f]);
  }
  if (bySize.size > 1)
    problems.push(
      "六面尺寸不一致：" +
        [...bySize.entries()]
          .map(([n, fs]) => `${fs.map((f) => FACE_LABELS[f]).join("/")} 为 ${n} px`)
          .join("，"),
    );
  const byHash = new Map<string, CubeFaceName[]>();
  for (const f of present) {
    const h = faces[f].hash;
    if (!h) continue;
    byHash.set(h, [...(byHash.get(h) ?? []), f]);
  }
  for (const fs of byHash.values())
    if (fs.length > 1)
      problems.push(
        `同一张图被放入多个方向：${fs.map((f) => FACE_LABELS[f]).join("、")}`,
      );
  const ok = problems.length === 0 && present.length === FACE_NAMES.length;
  return {
    ok,
    problems,
    size: ok ? faces[present[0]].image!.width : 0,
  };
}
