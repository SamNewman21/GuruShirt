"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  DesignLayer,
  GarmentPanelId,
  GarmentState,
  GarmentType,
  getPanelLabel,
  PANEL_UV_MAP,
  PatternViewMode,
} from "@/types/studio";
import {
  drawFabricMicroTexture,
  drawGarmentStructuralDetails,
  getWrappedLayersForPanel,
  renderDesignLayerInPanel,
} from "@/lib/textureEngine";
import { Grid, ZoomIn, ZoomOut } from "lucide-react";

interface Canvas2DEditorProps {
  garment: GarmentState;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  activePanel: GarmentPanelId;
  patternViewMode: PatternViewMode;
  onSelectLayer: (id: string | null) => void;
  onSelectPanel: (panel: GarmentPanelId) => void;
  onPatternViewModeChange: (mode: PatternViewMode) => void;
  onUpdateLayer: (id: string, patch: Partial<DesignLayer>) => void;
  onTextureDirty: () => void;
}

type DragHandleType =
  | "move"
  | "rotate"
  | "scale-nw"
  | "scale-ne"
  | "scale-se"
  | "scale-sw"
  | "scale-e"
  | "scale-s";

interface ActiveDragState {
  handle: DragHandleType;
  layerId: string;
  panelRect: { x: number; y: number; w: number; h: number };
  startMouseX: number;
  startMouseY: number;
  startLayer: DesignLayer;
}

/**
 * Traces the 2D silhouette path for a single panel.
 * Note: For front/back torso, the side seams align with x (0.0) and x + w (1.0)
 * so 2D coordinates match the 3D UV side seams 1-to-1!
 */
function tracePanelSilhouettePath(
  ctx: CanvasRenderingContext2D,
  garmentType: GarmentType,
  panelId: GarmentPanelId,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.beginPath();

  // 1. TANK TOP TORSO
  if (garmentType === "tank" && (panelId === "front" || panelId === "back")) {
    const scoop = panelId === "front" ? h * 0.22 : h * 0.14;
    ctx.moveTo(x + w * 0.28, y + h * 0.02);
    ctx.quadraticCurveTo(
      x + w * 0.5,
      y + h * 0.02 + scoop,
      x + w * 0.72,
      y + h * 0.02
    );
    ctx.lineTo(x + w * 0.84, y + h * 0.04);
    ctx.quadraticCurveTo(x + w * 0.75, y + h * 0.28, x + w, y + h * 0.44);
    ctx.lineTo(x + w, y + h * 0.98);
    ctx.lineTo(x, y + h * 0.98);
    ctx.lineTo(x, y + h * 0.44);
    ctx.quadraticCurveTo(
      x + w * 0.25,
      y + h * 0.28,
      x + w * 0.16,
      y + h * 0.04
    );
    ctx.closePath();
    return;
  }

  // 2. PANTS
  if (garmentType === "pants" && (panelId === "front" || panelId === "back")) {
    ctx.moveTo(x + w * 0.08, y + h * 0.04);
    ctx.lineTo(x + w * 0.92, y + h * 0.04);
    ctx.quadraticCurveTo(x + w, y + h * 0.25, x + w * 0.94, y + h * 0.98);
    ctx.lineTo(x + w * 0.55, y + h * 0.98);
    ctx.lineTo(x + w * 0.5, y + h * 0.36);
    ctx.lineTo(x + w * 0.45, y + h * 0.98);
    ctx.lineTo(x + w * 0.06, y + h * 0.98);
    ctx.quadraticCurveTo(x, y + h * 0.25, x + w * 0.08, y + h * 0.04);
    ctx.closePath();
    return;
  }

  // 3. SHORTS
  if (garmentType === "shorts" && (panelId === "front" || panelId === "back")) {
    ctx.moveTo(x + w * 0.08, y + h * 0.08);
    ctx.lineTo(x + w * 0.92, y + h * 0.08);
    ctx.lineTo(x + w, y + h * 0.92);
    ctx.lineTo(x + w * 0.53, y + h * 0.92);
    ctx.lineTo(x + w * 0.5, y + h * 0.52);
    ctx.lineTo(x + w * 0.47, y + h * 0.92);
    ctx.lineTo(x, y + h * 0.92);
    ctx.closePath();
    return;
  }

  // 4. SOCKS
  if (garmentType === "socks" && (panelId === "front" || panelId === "back")) {
    ctx.moveTo(x + w * 0.22, y + h * 0.04);
    ctx.lineTo(x + w * 0.66, y + h * 0.04);
    ctx.lineTo(x + w * 0.64, y + h * 0.58);
    ctx.quadraticCurveTo(
      x + w * 0.66,
      y + h * 0.68,
      x + w * 0.9,
      y + h * 0.76
    );
    ctx.quadraticCurveTo(
      x + w * 0.98,
      y + h * 0.85,
      x + w * 0.85,
      y + h * 0.95
    );
    ctx.lineTo(x + w * 0.3, y + h * 0.95);
    ctx.quadraticCurveTo(
      x + w * 0.14,
      y + h * 0.9,
      x + w * 0.18,
      y + h * 0.72
    );
    ctx.lineTo(x + w * 0.22, y + h * 0.04);
    ctx.closePath();
    return;
  }

  // 5. DEFAULT TORSO (T-Shirt, Hoodie, Winter Jacket) — Full 0..1 width alignment with 3D UV!
  if (panelId === "front" || panelId === "back") {
    const neckDepth =
      garmentType === "jacket"
        ? h * 0.04
        : panelId === "front"
        ? h * 0.11
        : h * 0.045;
    const neckLeft = x + w * 0.3;
    const neckRight = x + w * 0.7;
    const shoulderLeftX = x;
    const shoulderRightX = x + w;
    const shoulderY = y + h * 0.08;
    const armholeBottomY = y + h * 0.38;
    const hemY = y + h * 0.98;

    ctx.moveTo(neckLeft, y + h * 0.01);
    ctx.quadraticCurveTo(
      x + w * 0.5,
      y + h * 0.01 + neckDepth,
      neckRight,
      y + h * 0.01
    );
    ctx.lineTo(shoulderRightX, shoulderY);
    ctx.quadraticCurveTo(
      x + w * 0.95,
      y + h * 0.24,
      x + w,
      armholeBottomY
    );
    ctx.lineTo(x + w, hemY);
    ctx.lineTo(x, hemY);
    ctx.lineTo(x, armholeBottomY);
    ctx.quadraticCurveTo(
      x + w * 0.05,
      y + h * 0.24,
      shoulderLeftX,
      shoulderY
    );
    ctx.closePath();
  } else if (panelId === "leftSleeve" || panelId === "rightSleeve") {
    ctx.moveTo(x + w * 0.1, y + h * 0.06);
    ctx.quadraticCurveTo(x + w * 0.5, y, x + w * 0.9, y + h * 0.06);
    ctx.lineTo(x + w * 0.98, y + h * 0.94);
    ctx.lineTo(x + w * 0.02, y + h * 0.94);
    ctx.closePath();
  } else {
    const r = Math.min(w, h) * 0.15;
    ctx.roundRect(x + w * 0.02, y + h * 0.12, w * 0.96, h * 0.76, r);
  }
}

/**
 * Adds the attached flat-lay sleeves & collar/hood subpaths to the current canvas path
 * so when a wrap-around graphic is drawn in 2D Flat-Lay mode, it flows onto the sleeves & collar seamlessly!
 */
function traceFullConnectedGarmentClipPath(
  ctx: CanvasRenderingContext2D,
  garmentType: GarmentType,
  panelId: GarmentPanelId,
  rect: { x: number; y: number; w: number; h: number }
) {
  const { x, y, w, h } = rect;
  tracePanelSilhouettePath(ctx, garmentType, panelId, x, y, w, h);

  if (panelId !== "front" && panelId !== "back") return;

  if (
    garmentType === "tshirt" ||
    garmentType === "hoodie" ||
    garmentType === "jacket"
  ) {
    const isLong = garmentType === "hoodie" || garmentType === "jacket";

    // Collar / Hood subpath
    if (garmentType === "hoodie") {
      ctx.moveTo(x + w * 0.24, y + h * 0.04);
      ctx.quadraticCurveTo(
        x + w * 0.18,
        y - h * 0.22,
        x + w * 0.5,
        y - h * 0.24
      );
      ctx.quadraticCurveTo(
        x + w * 0.82,
        y - h * 0.22,
        x + w * 0.76,
        y + h * 0.04
      );
      ctx.closePath();
    } else if (garmentType === "jacket") {
      ctx.roundRect(x + w * 0.28, y - h * 0.07, w * 0.44, h * 0.11, 6);
    } else {
      ctx.moveTo(x + w * 0.29, y + h * 0.02);
      ctx.quadraticCurveTo(
        x + w * 0.5,
        y - h * 0.04,
        x + w * 0.71,
        y + h * 0.02
      );
      ctx.quadraticCurveTo(
        x + w * 0.5,
        y + h * 0.14,
        x + w * 0.29,
        y + h * 0.02
      );
      ctx.closePath();
    }

    // Left Sleeve subpath (viewer's left)
    if (isLong) {
      ctx.moveTo(x + w * 0.02, y + h * 0.08);
      ctx.lineTo(x - w * 0.36, y + h * 0.82);
      ctx.lineTo(x - w * 0.16, y + h * 0.88);
      ctx.lineTo(x + w * 0.04, y + h * 0.38);
      ctx.closePath();
    } else {
      ctx.moveTo(x + w * 0.02, y + h * 0.08);
      ctx.lineTo(x - w * 0.28, y + h * 0.25);
      ctx.lineTo(x - w * 0.16, y + h * 0.44);
      ctx.lineTo(x + w * 0.04, y + h * 0.38);
      ctx.closePath();
    }

    // Right Sleeve subpath (viewer's right)
    if (isLong) {
      ctx.moveTo(x + w * 0.98, y + h * 0.08);
      ctx.lineTo(x + w * 1.36, y + h * 0.82);
      ctx.lineTo(x + w * 1.16, y + h * 0.88);
      ctx.lineTo(x + w * 0.96, y + h * 0.38);
      ctx.closePath();
    } else {
      ctx.moveTo(x + w * 0.98, y + h * 0.08);
      ctx.lineTo(x + w * 1.28, y + h * 0.25);
      ctx.lineTo(x + w * 1.16, y + h * 0.44);
      ctx.lineTo(x + w * 0.96, y + h * 0.38);
      ctx.closePath();
    }
  }
}

function drawFlatLayGarmentContext(
  ctx: CanvasRenderingContext2D,
  garment: GarmentState,
  panelId: GarmentPanelId,
  rect: { x: number; y: number; w: number; h: number }
) {
  if (panelId !== "front" && panelId !== "back") return;
  const { x, y, w, h } = rect;
  const gt = garment.garmentType;

  if (gt === "tshirt" || gt === "hoodie" || gt === "jacket") {
    ctx.save();
    ctx.fillStyle = garment.panelColors.collar;
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (gt === "hoodie") {
      ctx.moveTo(x + w * 0.24, y + h * 0.04);
      ctx.quadraticCurveTo(
        x + w * 0.18,
        y - h * 0.22,
        x + w * 0.5,
        y - h * 0.24
      );
      ctx.quadraticCurveTo(
        x + w * 0.82,
        y - h * 0.22,
        x + w * 0.76,
        y + h * 0.04
      );
      ctx.closePath();
    } else if (gt === "jacket") {
      ctx.roundRect(x + w * 0.28, y - h * 0.07, w * 0.44, h * 0.11, 6);
    } else {
      ctx.moveTo(x + w * 0.29, y + h * 0.02);
      ctx.quadraticCurveTo(
        x + w * 0.5,
        y - h * 0.04,
        x + w * 0.71,
        y + h * 0.02
      );
      ctx.quadraticCurveTo(
        x + w * 0.5,
        y + h * 0.14,
        x + w * 0.29,
        y + h * 0.02
      );
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const isLong = gt === "hoodie" || gt === "jacket";

    // Left Side Sleeve
    ctx.save();
    ctx.fillStyle = garment.panelColors.rightSleeve;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (isLong) {
      ctx.moveTo(x + w * 0.02, y + h * 0.08);
      ctx.lineTo(x - w * 0.36, y + h * 0.82);
      ctx.lineTo(x - w * 0.16, y + h * 0.88);
      ctx.lineTo(x + w * 0.04, y + h * 0.38);
    } else {
      ctx.moveTo(x + w * 0.02, y + h * 0.08);
      ctx.lineTo(x - w * 0.28, y + h * 0.25);
      ctx.lineTo(x - w * 0.16, y + h * 0.44);
      ctx.lineTo(x + w * 0.04, y + h * 0.38);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right Side Sleeve
    ctx.save();
    ctx.fillStyle = garment.panelColors.leftSleeve;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (isLong) {
      ctx.moveTo(x + w * 0.98, y + h * 0.08);
      ctx.lineTo(x + w * 1.36, y + h * 0.82);
      ctx.lineTo(x + w * 1.16, y + h * 0.88);
      ctx.lineTo(x + w * 0.96, y + h * 0.38);
    } else {
      ctx.moveTo(x + w * 0.98, y + h * 0.08);
      ctx.lineTo(x + w * 1.28, y + h * 0.25);
      ctx.lineTo(x + w * 1.16, y + h * 0.44);
      ctx.lineTo(x + w * 0.96, y + h * 0.38);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (gt === "pants" || gt === "shorts") {
    ctx.save();
    ctx.fillStyle = garment.panelColors.collar;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    const wy = gt === "shorts" ? y + h * 0.02 : y - h * 0.02;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.08, wy, w * 0.84, h * 0.07, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (gt === "socks") {
    ctx.save();
    ctx.fillStyle = garment.panelColors.collar;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.215, y - h * 0.02, w * 0.45, h * 0.09, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export default function Canvas2DEditor({
  garment,
  layers,
  selectedLayerId,
  activePanel,
  patternViewMode,
  onSelectLayer,
  onSelectPanel,
  onPatternViewModeChange,
  onUpdateLayer,
  onTextureDirty,
}: Canvas2DEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(0.85);
  const [snapGuide, setSnapGuide] = useState<{ x: boolean; y: boolean }>({
    x: false,
    y: false,
  });
  const dragRef = useRef<ActiveDragState | null>(null);
  const [, setRenderTick] = useState(0);

  const triggerRerender = useCallback(() => {
    setRenderTick((t) => t + 1);
    onTextureDirty();
  }, [onTextureDirty]);

  const getPanelDisplayRect = useCallback(
    (panelId: GarmentPanelId, canvasW: number, canvasH: number) => {
      if (patternViewMode === "single-panel") {
        const topPad = 70;
        const bottomPad = 115;
        const sidePad = 210;
        const availW = canvasW - sidePad * 2;
        const availH = canvasH - topPad - bottomPad;
        const aspect =
          panelId === "front" || panelId === "back"
            ? 0.76
            : panelId === "collar"
            ? 1.8
            : 1.25;

        let w = availW;
        let h = w / aspect;
        if (h > availH) {
          h = availH;
          w = h * aspect;
        }
        return {
          x: (canvasW - w) / 2,
          y: topPad + (availH - h) / 2,
          w,
          h,
        };
      } else {
        const uv = PANEL_UV_MAP[panelId];
        const padX = 80;
        const topPad = 50;
        const bottomPad = 110;
        const availW = canvasW - padX * 2;
        const availH = canvasH - topPad - bottomPad;
        return {
          x: padX + uv.uMin * availW,
          y: topPad + uv.vMin * availH,
          w: (uv.uMax - uv.uMin) * availW,
          h: (uv.vMax - uv.vMin) * availH,
        };
      }
    },
    [patternViewMode]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#0d0f13";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    const gridSize = 32 * zoom;
    for (let gx = 0; gx < W; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);

    const panelsToDraw: GarmentPanelId[] =
      patternViewMode === "single-panel"
        ? [activePanel]
        : ["front", "back", "leftSleeve", "rightSleeve", "collar"];

    for (const panelId of panelsToDraw) {
      const rect = getPanelDisplayRect(panelId, W, H);
      const isFocusedPanel = panelId === activePanel;

      if (patternViewMode === "single-panel") {
        drawFlatLayGarmentContext(ctx, garment, panelId, rect);
      }

      // Drop shadow under pattern cut piece
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 10;
      tracePanelSilhouettePath(
        ctx,
        garment.garmentType,
        panelId,
        rect.x,
        rect.y,
        rect.w,
        rect.h
      );
      ctx.fillStyle = garment.panelColors[panelId];
      ctx.fill();
      ctx.restore();

      // Clip strictly inside the active fabric panel silhouette so torso graphics never bleed onto sleeve or collar fabric
      ctx.save();
      tracePanelSilhouettePath(
        ctx,
        garment.garmentType,
        panelId,
        rect.x,
        rect.y,
        rect.w,
        rect.h
      );
      ctx.clip();

      drawFabricMicroTexture(
        ctx,
        rect.x - rect.w * 0.4,
        rect.y - rect.h * 0.3,
        rect.w * 1.8,
        rect.h * 1.4,
        garment.fabric
      );

      if (
        garment.garmentType === "socks" &&
        (panelId === "front" || panelId === "back")
      ) {
        ctx.fillStyle = garment.panelColors.leftSleeve;
        ctx.beginPath();
        ctx.arc(
          rect.x + rect.w * 0.24,
          rect.y + rect.h * 0.85,
          rect.w * 0.14,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = garment.panelColors.rightSleeve;
        ctx.beginPath();
        ctx.arc(
          rect.x + rect.w * 0.86,
          rect.y + rect.h * 0.85,
          rect.w * 0.14,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Render native + 360-wrapped layers on this panel
      const panelLayers = getWrappedLayersForPanel(layers, panelId);
      for (const layer of panelLayers) {
        renderDesignLayerInPanel(
          ctx,
          layer,
          rect.x,
          rect.y,
          rect.w,
          rect.h,
          triggerRerender,
          false
        );
      }

      drawGarmentStructuralDetails(
        ctx,
        garment,
        panelId,
        rect.x,
        rect.y,
        rect.w,
        rect.h
      );

      if (garment.showPrintGuides) {
        ctx.save();
        ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1.5;
        const safeX = rect.x + rect.w * 0.18;
        const safeY = rect.y + rect.h * 0.16;
        const safeW = rect.w * 0.64;
        const safeH = rect.h * 0.64;
        ctx.strokeRect(safeX, safeY, safeW, safeH);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.moveTo(rect.x + rect.w / 2, rect.y + rect.h * 0.05);
        ctx.lineTo(rect.x + rect.w / 2, rect.y + rect.h * 0.95);
        ctx.stroke();
        ctx.restore();
      }

      if (isFocusedPanel && (snapGuide.x || snapGuide.y)) {
        ctx.save();
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 1.5;
        if (snapGuide.x) {
          ctx.beginPath();
          ctx.moveTo(rect.x + rect.w / 2, rect.y);
          ctx.lineTo(rect.x + rect.w / 2, rect.y + rect.h);
          ctx.stroke();
        }
        if (snapGuide.y) {
          ctx.beginPath();
          ctx.moveTo(rect.x, rect.y + rect.h / 2);
          ctx.lineTo(rect.x + rect.w, rect.y + rect.h / 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();

      // Pattern Piece Outer Contour & Seam Stitch
      ctx.save();
      tracePanelSilhouettePath(
        ctx,
        garment.garmentType,
        panelId,
        rect.x,
        rect.y,
        rect.w,
        rect.h
      );
      ctx.strokeStyle = isFocusedPanel
        ? "rgba(129, 140, 248, 0.75)"
        : "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = isFocusedPanel ? 1.5 : 1.2;
      ctx.stroke();

      if (garment.showSeams) {
        ctx.strokeStyle = garment.stitchColor;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);
        tracePanelSilhouettePath(
          ctx,
          garment.garmentType,
          panelId,
          rect.x + 4,
          rect.y + 4,
          rect.w - 8,
          rect.h - 8
        );
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = isFocusedPanel ? "#818cf8" : "rgba(255,255,255,0.45)";
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      const panelInfo = getPanelLabel(garment.garmentType, panelId);
      ctx.fillText(panelInfo.label.toUpperCase(), rect.x + 8, rect.y - 10);
      ctx.restore();
    }

    // Selection Bounding Box & Handles
    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (
      selectedLayer &&
      selectedLayer.visible &&
      (patternViewMode === "all-panels" || selectedLayer.panel === activePanel)
    ) {
      const rect = getPanelDisplayRect(selectedLayer.panel, W, H);
      const cx = rect.x + selectedLayer.x * rect.w;
      const cy = rect.y + selectedLayer.y * rect.h;
      const lw = selectedLayer.width * rect.w;
      const lh = selectedLayer.height * rect.h;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((selectedLayer.rotation * Math.PI) / 180);

      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.strokeRect(-lw / 2, -lh / 2, lw, lh);

      ctx.beginPath();
      ctx.moveTo(0, -lh / 2);
      ctx.lineTo(0, -lh / 2 - 24);
      ctx.stroke();

      ctx.fillStyle = "#6366f1";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -lh / 2 - 24, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const handleCoords = [
        [-lw / 2, -lh / 2],
        [lw / 2, -lh / 2],
        [lw / 2, lh / 2],
        [-lw / 2, lh / 2],
        [lw / 2, 0],
        [0, lh / 2],
      ];

      for (const [hx, hy] of handleCoords) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(hx - 5, hy - 5, 10, 10);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }, [
    garment,
    layers,
    selectedLayerId,
    activePanel,
    patternViewMode,
    zoom,
    snapGuide,
    getPanelDisplayRect,
    triggerRerender,
  ]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const rawX = ((e.clientX - bounds.left) / bounds.width) * canvas.width;
    const rawY = ((e.clientY - bounds.top) / bounds.height) * canvas.height;
    const W = canvas.width;
    const H = canvas.height;
    return {
      x: (rawX - W / 2) / zoom + W / 2,
      y: (rawY - H / 2) / zoom + H / 2,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = getCanvasPoint(e);
    const W = canvas.width;
    const H = canvas.height;

    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (selectedLayer && selectedLayer.visible && !selectedLayer.locked) {
      const rect = getPanelDisplayRect(selectedLayer.panel, W, H);
      const cx = rect.x + selectedLayer.x * rect.w;
      const cy = rect.y + selectedLayer.y * rect.h;
      const lw = selectedLayer.width * rect.w;
      const lh = selectedLayer.height * rect.h;

      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const rad = (-selectedLayer.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      const hitRadius = 12;
      if (Math.hypot(localX - 0, localY - (-lh / 2 - 24)) <= hitRadius) {
        dragRef.current = {
          handle: "rotate",
          layerId: selectedLayer.id,
          panelRect: rect,
          startMouseX: pt.x,
          startMouseY: pt.y,
          startLayer: { ...selectedLayer },
        };
        return;
      }

      const handleTests: { type: DragHandleType; x: number; y: number }[] = [
        { type: "scale-nw", x: -lw / 2, y: -lh / 2 },
        { type: "scale-ne", x: lw / 2, y: -lh / 2 },
        { type: "scale-se", x: lw / 2, y: lh / 2 },
        { type: "scale-sw", x: -lw / 2, y: lh / 2 },
        { type: "scale-e", x: lw / 2, y: 0 },
        { type: "scale-s", x: 0, y: lh / 2 },
      ];

      for (const h of handleTests) {
        if (Math.hypot(localX - h.x, localY - h.y) <= hitRadius) {
          dragRef.current = {
            handle: h.type,
            layerId: selectedLayer.id,
            panelRect: rect,
            startMouseX: pt.x,
            startMouseY: pt.y,
            startLayer: { ...selectedLayer },
          };
          return;
        }
      }
    }

    const panelsToSearch: GarmentPanelId[] =
      patternViewMode === "single-panel"
        ? [activePanel]
        : ["front", "back", "leftSleeve", "rightSleeve", "collar"];

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || !panelsToSearch.includes(layer.panel)) continue;

      const rect = getPanelDisplayRect(layer.panel, W, H);
      const cx = rect.x + layer.x * rect.w;
      const cy = rect.y + layer.y * rect.h;
      const lw = layer.width * rect.w;
      const lh = layer.height * rect.h;

      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const rad = (-layer.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (Math.abs(localX) <= lw / 2 && Math.abs(localY) <= lh / 2) {
        onSelectLayer(layer.id);
        onSelectPanel(layer.panel);
        if (!layer.locked) {
          dragRef.current = {
            handle: "move",
            layerId: layer.id,
            panelRect: rect,
            startMouseX: pt.x,
            startMouseY: pt.y,
            startLayer: { ...layer },
          };
        }
        return;
      }
    }

    if (patternViewMode === "all-panels") {
      for (const panelId of panelsToSearch) {
        const rect = getPanelDisplayRect(panelId, W, H);
        if (
          pt.x >= rect.x &&
          pt.x <= rect.x + rect.w &&
          pt.y >= rect.y &&
          pt.y <= rect.y + rect.h
        ) {
          onSelectPanel(panelId);
          onSelectLayer(null);
          return;
        }
      }
    }

    onSelectLayer(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const pt = getCanvasPoint(e);
    const { handle, layerId, panelRect, startMouseX, startMouseY, startLayer } =
      drag;

    if (handle === "move") {
      const dxNorm = (pt.x - startMouseX) / panelRect.w;
      const dyNorm = (pt.y - startMouseY) / panelRect.h;

      // Allow dragging across seams (-0.35 .. 1.35) so graphics can straddle edges & sleeves
      let nextX = Math.max(-0.35, Math.min(1.35, startLayer.x + dxNorm));
      let nextY = Math.max(-0.15, Math.min(1.15, startLayer.y + dyNorm));

      const snapX = Math.abs(nextX - 0.5) < 0.018;
      const snapY = Math.abs(nextY - 0.5) < 0.018;
      if (snapX) nextX = 0.5;
      if (snapY) nextY = 0.5;
      setSnapGuide({ x: snapX, y: snapY });

      onUpdateLayer(layerId, { x: nextX, y: nextY });
    } else if (handle === "rotate") {
      const cx = panelRect.x + startLayer.x * panelRect.w;
      const cy = panelRect.y + startLayer.y * panelRect.h;
      const angleRad = Math.atan2(pt.y - cy, pt.x - cx);
      let deg = (angleRad * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      const nearest15 = Math.round(deg / 15) * 15;
      if (Math.abs(deg - nearest15) < 3) {
        deg = nearest15 % 360;
      } else {
        deg = Math.round(deg);
      }
      onUpdateLayer(layerId, { rotation: deg });
    } else if (handle.startsWith("scale-")) {
      const cx = panelRect.x + startLayer.x * panelRect.w;
      const cy = panelRect.y + startLayer.y * panelRect.h;
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const rad = (-startLayer.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (handle === "scale-e") {
        const newW = Math.max(
          0.06,
          Math.min(1.8, (Math.abs(localX) * 2) / panelRect.w)
        );
        onUpdateLayer(layerId, { width: Number(newW.toFixed(3)) });
      } else if (handle === "scale-s") {
        const newH = Math.max(
          0.06,
          Math.min(1.8, (Math.abs(localY) * 2) / panelRect.h)
        );
        onUpdateLayer(layerId, { height: Number(newH.toFixed(3)) });
      } else {
        const startDist = Math.hypot(
          (startLayer.width * panelRect.w) / 2,
          (startLayer.height * panelRect.h) / 2
        );
        const curDist = Math.hypot(localX, localY);
        const ratio = Math.max(
          0.15,
          Math.min(4.0, curDist / Math.max(10, startDist))
        );
        onUpdateLayer(layerId, {
          width: Number(
            Math.max(0.05, Math.min(1.8, startLayer.width * ratio)).toFixed(3)
          ),
          height: Number(
            Math.max(0.05, Math.min(1.8, startLayer.height * ratio)).toFixed(3)
          ),
        });
      }
    }
  };

  const handleMouseUp = () => {
    dragRef.current = null;
    setSnapGuide({ x: false, y: false });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const delta = -e.deltaY * 0.0012;
    setZoom((z) =>
      Math.max(0.25, Math.min(2.5, Number((z + delta).toFixed(2))))
    );
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-[#0d0f13] select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1280}
        height={840}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* Top-Right Compact Controls & Zoom Slider */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={() =>
            onPatternViewModeChange(
              patternViewMode === "single-panel" ? "all-panels" : "single-panel"
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-md transition-all ${
            patternViewMode === "all-panels"
              ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
              : "bg-studio-panel/90 border-studio-border text-slate-300 hover:text-white"
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          {patternViewMode === "all-panels"
            ? "UV Pattern Map (All 5 Panels)"
            : "Single Flat-Lay View"}
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-studio-panel/90 border border-studio-border backdrop-blur-md shadow-lg">
          <button
            onClick={() =>
              setZoom((z) => Math.max(0.25, Number((z - 0.15).toFixed(2))))
            }
            className="p-1 rounded hover:bg-studio-surface text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={0.25}
            max={2.5}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-28 accent-indigo-500 cursor-pointer"
            title="Zoom Slider (25% - 250%)"
          />
          <button
            onClick={() =>
              setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))
            }
            className="p-1 rounded hover:bg-studio-surface text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(0.85)}
            className="px-1.5 py-0.5 rounded bg-studio-surface text-[11px] font-mono text-slate-200 hover:text-white min-w-[44px] text-center"
            title="Click to Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>
      </div>
    </div>
  );
}
