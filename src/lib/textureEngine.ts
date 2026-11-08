import {
  DEFAULT_GARMENT_FIT,
  DesignLayer,
  FabricType,
  GARMENT_CATALOG,
  GarmentPanelId,
  GarmentState,
  PANEL_UV_MAP,
  TextLayerConfig,
} from "@/types/studio";

const imageCache = new Map<string, HTMLImageElement>();
const processedCache = new Map<string, HTMLCanvasElement>();

export function loadImageElement(
  src: string,
  onLoad?: () => void
): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return cached;
    }
    return null;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    if (onLoad) onLoad();
  };
  img.src = src;
  imageCache.set(src, img);
  return null;
}

/**
 * Renders a live TextLayerConfig (with optional arch curve, stroke outline, and letter spacing)
 * into a crisp Data URL so it flows through all 2D & 3D pixel shaders seamlessly.
 */
export function renderTextConfigToDataUrl(cfg: TextLayerConfig): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const text = (cfg.text || "GURUSHIRT").toUpperCase();
  const fontSize = 96;
  ctx.font = `900 ${fontSize}px ${cfg.fontFamily || "Impact, Arial Black, sans-serif"}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = cfg.color || "#ffffff";
  ctx.strokeStyle = cfg.strokeColor || "#000000";
  ctx.lineWidth = cfg.strokeWidth ?? 6;
  ctx.lineJoin = "round";

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (!cfg.archCurve || Math.abs(cfg.archCurve) < 3) {
    const chars = text.split("");
    const spacing = cfg.letterSpacing || 0;
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalW =
      widths.reduce((acc, w) => acc + w, 0) +
      Math.max(0, chars.length - 1) * spacing;

    let curX = cx - totalW / 2;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const w = widths[i];
      const charCenterX = curX + w / 2;
      if (cfg.strokeWidth > 0) {
        ctx.strokeText(ch, charCenterX, cy);
      }
      ctx.fillText(ch, charCenterX, cy);
      curX += w + spacing;
    }
  } else {
    const chars = text.split("");
    const spacing = (cfg.letterSpacing || 0) + 4;
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalArcLen =
      widths.reduce((acc, w) => acc + w, 0) +
      Math.max(0, chars.length - 1) * spacing;

    const curveStrength = cfg.archCurve / 100;
    const radius = Math.max(200, 620 - Math.abs(curveStrength) * 360);
    const isUpwardArch = curveStrength > 0;
    const totalAngle = totalArcLen / radius;

    let currentAngle = -totalAngle / 2;
    const arcCenterY = isUpwardArch ? cy + radius * 0.72 : cy - radius * 0.72;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const charW = widths[i];
      const halfCharAngle = charW / (2 * radius);
      currentAngle += halfCharAngle;

      ctx.save();
      if (isUpwardArch) {
        const x = cx + Math.sin(currentAngle) * radius;
        const y = arcCenterY - Math.cos(currentAngle) * radius;
        ctx.translate(x, y);
        ctx.rotate(currentAngle);
      } else {
        const x = cx + Math.sin(currentAngle) * radius;
        const y = arcCenterY + Math.cos(currentAngle) * radius;
        ctx.translate(x, y);
        ctx.rotate(-currentAngle);
      }

      if (cfg.strokeWidth > 0) {
        ctx.strokeText(ch, 0, 0);
      }
      ctx.fillText(ch, 0, 0);
      ctx.restore();

      currentAngle += halfCharAngle + spacing / radius;
    }
  }

  return canvas.toDataURL("image/png");
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16
  );
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function getFilteredLayerCanvas(
  layer: DesignLayer,
  img: HTMLImageElement
): HTMLImageElement | HTMLCanvasElement {
  if (
    !layer.removeBg &&
    !layer.invert &&
    !layer.singleColorMode &&
    !layer.tintEnabled
  ) {
    return img;
  }

  const cacheKey = [
    layer.id,
    layer.src.slice(-48),
    layer.removeBg ? `bg1-${layer.removeBgTolerance}` : "bg0",
    layer.invert ? "inv1" : "inv0",
    layer.singleColorMode
      ? `sc1-${layer.singleColorHex}-${layer.singleColorThreshold}`
      : "sc0",
    layer.tintEnabled ? `t1-${layer.tintHex}` : "t0",
  ].join("|");

  if (processedCache.has(cacheKey)) {
    return processedCache.get(cacheKey)!;
  }

  const w = Math.min(img.naturalWidth || 512, 768);
  const h = Math.min(img.naturalHeight || 512, 768);

  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return img;

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  const bgTol = (layer.removeBgTolerance ?? 35) * 1.8;

  const singleRgb = hexToRgb(layer.singleColorHex || "#ffffff");
  const tintRgb = hexToRgb(layer.tintHex || "#6366f1");
  const threshold = layer.singleColorThreshold ?? 128;

  for (let i = 0; i < data.length; i += 4) {
    let a = data[i + 3];
    if (a < 8) continue;

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (layer.removeBg) {
      const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
      if (dist < bgTol) {
        data[i + 3] = 0;
        continue;
      } else if (dist < bgTol + 24) {
        a = Math.round(a * ((dist - bgTol) / 24));
        data[i + 3] = a;
      }
    }

    if (layer.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    if (layer.singleColorMode) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum <= threshold) {
        data[i] = singleRgb.r;
        data[i + 1] = singleRgb.g;
        data[i + 2] = singleRgb.b;
        data[i + 3] = a;
      } else {
        data[i + 3] = 0;
      }
    } else if (layer.tintEnabled) {
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      data[i] = Math.round(tintRgb.r * (0.35 + 0.65 * lum));
      data[i + 1] = Math.round(tintRgb.g * (0.35 + 0.65 * lum));
      data[i + 2] = Math.round(tintRgb.b * (0.35 + 0.65 * lum));
    } else {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (processedCache.size > 80) {
    const firstKey = processedCache.keys().next().value;
    if (firstKey) processedCache.delete(firstKey);
  }
  processedCache.set(cacheKey, offscreen);
  return offscreen;
}

export function drawFabricMicroTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fabric: FabricType
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (fabric === "heavy-cotton") {
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    const step = 6;
    for (let py = y; py < y + h; py += step) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
    }
  } else if (fabric === "french-terry") {
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1.5;
    const step = 8;
    for (let py = y; py < y + h; py += step) {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
    }
  } else if (fabric === "ribbed-knit") {
    ctx.strokeStyle = "rgba(0,0,0,0.11)";
    ctx.lineWidth = 2;
    const step = 6;
    for (let px = x; px < x + w; px += step) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + h);
      ctx.stroke();
    }
  } else if (fabric === "nylon-tech") {
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    const step = 16;
    for (let px = x; px < x + w; px += step) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + h);
      ctx.stroke();
    }
    for (let py = y; py < y + h; py += step) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
    }
  } else if (fabric === "mesh") {
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    const step = 12;
    for (let py = y + 6; py < y + h; py += step) {
      for (let px = x + 6; px < x + w; px += step) {
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function applyCropPath(
  ctx: CanvasRenderingContext2D,
  drawW: number,
  drawH: number,
  crop: DesignLayer["crop"]
) {
  const left = -drawW / 2 + crop.left * drawW;
  const top = -drawH / 2 + crop.top * drawH;
  const right = drawW / 2 - crop.right * drawW;
  const bottom = drawH / 2 - crop.bottom * drawH;
  const cw = Math.max(4, right - left);
  const ch = Math.max(4, bottom - top);
  const cx = left + cw / 2;
  const cy = top + ch / 2;

  ctx.beginPath();
  if (crop.shape === "circle") {
    ctx.ellipse(cx, cy, cw / 2, ch / 2, 0, 0, Math.PI * 2);
  } else if (crop.shape === "diamond") {
    ctx.moveTo(cx, top);
    ctx.lineTo(right, cy);
    ctx.lineTo(cx, bottom);
    ctx.lineTo(left, cy);
    ctx.closePath();
  } else if (crop.shape === "arch") {
    const r = cw / 2;
    const archTop = Math.min(bottom, top + r);
    ctx.moveTo(left, bottom);
    ctx.lineTo(left, archTop);
    ctx.arc(cx, archTop, r, Math.PI, 0, false);
    ctx.lineTo(right, bottom);
    ctx.closePath();
  } else if (crop.shape === "pill") {
    const r = Math.min(cw, ch) * 0.48;
    ctx.roundRect(left, top, cw, ch, r);
  } else if (crop.shape === "hexagon") {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2;
      const hx = cx + Math.cos(angle) * (cw / 2);
      const hy = cy + Math.sin(angle) * (ch / 2);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  } else if (crop.shape === "star") {
    const spikes = 5;
    const outerR = Math.min(cw, ch) / 2;
    const innerR = outerR * 0.44;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  } else if (crop.shape === "shield") {
    ctx.moveTo(left, top + ch * 0.12);
    ctx.quadraticCurveTo(cx, top, right, top + ch * 0.12);
    ctx.lineTo(right, top + ch * 0.55);
    ctx.quadraticCurveTo(right, bottom - ch * 0.12, cx, bottom);
    ctx.quadraticCurveTo(left, bottom - ch * 0.12, left, top + ch * 0.55);
    ctx.closePath();
  } else {
    ctx.rect(left, top, cw, ch);
  }
  ctx.clip();
}

/**
 * Renders a single DesignLayer inside a panel bounding box (panelX, panelY, panelW, panelH).
 * Supports an optional skipClip flag so 2D Flat-Lay view can clip to the unified full garment silhouette.
 */
export function renderDesignLayerInPanel(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  panelX: number,
  panelY: number,
  panelW: number,
  panelH: number,
  onImageLoad?: () => void,
  skipPanelRectClip: boolean = false
) {
  if (!layer.visible) return;
  const img = loadImageElement(layer.src, onImageLoad);
  if (!img) return;

  const source = getFilteredLayerCanvas(layer, img);

  const centerX = panelX + layer.x * panelW;
  const centerY = panelY + layer.y * panelH;
  const drawW = layer.width * panelW;
  const drawH = layer.height * panelH;

  ctx.save();
  if (!skipPanelRectClip) {
    ctx.beginPath();
    ctx.rect(panelX, panelY, panelW, panelH);
    ctx.clip();
  }

  ctx.globalAlpha = layer.opacity;
  ctx.globalCompositeOperation = layer.blendMode;

  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);

  const finish = layer.printFinish || "screenprint";
  const drawSingleTile = (w: number, h: number) => {
    applyCropPath(ctx, w, h, layer.crop);
    if (finish === "puff-print") {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.58)";
      ctx.shadowBlur = Math.max(4, w * 0.025);
      ctx.shadowOffsetX = Math.max(1.5, w * 0.008);
      ctx.shadowOffsetY = Math.max(2.5, h * 0.014);
      ctx.drawImage(source, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else if (finish === "embroidery") {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(source, -w / 2, -h / 2, w, h);
      ctx.restore();

      // Subtle satin thread stitch lines over the graphic
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1;
      const step = 3.5;
      for (let sy = -h / 2; sy <= h / 2; sy += step) {
        ctx.beginPath();
        ctx.moveTo(-w / 2, sy);
        ctx.lineTo(w / 2, sy + 1.5);
        ctx.stroke();
      }
      ctx.restore();
    } else if (finish === "vintage-cracked") {
      ctx.save();
      ctx.globalAlpha = layer.opacity * 0.84;
      ctx.drawImage(source, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(source, -w / 2, -h / 2, w, h);
    }
  };

  const mp = layer.multiplyPattern;
  if (mp && mp.enabled && (mp.cols > 1 || mp.rows > 1)) {
    const cols = Math.max(1, Math.min(16, mp.cols));
    const rows = Math.max(1, Math.min(16, mp.rows));
    const isAllOver = mp.allOver !== false;

    // When user increases columns/rows past what fits at base size, scale tiles slightly so higher counts pack more pattern across the garment
    const maxStepSpanX = cols * drawW * (1 + mp.gapX);
    const maxStepSpanY = rows * drawH * (1 + mp.gapY);
    const fitScaleX =
      maxStepSpanX > panelW * 1.18 ? (panelW * 1.18) / maxStepSpanX : 1;
    const fitScaleY =
      maxStepSpanY > panelH * 1.18 ? (panelH * 1.18) / maxStepSpanY : 1;
    const fitScale = Math.min(fitScaleX, fitScaleY);

    const tileW = drawW * fitScale;
    const tileH = drawH * fitScale;
    const stepX = Math.max(6, tileW * (1 + mp.gapX));
    const stepY = Math.max(6, tileH * (1 + mp.gapY));

    // When Whole-Shirt All-Over mode is active (or cols/rows >= 4), extend the tiling grid so it covers the entire panel edge-to-edge without any blank cutoffs
    const fullCoverCols =
      isAllOver && cols >= 4
        ? Math.max(cols, Math.ceil((panelW * 1.8) / stepX) + 2)
        : cols;
    const fullCoverRows =
      isAllOver && rows >= 4
        ? Math.max(rows, Math.ceil((panelH * 1.8) / stepY) + 2)
        : rows;

    const totalW = (fullCoverCols - 1) * stepX;
    const totalH = (fullCoverRows - 1) * stepY;

    for (let r = 0; r < fullCoverRows; r++) {
      for (let c = 0; c < fullCoverCols; c++) {
        const staggerOffset = mp.stagger && r % 2 === 1 ? stepX * 0.5 : 0;
        const ox = -totalW / 2 + c * stepX + staggerOffset;
        const oy = -totalH / 2 + r * stepY;

        ctx.save();
        ctx.translate(ox, oy);
        drawSingleTile(tileW, tileH);
        ctx.restore();
      }
    }
  } else {
    ctx.save();
    drawSingleTile(drawW, drawH);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Computes the effective horizontal & vertical span of a layer (accounting for Multiply Pattern tiling)
 */
function getEffectiveLayerSpan(layer: DesignLayer): {
  spanW: number;
  spanH: number;
} {
  const mp = layer.multiplyPattern;
  if (mp && mp.enabled && (mp.cols > 1 || mp.rows > 1)) {
    const stepX = layer.width * (1 + mp.gapX);
    const stepY = layer.height * (1 + mp.gapY);
    return {
      spanW: (mp.cols - 1) * stepX + layer.width * 1.2,
      spanH: (mp.rows - 1) * stepY + layer.height * 1.2,
    };
  }
  return { spanW: layer.width, spanH: layer.height };
}

/**
 * Returns all virtual/wrapped instances of `layers` that should be drawn on `targetPanel`.
 * - Main Body (Front <-> Back) is a connected fabric cylinder, so both single graphics and multiplied patterns on Front or Back wrap 360° across Front + Back, and NEVER bleed onto sleeves, collar, or hood.
 * - Each Sleeve / Collar / Hood is its own separate piece of fabric, so graphics and patterns placed on a sleeve or collar cover only that fabric piece.
 */
export function getWrappedLayersForPanel(
  layers: DesignLayer[],
  targetPanel: GarmentPanelId
): DesignLayer[] {
  const result: DesignLayer[] = [];

  for (const layer of layers) {
    if (!layer.visible) continue;
    const wrap = layer.wrapAround !== false; // Default ON
    const mp = layer.multiplyPattern;
    const isPatternWrap =
      Boolean(mp && mp.enabled && (mp.cols > 1 || mp.rows > 1)) &&
      mp?.allOver !== false;

    // 1. MULTIPLIED PATTERN: Covers only the connected fabric piece it is placed on (Front <-> Back for torso; individual cylinder for Sleeve or Collar)
    if (isPatternWrap) {
      if (layer.panel === targetPanel) {
        result.push(layer);
      } else if (
        wrap &&
        ((layer.panel === "front" && targetPanel === "back") ||
          (layer.panel === "back" && targetPanel === "front"))
      ) {
        const minCoverCols = Math.max(mp.cols, 6);
        const minCoverRows = Math.max(mp.rows, 6);

        result.push({
          ...layer,
          id: `${layer.id}-torso-pattern-${targetPanel}`,
          panel: targetPanel,
          x: 1 - layer.x,
          y: layer.y,
          multiplyPattern: {
            ...mp,
            cols: mp.cols >= 4 ? minCoverCols : mp.cols,
            rows: mp.rows >= 4 ? minCoverRows : mp.rows,
          },
        });
      }
      continue;
    }

    // 2. Native panel render for single graphic (or single-panel grid)
    if (layer.panel === targetPanel) {
      result.push(layer);

      if (wrap) {
        if (
          targetPanel === "leftSleeve" ||
          targetPanel === "rightSleeve" ||
          targetPanel === "collar"
        ) {
          // Sleeves & collar are cylindrical tubes in 3D (u=0 meets u=1), so wrap around their own seam at +-1
          result.push({ ...layer, id: `${layer.id}-cyl-l`, x: layer.x - 1 });
          result.push({ ...layer, id: `${layer.id}-cyl-r`, x: layer.x + 1 });
        } else {
          // Full 360 torso wrap back onto itself at +-2
          result.push({ ...layer, id: `${layer.id}-360-l`, x: layer.x - 2 });
          result.push({ ...layer, id: `${layer.id}-360-r`, x: layer.x + 2 });
        }
      }
      continue;
    }

    if (!wrap) continue;

    const { spanW } = getEffectiveLayerSpan(layer);
    const minX = layer.x - spanW / 2;
    const maxX = layer.x + spanW / 2;

    // 3. FRONT <-> BACK 360° Torso Side-Seam Continuity ONLY
    // Sleeves and Collar are separate fabric pieces, so single torso designs never bleed onto them.
    if (
      (layer.panel === "front" && targetPanel === "back") ||
      (layer.panel === "back" && targetPanel === "front")
    ) {
      // Overflow past right side seam (x > 1.0) wraps onto opposite torso panel at x - 1.0
      if (maxX > 0.96) {
        result.push({
          ...layer,
          id: `${layer.id}-wrap-right`,
          panel: targetPanel,
          x: layer.x - 1.0,
        });
      }
      // Overflow past left side seam (x < 0.0) wraps onto opposite torso panel at x + 1.0
      if (minX < 0.04) {
        result.push({
          ...layer,
          id: `${layer.id}-wrap-left`,
          panel: targetPanel,
          x: layer.x + 1.0,
        });
      }
    }
  }

  return result;
}

export function drawGarmentStructuralDetails(
  ctx: CanvasRenderingContext2D,
  garment: GarmentState,
  panelId: GarmentPanelId,
  px: number,
  py: number,
  pw: number,
  ph: number
) {
  if (!garment.showSeams) return;
  ctx.save();
  ctx.strokeStyle = garment.stitchColor;

  if (garment.garmentType === "hoodie" && panelId === "front") {
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    const pTop = py + ph * 0.62;
    const pBot = py + ph * 0.9;
    const pLeft = px + pw * 0.18;
    const pRight = px + pw * 0.82;
    ctx.beginPath();
    ctx.moveTo(pLeft, pBot);
    ctx.lineTo(pLeft + pw * 0.08, pTop);
    ctx.lineTo(pRight - pw * 0.08, pTop);
    ctx.lineTo(pRight, pBot);
    ctx.closePath();
    ctx.stroke();
  } else if (garment.garmentType === "jacket") {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    const baffles = 5;
    for (let i = 1; i < baffles; i++) {
      const by = py + (ph * i) / baffles;
      ctx.beginPath();
      ctx.moveTo(px, by);
      ctx.lineTo(px + pw, by);
      ctx.stroke();
    }
    if (panelId === "front") {
      ctx.strokeStyle = garment.stitchColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px + pw / 2, py);
      ctx.lineTo(px + pw / 2, py + ph);
      ctx.stroke();
    }
  } else if (
    (garment.garmentType === "pants" || garment.garmentType === "shorts") &&
    (panelId === "front" || panelId === "back")
  ) {
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(px + pw / 2, py + ph * 0.06);
    ctx.lineTo(px + pw / 2, py + ph * 0.36);
    ctx.stroke();
  }

  ctx.restore();
}

export function renderMasterUVTexture(
  canvas: HTMLCanvasElement,
  garment: GarmentState,
  layers: DesignLayer[],
  onImageLoad?: () => void
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = garment.panelColors.front;
  ctx.fillRect(0, 0, W, H);

  (Object.keys(PANEL_UV_MAP) as GarmentPanelId[]).forEach((panelId) => {
    const uv = PANEL_UV_MAP[panelId];
    const px = uv.uMin * W;
    const py = uv.vMin * H;
    const pw = (uv.uMax - uv.uMin) * W;
    const ph = (uv.vMax - uv.vMin) * H;

    // 1. Panel Dye Color
    ctx.fillStyle = garment.panelColors[panelId];
    ctx.fillRect(px, py, pw, ph);

    // 2. Fabric Weave Micro-Texture
    drawFabricMicroTexture(ctx, px, py, pw, ph, garment.fabric);

    // 3. Render Native + 360°-Wrapped Design Layers for this panel
    const wrappedLayers = getWrappedLayersForPanel(layers, panelId);
    for (const layer of wrappedLayers) {
      renderDesignLayerInPanel(ctx, layer, px, py, pw, ph, onImageLoad, false);
    }

    // 4. Garment-Specific Structural Seams
    drawGarmentStructuralDetails(ctx, garment, panelId, px, py, pw, ph);

    // 5. Subtle Seam Top-Stitching right on the boundary (0 inset so graphics never look artificially cut off inside the panel)
    if (garment.showSeams) {
      ctx.save();
      ctx.strokeStyle = garment.stitchColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.restore();
    }
  });
}

/**
 * Generates a high-resolution Production Tech Pack Spec Sheet PNG DataURL containing:
 * - Garment Catalog Title, Fabric Spec, Fit Tailoring Measurements & Date
 * - Full Cut-and-Sew 2048x2048 UV Pattern Map Preview
 * - Panel Dye Color Swatches + Stitch Thread Callout
 * - Layer-by-Layer Print & Ink Specification Table (Finish, Stencil/Hex, Placement, Size)
 */
export function renderTechPackSpecSheet(
  garment: GarmentState,
  layers: DesignLayer[],
  masterCanvas: HTMLCanvasElement
): string {
  const sheet = document.createElement("canvas");
  sheet.width = 2400;
  sheet.height = 1600;
  const ctx = sheet.getContext("2d");
  if (!ctx) return "";

  const catalog = GARMENT_CATALOG[garment.garmentType];
  const fit = garment.fit || DEFAULT_GARMENT_FIT;

  // Dark blueprint background
  ctx.fillStyle = "#0b0e14";
  ctx.fillRect(0, 0, sheet.width, sheet.height);

  // Outer technical border
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, sheet.width - 64, sheet.height - 64);

  // Header Block
  ctx.fillStyle = "#111622";
  ctx.fillRect(34, 34, sheet.width - 68, 130);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, 164);
  ctx.lineTo(sheet.width - 34, 164);
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 36px Inter, system-ui, sans-serif";
  ctx.fillText("GURUSHIRT // PRODUCTION TECH PACK SPEC SHEET", 68, 92);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.fillText(
    `GARMENT: ${catalog.name.toUpperCase()}   |   FABRIC: ${garment.fabric.toUpperCase()}   |   DATE: ${new Date().toLocaleDateString()}`,
    68,
    134
  );

  // Left Column: Cut & Sew Pattern Map (1320 x 1320)
  const mapX = 68;
  const mapY = 200;
  const mapSize = 1320;
  ctx.fillStyle = "#080a0f";
  ctx.fillRect(mapX, mapY, mapSize, mapSize);
  ctx.drawImage(masterCanvas, mapX, mapY, mapSize, mapSize);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(mapX, mapY, mapSize, mapSize);

  // Panel Labels overlaid on UV map
  (Object.keys(PANEL_UV_MAP) as GarmentPanelId[]).forEach((pid) => {
    const uv = PANEL_UV_MAP[pid];
    const lx = mapX + uv.uMin * mapSize + 14;
    const ly = mapY + uv.vMin * mapSize + 28;
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.fillRect(lx - 8, ly - 20, 210, 28);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 15px Inter, system-ui, sans-serif";
    ctx.fillText(
      `${catalog.panelLabels[pid].label.toUpperCase()} (${garment.panelColors[pid].toUpperCase()})`,
      lx,
      ly
    );
  });

  // Right Column: Specifications (x = 1430 .. 2330)
  const rx = 1430;
  let ry = 225;

  // Section 1: 3D Tailoring & Fit Measurements
  ctx.fillStyle = "#818cf8";
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  ctx.fillText("1. 3D CUT & SEW TAILORING PROFILE", rx, ry);
  ry += 38;

  const fitSpecs = [
    `Body Width / Boxiness: ${Math.round(fit.bodyWidth * 100)}% (${
      fit.bodyWidth > 1.06 ? "Boxy Oversized" : fit.bodyWidth < 0.94 ? "Slim Fit" : "Standard Fit"
    })`,
    `Garment Length / Drop: ${Math.round(fit.bodyLength * 100)}% (${
      fit.bodyLength < 0.93 ? "Cropped" : fit.bodyLength > 1.06 ? "Longline" : "Regular Length"
    })`,
    `Sleeve Cut & Extension: ${Math.round(fit.sleeveLength * 100)}%`,
    `Collar / Rib Weight: ${Math.round(fit.collarWeight * 100)}%`,
    `Fabric Drape & Tension: ${Math.round(fit.drapeFolds * 100)}%`,
    `3D Model Source: ${garment.customGlbName || `public/models/${garment.garmentType}.glb`}`,
  ];

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "500 18px Inter, system-ui, sans-serif";
  for (const line of fitSpecs) {
    ctx.fillText(`•  ${line}`, rx, ry);
    ry += 32;
  }

  ry += 28;
  // Section 2: Panel Dye & Stitch Swatches
  ctx.fillStyle = "#818cf8";
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  ctx.fillText("2. CUT & SEW PANEL DYE SWATCHES", rx, ry);
  ry += 36;

  (Object.keys(PANEL_UV_MAP) as GarmentPanelId[]).forEach((pid) => {
    const hex = garment.panelColors[pid];
    ctx.fillStyle = hex;
    ctx.fillRect(rx, ry - 20, 32, 24);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry - 20, 32, 24);

    ctx.fillStyle = "#f1f5f9";
    ctx.font = "600 17px Inter, system-ui, sans-serif";
    ctx.fillText(
      `${catalog.panelLabels[pid].label}: ${hex.toUpperCase()}`,
      rx + 46,
      ry - 2
    );
    ry += 34;
  });

  // Stitch Thread Callout
  ctx.fillStyle = garment.stitchColor;
  ctx.fillRect(rx, ry - 20, 32, 24);
  ctx.strokeStyle = "#cbd5e1";
  ctx.strokeRect(rx, ry - 20, 32, 24);
  ctx.fillStyle = "#f1f5f9";
  ctx.fillText(
    `Seam Top-Stitch Thread: ${garment.stitchColor.toUpperCase()} (${
      garment.showSeams ? "Visible" : "Hidden"
    })`,
    rx + 46,
    ry - 2
  );
  ry += 56;

  // Section 3: Graphic & Ink Layers Breakdown
  ctx.fillStyle = "#818cf8";
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  ctx.fillText(`3. GRAPHIC & INK LAYERS (${layers.length})`, rx, ry);
  ry += 38;

  if (layers.length === 0) {
    ctx.fillStyle = "#64748b";
    ctx.font = "500 17px Inter, system-ui, sans-serif";
    ctx.fillText("Blank garment (no active graphic layers).", rx, ry);
  } else {
    layers.slice(0, 10).forEach((layer, idx) => {
      ctx.fillStyle = "#161d2a";
      ctx.fillRect(rx, ry - 24, 880, 74);
      ctx.strokeStyle = "#2dd4bf44";
      ctx.strokeRect(rx, ry - 24, 880, 74);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 17px Inter, system-ui, sans-serif";
      const finishLabel = (layer.printFinish || "screenprint").toUpperCase();
      const panelLabel = catalog.panelLabels[layer.panel].shortLabel.toUpperCase();
      ctx.fillText(
        `#${idx + 1}  ${layer.name}  [${panelLabel}]  —  FINISH: ${finishLabel}`,
        rx + 16,
        ry + 2
      );

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 15px Inter, system-ui, sans-serif";
      const patternInfo = layer.multiplyPattern?.enabled
        ? `Pattern ${layer.multiplyPattern.cols}×${layer.multiplyPattern.rows}`
        : `Single (${Math.round(layer.width * 100)}% × ${Math.round(layer.height * 100)}%)`;
      const inkInfo = layer.singleColorMode
        ? `1-Color Stencil (${layer.singleColorHex.toUpperCase()})`
        : layer.tintEnabled
        ? `Tint (${layer.tintHex.toUpperCase()})`
        : "Full Color";
      ctx.fillText(
        `Scale: ${patternInfo}   |   Ink: ${inkInfo}   |   Crop: ${layer.crop.shape.toUpperCase()}   |   Rot: ${Math.round(layer.rotation)}°`,
        rx + 16,
        ry + 32
      );
      ry += 86;
    });
  }

  return sheet.toDataURL("image/png");
}
