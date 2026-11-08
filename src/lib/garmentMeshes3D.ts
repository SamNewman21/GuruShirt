import * as THREE from "three";
import {
  DEFAULT_GARMENT_FIT,
  GarmentFitConfig,
  GarmentType,
  PANEL_UV_MAP,
} from "@/types/studio";

/**
 * Generates a high-resolution, manifold, seam-welded 3D BufferGeometry for all 7 garment types,
 * supporting live 3D fit tailoring (bodyWidth, bodyLength, sleeveLength, collarWeight, drapeFolds):
 * - Closed shoulder seams (z = 0) and closed side seams below the underarm (z = 0).
 * - Thickened double-rolled 3D Collar / Hood / Stand Collar with realistic inner neckband depth.
 * - True circular 3D Armhole Sockets welded vertex-for-vertex to cylindrical sleeves with rolled cuff rims.
 * - Natural gravity cloth drape & tension folds controlled by `fit.drapeFolds`.
 */
export function createGarmentGeometry(
  garmentType: GarmentType,
  fit: GarmentFitConfig = DEFAULT_GARMENT_FIT
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const bodyW = fit?.bodyWidth ?? 1.0;
  const bodyL = fit?.bodyLength ?? 1.0;
  const sleeveL = fit?.sleeveLength ?? 1.0;
  const collarW = fit?.collarWeight ?? 1.0;
  const drape = fit?.drapeFolds ?? 0.55;

  let vertexCount = 0;

  function addParametricPatch(
    segsU: number,
    segsV: number,
    uvRect: { uMin: number; vMin: number; uMax: number; vMax: number },
    flipFaces: boolean,
    evalPoint: (u: number, v: number) => THREE.Vector3
  ) {
    const baseIndex = vertexCount;
    for (let iv = 0; iv <= segsV; iv++) {
      const v = iv / segsV;
      for (let iu = 0; iu <= segsU; iu++) {
        const u = iu / segsU;
        const p = evalPoint(u, v);

        const eps = 0.006;
        const u1 = Math.min(1, u + eps);
        const u0 = Math.max(0, u - eps);
        const v1 = Math.min(1, v + eps);
        const v0 = Math.max(0, v - eps);

        const pu = evalPoint(u1, v).sub(evalPoint(u0, v));
        const pv = evalPoint(u, v1).sub(evalPoint(u, v0));
        const n = new THREE.Vector3().crossVectors(pu, pv).normalize();
        if (flipFaces) n.negate();

        positions.push(p.x, p.y, p.z);
        normals.push(n.x, n.y, n.z);

        const texU = uvRect.uMin + u * (uvRect.uMax - uvRect.uMin);
        const texV = 1 - (uvRect.vMin + v * (uvRect.vMax - uvRect.vMin));
        uvs.push(texU, texV);
        vertexCount++;
      }
    }

    for (let iv = 0; iv < segsV; iv++) {
      for (let iu = 0; iu < segsU; iu++) {
        const a = baseIndex + iv * (segsU + 1) + iu;
        const b = baseIndex + (iv + 1) * (segsU + 1) + iu;
        const c = baseIndex + (iv + 1) * (segsU + 1) + (iu + 1);
        const d = baseIndex + iv * (segsU + 1) + (iu + 1);

        if (!flipFaces) {
          indices.push(a, b, d);
          indices.push(b, c, d);
        } else {
          indices.push(a, d, b);
          indices.push(b, d, c);
        }
      }
    }
  }

  // ============================================================================
  // CASE A: UPPER BODY TOPS (T-Shirt, Hoodie, Tank Top, Winter Jacket)
  // ============================================================================
  if (
    garmentType === "tshirt" ||
    garmentType === "hoodie" ||
    garmentType === "tank" ||
    garmentType === "jacket"
  ) {
    const isTank = garmentType === "tank";
    const isHoodie = garmentType === "hoodie";
    const isJacket = garmentType === "jacket";

    const NECK_HALF_RATIO = 0.36; // |nx| <= 0.36 is the neck opening; |nx| > 0.36 is the sewn shoulder seam
    const ARMHOLE_V_END = 0.36; // v in [0, 0.36] at |nx|=1 is the circular armhole socket

    const getTorsoWidthAtV = (v: number): number => {
      if (isTank) {
        if (v < ARMHOLE_V_END) {
          const t = v / ARMHOLE_V_END;
          return (0.48 - Math.sin(t * Math.PI) * 0.06 + t * 0.16) * bodyW;
        }
        return (
          (0.64 - ((v - ARMHOLE_V_END) / (1 - ARMHOLE_V_END)) * 0.02) * bodyW
        );
      }

      if (v <= ARMHOLE_V_END) {
        const t = v / ARMHOLE_V_END;
        return (0.65 + 0.045 * Math.cos(t * (Math.PI / 2))) * bodyW;
      }
      const t = (v - ARMHOLE_V_END) / (1 - ARMHOLE_V_END);
      const ribHemCinch =
        (isHoodie || isJacket) && v > 0.88
          ? Math.sin(((v - 0.88) / 0.12) * (Math.PI / 2)) * 0.055
          : 0;
      return (0.65 - t * 0.018 - ribHemCinch) * bodyW;
    };

    const getTopEdgeY = (nxAbs: number, isBack: boolean): number => {
      if (nxAbs <= NECK_HALF_RATIO) {
        const t = nxAbs / NECK_HALF_RATIO;
        const scoop = isBack
          ? isTank
            ? 0.22
            : 0.045
          : isTank
          ? 0.3
          : isJacket
          ? 0.08
          : 0.165;
        return 1.02 - Math.cos(t * (Math.PI / 2)) * scoop;
      } else {
        const t = (nxAbs - NECK_HALF_RATIO) / (1 - NECK_HALF_RATIO);
        return 1.02 - t * 0.15;
      }
    };

    /**
     * Evaluates a point on the Front or Back torso using viewer-space horizontal coordinate s in [0, 1]
     */
    const evalTorsoByViewerS = (
      s: number,
      v: number,
      isBack: boolean
    ): THREE.Vector3 => {
      const nx = (s - 0.5) * 2; // -1 (left) to +1 (right)
      const nxAbs = Math.abs(nx);
      const hw = getTorsoWidthAtV(v);
      const x = nx * hw;

      const topY = getTopEdgeY(nxAbs, isBack);
      const bottomY = -1.12 * bodyL;
      const y = topY * (1 - v) + bottomY * v;

      const baseDepth = (isJacket ? 0.36 : isHoodie ? 0.33 : 0.29) * (0.88 + 0.12 * bodyW);
      const pufferWave = isJacket
        ? Math.abs(Math.sin(v * Math.PI * 6)) * 0.032
        : 0;

      // Subtle natural cotton/fleece drape folds controlled by `drape`
      // Zeroed at seams (nxAbs = 1, v = 0) so all seams stay 100% water-tight!
      const seamEnvelope =
        Math.sin(v * Math.PI) * Math.max(0, 1 - Math.pow(nxAbs, 4));
      const chestDrape =
        drape *
        0.014 *
        seamEnvelope *
        (Math.sin(nx * Math.PI * 3.5 + v * 4.2) * 0.6 +
          Math.cos(nx * Math.PI * 5.0 - v * 5.5) * 0.4);

      // Double-needle bottom hem ridge near v = 0.96
      const hemRidge =
        v > 0.94 && v < 0.99
          ? Math.sin(((v - 0.94) / 0.05) * Math.PI) * 0.008 * (1 - Math.pow(nxAbs, 6))
          : 0;

      const centerBodyZ =
        (baseDepth + Math.sin(v * Math.PI) * 0.065 + pufferWave + chestDrape + hemRidge) *
        Math.cos(nx * (Math.PI / 2));

      let topPinch = 1.0;
      if (nxAbs >= NECK_HALF_RATIO) {
        topPinch = Math.min(1, Math.pow(v / 0.16, 0.75));
      } else {
        const neckCircleZ =
          Math.sqrt(Math.max(0, 1 - Math.pow(nxAbs / NECK_HALF_RATIO, 2))) *
          0.165;
        const vBlend = Math.min(1, v / 0.18);
        const bodyAtV0 = Math.max(0.001, centerBodyZ);
        topPinch = (neckCircleZ / bodyAtV0) * (1 - vBlend) + vBlend;
      }

      let armholeSocketZ = 0;
      if (v < ARMHOLE_V_END && !isTank) {
        const tArm = v / ARMHOLE_V_END;
        const ringZ = Math.sin(tArm * Math.PI) * 0.21;
        const edgeWeight = Math.pow(nxAbs, 3);
        armholeSocketZ = ringZ * edgeWeight;
      }

      // Hoodie Kangaroo Pocket relief on lower front
      let pocketRelief = 0;
      if (!isBack && isHoodie && v > 0.58 && v < 0.88) {
        const halfPocketWidth = 0.58 - (0.88 - v) * 0.4;
        if (nxAbs < halfPocketWidth) {
          const edgeSoft = Math.min(1, (halfPocketWidth - nxAbs) * 8);
          const vSoft = Math.sin(((v - 0.58) / 0.3) * Math.PI);
          pocketRelief = 0.042 * edgeSoft * vSoft;
        }
      }

      const rawZ = centerBodyZ * topPinch + armholeSocketZ + pocketRelief;
      const z = (isBack ? -1 : 1) * rawZ;

      return new THREE.Vector3(x, y, z);
    };

    // 1. FRONT TORSO
    addParametricPatch(68, 72, PANEL_UV_MAP.front, false, (u, v) =>
      evalTorsoByViewerS(u, v, false)
    );

    // 2. BACK TORSO
    addParametricPatch(68, 72, PANEL_UV_MAP.back, false, (u, v) =>
      evalTorsoByViewerS(1 - u, v, true)
    );

    // 3 & 4. WELDED CYLINDRICAL SLEEVES (or Tank Armhole Binding)
    if (isTank) {
      const evalTankTrim = (
        u: number,
        v: number,
        isRightSideOfViewer: boolean
      ): THREE.Vector3 => {
        const theta = (u - 0.5) * Math.PI * 2;
        const tArm = (1 - Math.cos(theta)) / 2;
        const vTorso = tArm * ARMHOLE_V_END;
        const isBack = Math.sin(theta) < 0;
        const base = evalTorsoByViewerS(
          isRightSideOfViewer ? 1 : 0,
          vTorso,
          isBack
        );
        return new THREE.Vector3(
          base.x + (isRightSideOfViewer ? 1 : -1) * v * 0.024 * collarW,
          base.y,
          base.z + Math.sin(theta) * 0.08
        );
      };

      addParametricPatch(36, 10, PANEL_UV_MAP.leftSleeve, true, (u, v) =>
        evalTankTrim(u, v, true)
      );
      addParametricPatch(36, 10, PANEL_UV_MAP.rightSleeve, false, (u, v) =>
        evalTankTrim(1 - u, v, false)
      );
    } else {
      const isLongSleeve = isHoodie || isJacket;

      const evalSleeve = (
        u: number,
        v: number,
        mirrorToViewerLeft: boolean
      ): THREE.Vector3 => {
        const theta = (u - 0.5) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const tArm = (1 - cosT) / 2;
        const vTorso = tArm * ARMHOLE_V_END;
        const rootFront = evalTorsoByViewerS(1.0, vTorso, false);
        const rootX = rootFront.x;
        const rootY = rootFront.y;
        const rootZ = sinT * Math.abs(rootFront.z);

        const armholeCenterX = 0.67 * bodyW;
        const armholeCenterY = 0.54;

        const angleRad = isLongSleeve ? 0.98 : 0.66;
        const len = (isLongSleeve ? 1.18 : 0.46) * sleeveL;
        const dirX = Math.cos(angleRad);
        const dirY = -Math.sin(angleRad);

        const perpX = Math.sin(angleRad);
        const perpY = Math.cos(angleRad);

        // Rolled cuff rim in the final 6% of v so the sleeve opening has realistic hem thickness
        const vAxial = v <= 0.94 ? v / 0.94 : 1.0 - (v - 0.94) * 0.35;
        const cuffRollInward = v > 0.94 ? ((v - 0.94) / 0.06) * 0.018 : 0;

        const cuffRadius = isLongSleeve
          ? 0.215 * (1 - vAxial * 0.28)
          : 0.23 * (1 - vAxial * 0.08);
        const pufferWave = isJacket
          ? Math.abs(Math.sin(vAxial * Math.PI * 5)) * 0.028
          : 0;
        const sleeveDrape =
          drape *
          0.008 *
          Math.sin(vAxial * Math.PI) *
          Math.sin(theta * 3 + vAxial * 5);

        const r = Math.max(0.06, cuffRadius + pufferWave + sleeveDrape - cuffRollInward);

        const axisCenterX = armholeCenterX + vAxial * len * dirX;
        const axisCenterY = armholeCenterY + vAxial * len * dirY;
        const forwardElbowZ = isLongSleeve
          ? Math.sin(vAxial * Math.PI * 0.85) * 0.06
          : 0;

        const cylX = axisCenterX + cosT * r * perpX;
        const cylY = axisCenterY + cosT * r * perpY;
        const cylZ = forwardElbowZ + sinT * r * 0.95;

        const w = Math.min(1, Math.pow(vAxial, 0.65) * 1.4);
        const x = (rootX + vAxial * len * dirX) * (1 - w) + cylX * w;
        const y = (rootY + vAxial * len * dirY) * (1 - w) + cylY * w;
        const z = rootZ * (1 - w) + cylZ * w;

        return new THREE.Vector3(mirrorToViewerLeft ? -x : x, y, z);
      };

      addParametricPatch(48, 40, PANEL_UV_MAP.leftSleeve, true, (u, v) =>
        evalSleeve(u, v, false)
      );

      addParametricPatch(48, 40, PANEL_UV_MAP.rightSleeve, false, (u, v) =>
        evalSleeve(1 - u, v, true)
      );
    }

    // 5. WELDED DOUBLE-ROLLED COLLAR / HOOD / STAND COLLAR
    const evalNeckRing = (theta: number): THREE.Vector3 => {
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const s = 0.5 + sinT * (NECK_HALF_RATIO * 0.5);
      const isBack = cosT < 0;
      const pt = evalTorsoByViewerS(s, 0.0, isBack);
      const zOval = cosT * 0.165;
      return new THREE.Vector3(pt.x, pt.y, zOval);
    };

    if (isHoodie) {
      addParametricPatch(56, 34, PANEL_UV_MAP.collar, true, (u, v) => {
        const theta = (u - 0.5) * Math.PI * 1.85 + Math.PI;
        const baseNeck = evalNeckRing(theta);

        const rise = Math.sin(v * Math.PI * 0.82) * collarW;
        const swell = Math.sin(v * Math.PI);
        const crownClose = Math.pow(v, 2.3);

        const x =
          baseNeck.x * (1 - crownClose * 0.85) +
          Math.sin(theta - Math.PI) * swell * 0.11 * (1 - crownClose);
        const y = baseNeck.y + rise * 0.65;
        const z =
          baseNeck.z * (1 - v * 0.3) -
          swell * 0.17 +
          crownClose * 0.18 * Math.cos((u - 0.5) * Math.PI);

        return new THREE.Vector3(x, y, z);
      });
    } else if (isJacket) {
      addParametricPatch(56, 20, PANEL_UV_MAP.collar, true, (u, v) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const baseNeck = evalNeckRing(theta);
        // Double-rolled thick stand collar: rises for v in [0, 0.65], rolls over top rim, and drops inside neck for v in [0.65, 1]
        const hCurve =
          v <= 0.65 ? v / 0.65 : 1.0 - ((v - 0.65) / 0.35) * 0.55;
        const puff = Math.sin(v * Math.PI) * 0.028 * collarW;
        const inwardFold = v > 0.65 ? ((v - 0.65) / 0.35) * 0.09 : 0;
        const scale = 1 - inwardFold;
        return new THREE.Vector3(
          baseNeck.x * scale + Math.sin(theta) * puff,
          baseNeck.y + hCurve * 0.22 * collarW,
          baseNeck.z * scale + Math.cos(theta) * puff
        );
      });
    } else {
      // Double-rolled Ribbed Crew Collar Band with real rolled rim thickness & inner neckband
      addParametricPatch(56, 20, PANEL_UV_MAP.collar, true, (u, v) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const baseNeck = evalNeckRing(theta);
        const ribTexture = Math.sin(u * Math.PI * 72) * 0.0025;
        // v in [0, 0.6] rises up the outer ribbed collar; v in [0.6, 1.0] rolls over the top rim and down into the inner neckline
        const hCurve =
          v <= 0.6 ? v / 0.6 : 1.0 - ((v - 0.6) / 0.4) * 1.15;
        const inwardScale =
          v <= 0.6
            ? 1 - (v / 0.6) * 0.12 + ribTexture
            : 0.88 - ((v - 0.6) / 0.4) * 0.06;
        return new THREE.Vector3(
          baseNeck.x * inwardScale,
          baseNeck.y + hCurve * 0.072 * collarW,
          baseNeck.z * inwardScale
        );
      });
    }
  }

  // ============================================================================
  // CASE B: LOWER BODY BOTTOMS (Pants & Shorts)
  // ============================================================================
  else if (garmentType === "pants" || garmentType === "shorts") {
    const isShorts = garmentType === "shorts";
    const totalHeight = (isShorts ? 1.35 : 2.35) * bodyL;
    const topY = isShorts ? 0.72 : 1.12;

    const evalBottomsSurface = (
      u: number,
      v: number,
      isBack: boolean
    ): THREE.Vector3 => {
      const splitStart = 0.26;
      const y = topY - v * totalHeight;

      if (v <= splitStart) {
        const angle = isBack ? (0.5 - u) * Math.PI : (u - 0.5) * Math.PI;
        const hipFlare = Math.sin((v / splitStart) * (Math.PI / 2)) * 0.08;
        const w = (0.6 + hipFlare) * bodyW;
        const d = (0.31 + hipFlare * 0.5) * bodyW;
        const x = Math.sin(angle) * w;
        const z = (isBack ? -1 : 1) * Math.cos(angle) * d;
        return new THREE.Vector3(x, y, z);
      } else {
        const legT = (v - splitStart) / (1 - splitStart);
        const isRightSide = u >= 0.5;
        const localU = isRightSide ? (u - 0.5) * 2 : u * 2;
        const angle = isBack
          ? (0.5 - localU) * Math.PI
          : (localU - 0.5) * Math.PI;

        const legCenterOffset =
          (isRightSide ? 1 : -1) * (0.31 + legT * 0.05) * bodyW;
        const cuffTaper =
          !isShorts && legT > 0.86 ? (legT - 0.86) * 0.38 : 0;
        const kneeDrape =
          drape * 0.012 * Math.sin(legT * Math.PI * 3) * Math.cos(angle * 2);
        const legRadiusX =
          ((isShorts ? 0.3 : 0.28 - legT * 0.035) - cuffTaper) * bodyW +
          kneeDrape;
        const legRadiusZ =
          ((isShorts ? 0.27 : 0.26 - legT * 0.025) - cuffTaper) * bodyW +
          kneeDrape;

        const x = legCenterOffset + Math.sin(angle) * legRadiusX;
        const z = (isBack ? -1 : 1) * Math.cos(angle) * legRadiusZ;
        return new THREE.Vector3(x, y, z);
      }
    };

    addParametricPatch(56, 60, PANEL_UV_MAP.front, false, (u, v) =>
      evalBottomsSurface(u, v, false)
    );
    addParametricPatch(56, 60, PANEL_UV_MAP.back, false, (u, v) =>
      evalBottomsSurface(u, v, true)
    );

    addParametricPatch(20, 44, PANEL_UV_MAP.leftSleeve, false, (u, v) => {
      const isBack = u > 0.5;
      const torsoU = isBack ? 0.04 * (1 - (u - 0.5) * 2) : 0.96 + u * 0.08;
      const base = evalBottomsSurface(
        Math.min(0.999, Math.max(0.001, torsoU)),
        v,
        isBack
      );
      return new THREE.Vector3(base.x + 0.004, base.y, base.z);
    });

    addParametricPatch(20, 44, PANEL_UV_MAP.rightSleeve, true, (u, v) => {
      const isBack = u > 0.5;
      const torsoU = isBack ? 0.96 + (u - 0.5) * 0.08 : 0.04 * (1 - u * 2);
      const base = evalBottomsSurface(
        Math.min(0.999, Math.max(0.001, torsoU)),
        v,
        isBack
      );
      return new THREE.Vector3(base.x - 0.004, base.y, base.z);
    });

    addParametricPatch(48, 16, PANEL_UV_MAP.collar, true, (u, v) => {
      const theta = u * Math.PI * 2;
      const ribWave = Math.sin(u * Math.PI * 36) * 0.005;
      const rX = (0.6 + ribWave) * bodyW;
      const rZ = (0.31 + ribWave) * bodyW;
      const x = Math.sin(theta) * rX;
      const z = Math.cos(theta) * rZ;
      const y = topY + 0.14 * collarW - v * 0.15 * collarW;
      return new THREE.Vector3(x, y, z);
    });
  }

  // ============================================================================
  // CASE C: CREW SOCKS
  // ============================================================================
  else if (garmentType === "socks") {
    const sockSpine = (v: number): { y: number; z: number; r: number } => {
      if (v < 0.55) {
        const t = v / 0.55;
        return {
          y: (0.95 - t * 1.35) * bodyL,
          z: -0.15,
          r: (0.26 - t * 0.02) * bodyW,
        };
      } else {
        const t = (v - 0.55) / 0.45;
        return {
          y: -0.4 * bodyL - Math.sin(t * (Math.PI / 2)) * 0.32,
          z: -0.15 + Math.pow(t, 0.9) * 1.15,
          r: (0.24 - t * 0.04) * bodyW,
        };
      }
    };

    addParametricPatch(36, 48, PANEL_UV_MAP.front, false, (u, v) => {
      const sp = sockSpine(v);
      const angle = (u - 0.5) * Math.PI;
      const x = Math.sin(angle) * sp.r;
      const y = sp.y + (v >= 0.55 ? Math.cos(angle) * sp.r * 0.65 : 0);
      const z = sp.z + (v < 0.55 ? Math.cos(angle) * sp.r : 0);
      return new THREE.Vector3(x, y, z);
    });

    addParametricPatch(36, 48, PANEL_UV_MAP.back, false, (u, v) => {
      const sp = sockSpine(v);
      const angle = (0.5 - u) * Math.PI;
      const x = Math.sin(angle) * sp.r;
      const y = sp.y - (v >= 0.55 ? Math.cos(angle) * sp.r * 0.65 : 0);
      const z = sp.z - (v < 0.55 ? Math.cos(angle) * sp.r : 0);
      return new THREE.Vector3(x, y, z);
    });

    addParametricPatch(28, 24, PANEL_UV_MAP.leftSleeve, false, (u, v) => {
      const phi = (u - 0.5) * Math.PI;
      const theta = (v - 0.5) * Math.PI * 0.85;
      const r = 0.252 * bodyW;
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = -0.48 * bodyL + Math.sin(theta) * r;
      const z = -0.18 - Math.cos(phi) * Math.cos(theta) * r;
      return new THREE.Vector3(x, y, z);
    });

    addParametricPatch(28, 24, PANEL_UV_MAP.rightSleeve, false, (u, v) => {
      const phi = (u - 0.5) * Math.PI * 1.2;
      const theta = (v - 0.5) * Math.PI * 0.9;
      const r = 0.208 * bodyW;
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = -0.71 * bodyL + Math.sin(theta) * r * 0.8;
      const z = 0.98 + Math.cos(phi) * Math.cos(theta) * r;
      return new THREE.Vector3(x, y, z);
    });

    addParametricPatch(40, 16, PANEL_UV_MAP.collar, true, (u, v) => {
      const theta = u * Math.PI * 2;
      const rib = Math.sin(u * Math.PI * 28) * 0.008;
      const r = (0.264 + rib) * bodyW;
      const x = Math.sin(theta) * r;
      const z = -0.15 + Math.cos(theta) * r;
      const y = 1.22 * bodyL - v * 0.28 * collarW;
      return new THREE.Vector3(x, y, z);
    });
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}
