import { computed, markRaw, reactive, ref } from "vue";
import type {
  Asset,
  CubeData,
  CubeFaceName,
  FaceTransform,
  StudioDocument,
} from "../../../shared/types";
import { FACE_NAMES } from "../lib/geometry";
import { bakeFace, defaultFaceTransform } from "../lib/transform";
import { decodeFace } from "../lib/decodeFace";
import { validateDraft } from "../lib/validate";
import { cubeThumbnail, imageThumb } from "../lib/preview";

interface FaceDraft {
  image: ImageData | null;
  calibrated: ImageData | null;
  thumb: string;
  fileName: string;
  hash: string;
  error: string;
}
const emptyFace = (): FaceDraft => ({
  image: null,
  calibrated: null,
  thumb: "",
  fileName: "",
  hash: "",
  error: "",
});

// 模块级草稿：导入器关闭后部分输入仍然保留，整组确认才落到文档。
const open = ref(false);
const busy = ref(false);
const faces = reactive<Record<CubeFaceName, FaceDraft>>({
  front: emptyFace(),
  back: emptyFace(),
  left: emptyFace(),
  right: emptyFace(),
  up: emptyFace(),
  down: emptyFace(),
});
const transforms = reactive<Record<CubeFaceName, FaceTransform>>({
  front: defaultFaceTransform(),
  back: defaultFaceTransform(),
  left: defaultFaceTransform(),
  right: defaultFaceTransform(),
  up: defaultFaceTransform(),
  down: defaultFaceTransform(),
});
const validation = computed(() => validateDraft(faces));

function rebake(face: CubeFaceName) {
  const f = faces[face];
  if (!f.image) return;
  f.calibrated = markRaw(bakeFace(f.image, transforms[face]));
  f.thumb = imageThumb(f.calibrated);
}

function resetDraft() {
  for (const name of FACE_NAMES) {
    faces[name] = emptyFace();
    transforms[name] = defaultFaceTransform();
  }
}

export function useCubeImport() {
  function openImporter() {
    open.value = true;
  }
  /** 从当前立方体素材继续校准：原始六面与校准参数回填草稿。 */
  function openRecalibrate(doc: StudioDocument) {
    const cube = doc.asset?.cube;
    if (!cube) {
      open.value = true;
      return;
    }
    for (const name of FACE_NAMES) {
      faces[name].image = cube.original[name];
      faces[name].calibrated = cube.faces[name];
      faces[name].thumb = imageThumb(cube.faces[name]);
      faces[name].fileName = cube.names[name];
      faces[name].hash = "";
      faces[name].error = "";
      transforms[name] = { ...cube.transforms[name] };
    }
    open.value = true;
  }
  function closeImporter() {
    open.value = false;
  }
  async function setFace(face: CubeFaceName, file: File) {
    busy.value = true;
    faces[face].error = "";
    try {
      const decoded = await decodeFace(file, file.name);
      faces[face].image = markRaw(decoded.image);
      faces[face].fileName = decoded.fileName;
      faces[face].hash = decoded.hash;
      rebake(face);
    } catch (e) {
      faces[face].image = null;
      faces[face].calibrated = null;
      faces[face].thumb = "";
      faces[face].hash = "";
      faces[face].error = e instanceof Error ? e.message : "无法读取图片";
    } finally {
      busy.value = false;
    }
  }
  function removeFace(face: CubeFaceName) {
    faces[face] = emptyFace();
    transforms[face] = defaultFaceTransform();
  }
  function rotateFace(face: CubeFaceName) {
    transforms[face].rotate = ((transforms[face].rotate + 1) %
      4) as FaceTransform["rotate"];
    rebake(face);
  }
  function flipFace(face: CubeFaceName, dir: "h" | "v") {
    if (dir === "h") transforms[face].flipH = !transforms[face].flipH;
    else transforms[face].flipV = !transforms[face].flipV;
    rebake(face);
  }
  /** 整组校验通过才把六面冻结为素材，替换当前素材。 */
  function confirm(doc: StudioDocument) {
    const v = validation.value;
    if (!v.ok) return;
    const cube = {
      size: v.size,
      faces: {},
      original: {},
      names: {},
      transforms: {},
    } as CubeData;
    for (const name of FACE_NAMES) {
      cube.faces[name] = faces[name].calibrated!;
      cube.original[name] = faces[name].image!;
      cube.names[name] = faces[name].fileName;
      cube.transforms[name] = { ...transforms[name] };
    }
    const asset: Asset = {
      id: crypto.randomUUID(),
      name: `六面全景 · ${faces.front.fileName}`,
      width: v.size * 4,
      height: v.size * 2,
      data: null,
      cube,
      thumbnail: cubeThumbnail(cube.faces, cube.size),
    };
    doc.asset = markRaw(asset);
    resetDraft();
    open.value = false;
  }
  /** 重新绑定单个面：其余五面的校准与内容原样保留。 */
  async function rebindFace(doc: StudioDocument, face: CubeFaceName, file: File) {
    const asset = doc.asset;
    const cube = asset?.cube;
    if (!asset || !cube) throw new Error("当前素材不是六面立方体");
    const decoded = await decodeFace(file, file.name);
    if (decoded.image.width !== cube.size)
      throw new Error(
        `单面需为 ${cube.size} × ${cube.size}，「${file.name}」为 ${decoded.image.width} × ${decoded.image.height}`,
      );
    const nextFaces = { ...cube.faces };
    nextFaces[face] = markRaw(bakeFace(decoded.image, cube.transforms[face]));
    const nextOriginal = { ...cube.original };
    nextOriginal[face] = markRaw(decoded.image);
    const next: CubeData = {
      size: cube.size,
      faces: nextFaces,
      original: nextOriginal,
      names: { ...cube.names, [face]: decoded.fileName },
      transforms: { ...cube.transforms },
    };
    const nextAsset: Asset = {
      ...asset,
      id: crypto.randomUUID(),
      cube: next,
      thumbnail: cubeThumbnail(next.faces, next.size),
    };
    doc.asset = markRaw(nextAsset);
  }
  return {
    open,
    busy,
    faces,
    transforms,
    validation,
    openImporter,
    openRecalibrate,
    closeImporter,
    setFace,
    removeFace,
    rotateFace,
    flipFace,
    resetDraft,
    confirm,
    rebindFace,
  };
}
