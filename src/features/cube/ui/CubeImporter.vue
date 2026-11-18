<script setup lang="ts">
import { ref, watch } from "vue";
import {
  X,
  Box,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-vue-next";
import type { StudioDocument, CubeFaceName } from "../../../shared/types";
import { FACE_LABELS, FACE_NAMES } from "../lib/geometry";
import { useCubeImport } from "../model/useCubeImport";
import { renderEquirect } from "../lib/preview";
import { MAX_FACE } from "../lib/decodeFace";

const props = defineProps<{ doc: StudioDocument }>();
const {
  open,
  busy,
  faces,
  transforms,
  validation,
  closeImporter,
  setFace,
  removeFace,
  rotateFace,
  flipFace,
  resetDraft,
  confirm,
} = useCubeImport();

// 立方体展开图排布：上在前之上，左前右后依次相接，下在前之下
const NET: CubeFaceName[] = ["up", "left", "front", "right", "back", "down"];
const fileInput = ref<HTMLInputElement>();
const preview = ref<HTMLCanvasElement>();
let pending: CubeFaceName | null = null;

function pick(face: CubeFaceName) {
  pending = face;
  fileInput.value?.click();
}
function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = "";
  if (f && pending) void setFace(pending, f);
  pending = null;
}
function drop(face: CubeFaceName, e: DragEvent) {
  const f = e.dataTransfer?.files[0];
  if (f) void setFace(face, f);
}
function summary(face: CubeFaceName) {
  const t = transforms[face];
  const parts: string[] = [];
  if (t.rotate) parts.push(`旋转 ${t.rotate * 90}°`);
  if (t.flipH) parts.push("左右翻转");
  if (t.flipV) parts.push("上下翻转");
  return parts.length ? parts.join(" · ") : "原始方向";
}
function render() {
  const v = validation.value;
  const canvas = preview.value;
  if (!open.value || !canvas || !v.ok) return;
  const map = {} as Record<CubeFaceName, ImageData>;
  for (const name of FACE_NAMES) map[name] = faces[name].calibrated!;
  renderEquirect(map, v.size, canvas, 432, 216);
}
watch(
  [open, preview, () => FACE_NAMES.map((name) => faces[name].calibrated)],
  render,
  { flush: "post" },
);
</script>
<template>
  <Teleport to="body">
    <div v-if="open" class="cube-overlay" @click.self="closeImporter">
      <div class="cube-dialog" role="dialog" aria-modal="true" aria-label="六面立方体导入">
        <div class="cube-head">
          <div>
            <span class="eyebrow">CUBEMAP IMPORT</span>
            <h2>六面立方体导入</h2>
          </div>
          <button class="cube-close" aria-label="关闭导入器" @click="closeImporter">
            <X :size="18" />
          </button>
        </div>
        <p class="muted">
          分别放入前 / 后 / 左 / 右 / 上 / 下六张正方形照片（单面最大
          {{ MAX_FACE }} × {{ MAX_FACE }}，超出自动缩小），在立方体预览中逐面旋转或翻转。
          整组校验通过并确认后才会替换当前素材，未完成的输入会保留在草稿中。
        </p>
        <div class="cube-body">
          <div class="cube-net">
            <div
              v-for="name in NET"
              :key="name"
              class="face-slot"
              :class="{ filled: !!faces[name].image, invalid: !!faces[name].error }"
              :style="{ gridArea: name }"
              :title="
                faces[name].fileName
                  ? `${FACE_LABELS[name]}面 · ${faces[name].fileName} · ${summary(name)}`
                  : `${FACE_LABELS[name]}面 · 未放入`
              "
              @click="pick(name)"
              @dragover.prevent
              @drop.prevent="drop(name, $event)"
            >
              <img
                v-if="faces[name].thumb"
                :src="faces[name].thumb"
                :alt="`${FACE_LABELS[name]}面预览`"
              />
              <span v-else class="face-empty"
                ><Box :size="17" />{{ FACE_LABELS[name] }}面<i>点击或拖入</i></span
              >
              <span class="face-tag">{{ FACE_LABELS[name] }}</span>
              <div v-if="faces[name].image" class="face-tools" @click.stop>
                <button
                  :aria-label="`顺时针旋转${FACE_LABELS[name]}面`"
                  @click="rotateFace(name)"
                >
                  <RotateCw :size="13" />
                </button>
                <button
                  :aria-label="`左右翻转${FACE_LABELS[name]}面`"
                  @click="flipFace(name, 'h')"
                >
                  <FlipHorizontal2 :size="13" />
                </button>
                <button
                  :aria-label="`上下翻转${FACE_LABELS[name]}面`"
                  @click="flipFace(name, 'v')"
                >
                  <FlipVertical2 :size="13" />
                </button>
                <button
                  :aria-label="`移除${FACE_LABELS[name]}面`"
                  @click="removeFace(name)"
                >
                  <Trash2 :size="13" />
                </button>
              </div>
              <span v-if="faces[name].error" class="face-error">{{
                faces[name].error
              }}</span>
            </div>
          </div>
          <div class="cube-side">
            <div class="cube-preview">
              <canvas ref="preview" aria-label="六面展开预览"></canvas>
              <div v-if="!validation.ok" class="preview-empty">
                六面齐全且校验通过后，这里显示等距柱状展开预览
              </div>
            </div>
            <ul class="cube-checks">
              <li v-if="validation.ok" class="ok">
                <CheckCircle2 :size="13" /> 六面齐全 · 单面
                {{ validation.size }} × {{ validation.size }} · 方向无重复
              </li>
              <li v-for="p in validation.problems" :key="p" class="bad">
                <AlertCircle :size="13" /> {{ p }}
              </li>
            </ul>
            <div class="cube-actions">
              <button class="text-button" @click="resetDraft">清空草稿</button>
              <button
                class="primary cube-confirm"
                :disabled="!validation.ok || busy"
                @click="confirm(props.doc)"
              >
                {{ busy ? "正在读取…" : "生成可编辑全景" }}
              </button>
            </div>
            <p class="mini">
              确认后保留原始六面与校准版本；在投影画面中点击即可反查并替换某一面，导出按目标清晰度直接读取六面纹理。
            </p>
          </div>
        </div>
        <input
          ref="fileInput"
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="onFile"
        />
      </div>
    </div>
  </Teleport>
</template>
