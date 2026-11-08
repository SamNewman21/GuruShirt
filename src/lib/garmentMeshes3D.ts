import * as THREE from "three";
import { GarmentType, PANEL_UV_MAP } from "@/types/studio";

/**
 * Generates a true manifold, seam-welded 3D BufferGeometry for all 7 garment types:
 * - Closed shoulder seams (z = 0) and closed side seams below the underarm (z = 0).
 * - True circular 3D Neck Opening (no self-intersecting "X" geometry).
 * - True circular 3D Armhole Sockets welded vertex-for-vertex to cylindrical sleeves with flat perpendicular cuffs.
 */
export function createGarmentGeometry(
  garmentType: GarmentType
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

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

        const eps = 0.008;
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
          return 0.48 - Math.sin(t * Math.PI) * 0.06 + t * 0.16;
        }
        return 0.64 - ((v - ARMHOLE_V_END) / (1 - ARMHOLE_V_END)) * 0.02;
      }

      if (v <= ARMHOLE_V_END) {
        // Gentle anatomical curve from shoulder tip (0.68) to underarm chest width (0.64)
        const t = v / ARMHOLE_V_END;
        return 0.64 + 0.04 * Math.cos(t * (Math.PI / 2));
      }
      const t = (v - ARMHOLE_V_END) / (1 - ARMHOLE_V_END);
      const ribHemCinch =
        (isHoodie || isJacket) && v > 0.88
          ? Math.sin(((v - 0.88) / 0.12) * (Math.PI / 2)) * 0.055
          : 0;
      return 0.64 - t * 0.02 - ribHemCinch;
    };

    const getTopEdgeY = (nxAbs: number, isBack: boolean): number => {
      if (nxAbs <= NECK_HALF_RATIO) {
        // Inside Neck Opening: dip down smoothly for front or back neckline
        const t = nxAbs / NECK_HALF_RATIO; // 0 at center, 1 at neck-shoulder corner
        const scoop = isBack
          ? isTank
            ? 0.22
            : 0.045
          : isTank
          ? 0.3
          : isJacket
          ? 0.08
          : 0.17;
        return 1.0 - Math.cos(t * (Math.PI / 2)) * scoop;
      } else {
        // Along Shoulder Seam (nxAbs from 0.36 to 1.0): slopes naturally from 1.00 down to 0.86 at shoulder tip
        const t = (nxAbs - NECK_HALF_RATIO) / (1 - NECK_HALF_RATIO);
        return 1.0 - t * 0.14;
      }
    };

    /**
     * Evaluates a point on the Front or Back torso using viewer-space horizontal coordinate s in [0, 1]
     * (s = 0 is ALWAYS viewer's left x < 0, s = 1 is ALWAYS viewer's right x > 0).
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
      const bottomY = -1.1;
      const y = topY * (1 - v) + bottomY * v;

      // Compute Z depth so that:
      // 1) At v = 0 and nxAbs >= NECK_HALF_RATIO (Shoulder Seam), z = 0!
      // 2) At nxAbs = 1 and v >= ARMHOLE_V_END (Side Seam), z = 0!
      // 3) At v = 0 and nxAbs < NECK_HALF_RATIO (Neck Hole), z forms a smooth oval of radius 0.16!
      // 4) At nxAbs = 1 and v < ARMHOLE_V_END (Armhole Socket), z forms a smooth oval of radius 0.20!
      const baseDepth = isJacket ? 0.36 : isHoodie ? 0.33 : 0.29;
      const pufferWave = isJacket
        ? Math.abs(Math.sin(v * Math.PI * 6)) * 0.028
        : 0;
      const centerBodyZ =
        (baseDepth + Math.sin(v * Math.PI) * 0.06 + pufferWave) *
        Math.cos(nx * (Math.PI / 2));

      // Shoulder seam pinch factor: pinches z -> 0 at v = 0 when nxAbs >= NECK_HALF_RATIO
      let topPinch = 1.0;
      if (nxAbs >= NECK_HALF_RATIO) {
        topPinch = Math.min(1, Math.pow(v / 0.16, 0.75));
      } else {
        // Smooth blend from neck opening radius (0.16) at v=0 into full chest depth
        const neckCircleZ =
          Math.sqrt(Math.max(0, 1 - Math.pow(nxAbs / NECK_HALF_RATIO, 2))) *
          0.16;
        const vBlend = Math.min(1, v / 0.18);
        const bodyAtV0 = Math.max(0.001, centerBodyZ);
        topPinch = (neckCircleZ / bodyAtV0) * (1 - vBlend) + vBlend;
      }

      // Armhole socket Z contribution near outer edges (nxAbs near 1, v < ARMHOLE_V_END)
      let armholeSocketZ = 0;
      if (v < ARMHOLE_V_END && !isTank) {
        const tArm = v / ARMHOLE_V_END;
        const ringZ = Math.sin(tArm * Math.PI) * 0.205;
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
          pocketRelief = 0.038 * edgeSoft * vSoft;
        }
      }

      const rawZ = centerBodyZ * topPinch + armholeSocketZ + pocketRelief;
      const z = (isBack ? -1 : 1) * rawZ;

      return new THREE.Vector3(x, y, z);
    };

    // 1. FRONT TORSO (u = 0 is viewer's left s=0, u = 1 is viewer's right s=1)
    addParametricPatch(48, 52, PANEL_UV_MAP.front, false, (u, v) =>
      evalTorsoByViewerS(u, v, false)
    );

    // 2. BACK TORSO (u = 0 is viewer's right s=1, u = 1 is viewer's left s=0)
    addParametricPatch(48, 52, PANEL_UV_MAP.back, false, (u, v) =>
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
          base.x + (isRightSideOfViewer ? 1 : -1) * v * 0.02,
          base.y,
          base.z + Math.sin(theta) * 0.08
        );
      };

      addParametricPatch(28, 8, PANEL_UV_MAP.leftSleeve, true, (u, v) =>
        evalTankTrim(u, v, true)
      );
      addParametricPatch(28, 8, PANEL_UV_MAP.rightSleeve, false, (u, v) =>
        evalTankTrim(1 - u, v, false)
      );
    } else {
      const isLongSleeve = isHoodie || isJacket;

      /**
       * Evaluates the Left Sleeve (viewer's right side, x > 0) and mirrors X -> -X for the Right Sleeve.
       * - At v = 0: welds 100% vertex-for-vertex to the torso's Armhole Socket!
       * - At v = 1: forms a clean, flat circular cuff perpendicular to the sleeve axis!
       */
      const evalSleeve = (
        u: number,
        v: number,
        mirrorToViewerLeft: boolean
      ): THREE.Vector3 => {
        // theta: 0 = top shoulder seam, +PI/2 = front of sleeve, -PI/2 = back of sleeve, +-PI = underarm seam
        const theta = (u - 0.5) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Exact welded point on the Torso Armhole at v = 0
        const tArm = (1 - cosT) / 2; // 0 at top of shoulder, 1 at armpit
        const vTorso = tArm * ARMHOLE_V_END;
        const rootFront = evalTorsoByViewerS(1.0, vTorso, false);
        const rootX = rootFront.x;
        const rootY = rootFront.y;
        const rootZ = sinT * Math.abs(rootFront.z);

        // Center of the armhole root
        const armholeCenterX = 0.66;
        const armholeCenterY = 0.54;

        // Sleeve axis direction (relaxed ~40 deg angle for T-Shirt, ~56 deg for Hoodie/Jacket)
        const angleRad = isLongSleeve ? 0.98 : 0.68;
        const sleeveLength = isLongSleeve ? 1.18 : 0.44;
        const dirX = Math.cos(angleRad);
        const dirY = -Math.sin(angleRad);

        // Unit vector perpendicular to the sleeve axis in the XY plane
        const perpX = Math.sin(angleRad);
        const perpY = Math.cos(angleRad);

        // Target circular cross-section along the sleeve cylinder
        const cuffRadius = isLongSleeve
          ? 0.21 * (1 - v * 0.28)
          : 0.225 * (1 - v * 0.08);
        const pufferWave = isJacket
          ? Math.abs(Math.sin(v * Math.PI * 5)) * 0.028
          : 0;
        const r = cuffRadius + pufferWave;

        const axisCenterX = armholeCenterX + v * sleeveLength * dirX;
        const axisCenterY = armholeCenterY + v * sleeveLength * dirY;
        const forwardElbowZ = isLongSleeve
          ? Math.sin(v * Math.PI * 0.85) * 0.06
          : 0;

        const cylX = axisCenterX + cosT * r * perpX;
        const cylY = axisCenterY + cosT * r * perpY;
        const cylZ = forwardElbowZ + sinT * r * 0.95;

        // Smoothly transition from the exact welded armhole root at v=0 to the true perpendicular cylinder
        const w = Math.min(1, Math.pow(v, 0.65) * 1.4);
        const x = (rootX + v * sleeveLength * dirX) * (1 - w) + cylX * w;
        const y = (rootY + v * sleeveLength * dirY) * (1 - w) + cylY * w;
        const z = rootZ * (1 - w) + cylZ * w;

        return new THREE.Vector3(mirrorToViewerLeft ? -x : x, y, z);
      };

      // Left Sleeve (viewer's right, x > 0)
      addParametricPatch(36, 32, PANEL_UV_MAP.leftSleeve, true, (u, v) =>
        evalSleeve(u, v, false)
      );

      // Right Sleeve (viewer's left, x < 0 — exact mirror!)
      addParametricPatch(36, 32, PANEL_UV_MAP.rightSleeve, false, (u, v) =>
        evalSleeve(1 - u, v, true)
      );
    }

    // 5. WELDED COLLAR / HOOD / STAND COLLAR
    // Evaluates the exact closed 3D Neck Opening loop on the torso (zero self-intersection!)
    const evalNeckRing = (theta: number): THREE.Vector3 => {
      // theta = 0 is Front Center, +PI/2 is Viewer Right Neck, PI is Back Center, -PI/2 is Viewer Left Neck
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const s = 0.5 + sinT * (NECK_HALF_RATIO * 0.5);
      const isBack = cosT < 0;
      const pt = evalTorsoByViewerS(s, 0.0, isBack);
      // Enforce smooth oval Z around the neck ring
      const zOval = cosT * 0.16;
      return new THREE.Vector3(pt.x, pt.y, zOval);
    };

    if (isHoodie) {
      // Sculpted 3D Pullover Hood welded directly to the neck opening ring at v=0
      addParametricPatch(44, 28, PANEL_UV_MAP.collar, true, (u, v) => {
        // u goes from front-left neck (0.08) around the back (0.5) to front-right neck (0.92)
        const theta = (u - 0.5) * Math.PI * 1.85 + Math.PI;
        const baseNeck = evalNeckRing(theta);

        const rise = Math.sin(v * Math.PI * 0.82);
        const swell = Math.sin(v * Math.PI);
        const crownClose = Math.pow(v, 2.3);

        const x =
          baseNeck.x * (1 - crownClose * 0.85) +
          Math.sin(theta - Math.PI) * swell * 0.1 * (1 - crownClose);
        const y = baseNeck.y + rise * 0.64;
        const z =
          baseNeck.z * (1 - v * 0.3) -
          swell * 0.16 +
          crownClose * 0.18 * Math.cos((u - 0.5) * Math.PI);

        return new THREE.Vector3(x, y, z);
      });
    } else if (isJacket) {
      // Welded Puffer Stand Collar
      addParametricPatch(44, 14, PANEL_UV_MAP.collar, true, (u, v) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const baseNeck = evalNeckRing(theta);
        const puff = Math.sin(v * Math.PI) * 0.022;
        return new THREE.Vector3(
          baseNeck.x + Math.sin(theta) * puff,
          baseNeck.y + v * 0.22,
          baseNeck.z + Math.cos(theta) * puff
        );
      });
    } else {
      // Welded Ribbed Crew Collar Band (snugly hugs inward toward the neck)
      addParametricPatch(44, 12, PANEL_UV_MAP.collar, true, (u, v) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const baseNeck = evalNeckRing(theta);
        const inwardScale = 1 - v * 0.14;
        return new THREE.Vector3(
          baseNeck.x * inwardScale,
          baseNeck.y + v * 0.065,
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
    const totalHeight = isShorts ? 1.35 : 2.35;
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
        const w = 0.6 + hipFlare;
        const d = 0.31 + hipFlare * 0.5;
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
          (isRightSide ? 1 : -1) * (0.31 + legT * 0.05);
        const cuffTaper =
          !isShorts && legT > 0.86 ? (legT - 0.86) * 0.38 : 0;
        const legRadiusX =
          (isShorts ? 0.3 : 0.28 - legT * 0.035) - cuffTaper;
        const legRadiusZ =
          (isShorts ? 0.27 : 0.26 - legT * 0.025) - cuffTaper;

        const x = legCenterOffset + Math.sin(angle) * legRadiusX;
        const z = (isBack ? -1 : 1) * Math.cos(angle) * legRadiusZ;
        return new THREE.Vector3(x, y, z);
      }
    };

    addParametricPatch(48, 52, PANEL_UV_MAP.front, false, (u, v) =>
      evalBottomsSurface(u, v, false)
    );
    addParametricPatch(48, 52, PANEL_UV_MAP.back, false, (u, v) =>
      evalBottomsSurface(u, v, true)
    );

    addParametricPatch(16, 40, PANEL_UV_MAP.leftSleeve, false, (u, v) => {
      const isBack = u > 0.5;
      const torsoU = isBack ? 0.04 * (1 - (u - 0.5) * 2) : 0.96 + u * 0.08;
      const base = evalBottomsSurface(
        Math.min(0.999, Math.max(0.001, torsoU)),
        v,
        isBack
      );
      return new THREE.Vector3(base.x + 0.004, base.y, base.z);
    });

    addParametricPatch(16, 40, PANEL_UV_MAP.rightSleeve, true, (u, v) => {
      const isBack = u > 0.5;
      const torsoU = isBack ? 0.96 + (u - 0.5) * 0.08 : 0.04 * (1 - u * 2);
      const base = evalBottomsSurface(
        Math.min(0.999, Math.max(0.001, torsoU)),
        v,
        isBack
      );
      return new THREE.Vector3(base.x - 0.004, base.y, base.z);
    });

    addParametricPatch(44, 12, PANEL_UV_MAP.collar, true, (u, v) => {
      const theta = u * Math.PI * 2;
      const ribWave = Math.sin(u * Math.PI * 36) * 0.005;
      const rX = 0.6 + ribWave;
      const rZ = 0.31 + ribWave;
      const x = Math.sin(theta) * rX;
      const z = Math.cos(theta) * rZ;
      const y = topY + 0.14 - v * 0.15;
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
          y: 0.95 - t * 1.35,
          z: -0.15,
          r: 0.26 - t * 0.02,
        };
      } else {
        const t = (v - 0.55) / 0.45;
        return {
          y: -0.4 - Math.sin(t * (Math.PI / 2)) * 0.32,
          z: -0.15 + Math.pow(t, 0.9) * 1.15,
          r: 0.24 - t * 0.04,
        };
      }
    };

    addParametricPatch(32, 44, PANEL_UV_MAP.front, false, (u, v) => {
      const sp = sockSpine(v);
      const angle = (u - 0.5) * Math.PI;
      const x = Math.sin(angle) * sp.r;
      const y = sp.y + (v >= 0.55 ? Math.cos(angle) * sp.r * 0.65 : 0);
      const z = sp.z + (v < 0.55 ? Math.cos(angle) * sp.r : 0);
      return new THREE.Vector3(x, y, z);
    });

    addParametricPatch(32, 44, PANEL_UV_MAP.back, false, (u, v) => {
      const sp = sockSpine(v);
      const angle = (0.5 - u) * Math.PI;
      const x = Math.sin(angle) * sp.r;
      const y = sp.y - (v >= 0.55 ? Math.cos(angle) * sp.r * 0.65 : 0);
      const z = sp.z - (v < 0.55 ? Math.cos(angle) * sp.r : 0);
      return new THREE.Vector3(x, y, z);
    });

    addParametricPatch(24, 20, PANEL_UV_MAP.leftSleeve, false, (u, v) => {
      const phi = (u - 0.5) * Math.PI;
      const theta = (v - 0.5) * Math.PI * 0.85;
      const r = 0.252;
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = -0.48 + Math.sin(theta) * r;
      const z = -0.18 - Math.cos(phi) * Math.cos(theta) * r;
      return new THREE.Vector3(x, y, z);
    });

    addParametricPatch(24, 20, PANEL_UV_MAP.rightSleeve, false, (u, v) => {
      const phi = (u - 0.5) * Math.PI * 1.2;
      const theta = (v - 0.5) * Math.PI * 0.9;
      const r = 0.208;
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = -0.71 + Math.sin(theta) * r * 0.8;
      const z = 0.98 + Math.cos(phi) * Math.cos(theta) * r;
      return new THREE.Vector3(x, y, z);
    });

    addParametricPatch(36, 12, PANEL_UV_MAP.collar, true, (u, v) => {
      const theta = u * Math.PI * 2;
      const rib = Math.sin(u * Math.PI * 28) * 0.008;
      const r = 0.264 + rib;
      const x = Math.sin(theta) * r;
      const z = -0.15 + Math.cos(theta) * r;
      const y = 1.22 - v * 0.28;
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
