<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Move,
  Maximize,
  MousePointer2,
  Plus,
  Minus,
  ScanLine,
  ImagePlus,
} from "lucide-vue-next";
import type {
  StudioDocument,
  Projection,
  CubeFaceName,
} from "../../../shared/types";
import { usePreview, PREVIEW_SIZE } from "../model/usePreview";
import { dragView, wheelZoom } from "../lib/gestures";
import { projectPoint } from "../../projection";
import { faceFromUV, FACE_LABELS, useCubeImport } from "../../cube";
const { doc } = defineProps<{ doc: StudioDocument }>();
const canvas = ref<HTMLCanvasElement>();
const { rendering } = usePreview(doc, canvas);
const guides = ref(false);
const { rebindFace } = useCubeImport();
const isCube = computed(() => !!doc.asset?.cube);
const pickMode = ref(false);
const hoverFace = ref<CubeFaceName | null>(null);
const faceMessage = ref("");
const faceInput = ref<HTMLInputElement>();
let pendingFace: CubeFaceName | null = null;
let start: { x: number; y: number; p: Projection } | null = null;
let clickStart: { x: number; y: number } | null = null;
watch(isCube, (v) => {
  if (!v) pickMode.value = false;
});
// 与渲染共用 projectPoint，保证反查方向规则一致
function faceAt(e: PointerEvent): CubeFaceName | null {
  if (!isCube.value) return null;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * PREVIEW_SIZE;
  const y = ((e.clientY - rect.top) / rect.height) * PREVIEW_SIZE;
  const uv = projectPoint(
    x + 0.5,
    y + 0.5,
    PREVIEW_SIZE,
    PREVIEW_SIZE,
    doc.projection,
  );
  return faceFromUV(uv.u, uv.v);
}
function down(e: PointerEvent) {
  if (e.button !== 0) return;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  if (pickMode.value) {
    clickStart = { x: e.clientX, y: e.clientY };
    return;
  }
  start = { x: e.clientX, y: e.clientY, p: { ...doc.projection } };
}
function move(e: PointerEvent) {
  if (pickMode.value) {
    hoverFace.value = faceAt(e);
    return;
  }
  if (!start) return;
  Object.assign(
    doc.projection,
    dragView(
      start.p,
      e.clientX - start.x,
      e.clientY - start.y,
      (e.currentTarget as HTMLElement).clientWidth,
    ),
  );
}
function up(e: PointerEvent) {
  if (pickMode.value) {
    const s = clickStart;
    clickStart = null;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 6) {
      const face = faceAt(e);
      if (face) {
        pendingFace = face;
        faceMessage.value = `为${FACE_LABELS[face]}面选择新照片…`;
        faceInput.value?.click();
      }
    }
    return;
  }
  start = null;
}
function cancel() {
  start = null;
  clickStart = null;
}
async function pickFile(e: Event) {
  const el = e.target as HTMLInputElement;
  const f = el.files?.[0];
  el.value = "";
  const face = pendingFace;
  pendingFace = null;
  if (!f || !face) return;
  try {
    await rebindFace(doc, face, f);
    faceMessage.value = `已替换${FACE_LABELS[face]}面，其余五面校准保留`;
  } catch (err) {
    faceMessage.value = err instanceof Error ? err.message : "替换失败";
  }
}
function wheel(e: WheelEvent) {
  doc.projection.zoom = wheelZoom(doc.projection.zoom, e.deltaY);
}
</script>
<template>
  <main class="viewport">
    <div class="viewport-heading">
      <div>
        <span class="eyebrow">LIVE CANVAS</span>
        <h1>换个视角，世界很小。</h1>
      </div>
      <span class="live"><i />{{ rendering ? "正在渲染" : "实时预览" }}</span>
    </div>
    <div class="canvas-area">
      <span class="corner-label"
        >{{
          doc.projection.mode === "planet" ? "LITTLE PLANET" : "INFINITE TUNNEL"
        }}
        / 01</span
      >
      <div v-if="pickMode" class="pick-hint">
        点击画面定位要替换的面<span v-if="hoverFace">
          · 指向：{{ FACE_LABELS[hoverFace] }}面</span
        >
      </div>
      <div
        class="canvas-wrap"
        :class="{ guides, picking: pickMode }"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="cancel"
        @lostpointercapture="cancel"
        @wheel.prevent="wheel"
      >
        <canvas ref="canvas" aria-label="小行星实时投影画布" />
        <div v-if="!doc.asset" class="empty">导入一张照片，开启你的星球</div>
        <div v-if="guides" class="crosshair" />
      </div>
      <div class="canvas-caption">
        <span>STEREOGRAPHIC PROJECTION</span><span>600 × 600 · 预览</span>
      </div>
    </div>
    <p v-if="faceMessage && isCube" class="mini viewport-message">
      {{ faceMessage }}
    </p>
    <div class="viewport-toolbar">
      <div class="gesture-hint">
        <template v-if="pickMode"
          ><MousePointer2 :size="14" /> 点击替换对应面</template
        >
        <template v-else
          ><MousePointer2 :size="14" /> 拖动旋转 <span>·</span
          ><Move :size="14" /> 滚轮缩放</template
        >
      </div>
      <div class="tool-buttons">
        <button
          aria-label="缩小"
          @click="doc.projection.zoom = wheelZoom(doc.projection.zoom, 100)"
        >
          <Minus :size="16" /></button
        ><span>{{ Math.round(doc.projection.zoom * 100) }}%</span
        ><button
          aria-label="放大"
          @click="doc.projection.zoom = wheelZoom(doc.projection.zoom, -100)"
        >
          <Plus :size="16" /></button
        ><b /><button
          aria-label="切换辅助线"
          :class="{ selected: guides }"
          @click="guides = !guides"
        >
          <ScanLine :size="17" /></button
        ><button aria-label="重置缩放" @click="doc.projection.zoom = 1">
          <Maximize :size="16" /></button
        ><template v-if="isCube"
          ><b /><button
            aria-label="替换某一面"
            :class="{ selected: pickMode }"
            @click="pickMode = !pickMode"
          >
            <ImagePlus :size="16" /></button
        ></template>
      </div>
    </div>
    <input
      ref="faceInput"
      hidden
      type="file"
      accept="image/jpeg,image/png,image/webp"
      @change="pickFile"
    />
    <div class="inspiration">
      <span class="spark">✳</span>
      <div>
        <strong>每一片风景，都有另一个宇宙。</strong
        ><span>试试切换隧道模式，或轻轻拖动星球，寻找意想不到的构图。</span>
      </div>
      <span class="inspiration-number">017</span>
    </div>
  </main>
</template>
