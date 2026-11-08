import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";

const PANEL_UV_MAP = {
  front: { uMin: 0.02, vMin: 0.04, uMax: 0.48, vMax: 0.68 },
  back: { uMin: 0.52, vMin: 0.04, uMax: 0.98, vMax: 0.68 },
  leftSleeve: { uMin: 0.02, vMin: 0.72, uMax: 0.36, vMax: 0.96 },
  rightSleeve: { uMin: 0.38, vMin: 0.72, uMax: 0.72, vMax: 0.96 },
  collar: { uMin: 0.74, vMin: 0.72, uMax: 0.98, vMax: 0.96 },
};

function buildGarmentGeometry(garmentType) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let vertexCount = 0;

  function addParametricPatch(segsU, segsV, uvRect, flipFaces, evalPoint) {
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
          indices.push(a, b, d, b, c, d);
        } else {
          indices.push(a, d, b, b, d, c);
        }
      }
    }
  }

  if (["tshirt", "hoodie", "tank", "jacket"].includes(garmentType)) {
    const isTank = garmentType === "tank";
    const isHoodie = garmentType === "hoodie";
    const isJacket = garmentType === "jacket";
    const NECK_HALF_RATIO = 0.36;
    const ARMHOLE_V_END = 0.36;

    const getTorsoWidthAtV = (v) => {
      if (isTank) {
        if (v < ARMHOLE_V_END) {
          const t = v / ARMHOLE_V_END;
          return 0.48 - Math.sin(t * Math.PI) * 0.06 + t * 0.16;
        }
        return 0.64 - ((v - ARMHOLE_V_END) / (1 - ARMHOLE_V_END)) * 0.02;
      }
      if (v <= ARMHOLE_V_END) {
        const t = v / ARMHOLE_V_END;
        return 0.65 + 0.045 * Math.cos(t * (Math.PI / 2));
      }
      const t = (v - ARMHOLE_V_END) / (1 - ARMHOLE_V_END);
      const ribHemCinch =
        (isHoodie || isJacket) && v > 0.88
          ? Math.sin(((v - 0.88) / 0.12) * (Math.PI / 2)) * 0.055
          : 0;
      return 0.65 - t * 0.018 - ribHemCinch;
    };

    const getTopEdgeY = (nxAbs, isBack) => {
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
      }
      const t = (nxAbs - NECK_HALF_RATIO) / (1 - NECK_HALF_RATIO);
      return 1.02 - t * 0.15;
    };

    const evalTorsoByViewerS = (s, v, isBack) => {
      const nx = (s - 0.5) * 2;
      const nxAbs = Math.abs(nx);
      const hw = getTorsoWidthAtV(v);
      const x = nx * hw;
      const topY = getTopEdgeY(nxAbs, isBack);
      const bottomY = -1.12;
      const y = topY * (1 - v) + bottomY * v;
      const baseDepth = isJacket ? 0.36 : isHoodie ? 0.33 : 0.29;
      const pufferWave = isJacket ? Math.abs(Math.sin(v * Math.PI * 6)) * 0.032 : 0;
      const seamEnvelope = Math.sin(v * Math.PI) * Math.max(0, 1 - Math.pow(nxAbs, 4));
      const chestDrape =
        0.008 *
        seamEnvelope *
        (Math.sin(nx * Math.PI * 3.5 + v * 4.2) * 0.6 +
          Math.cos(nx * Math.PI * 5.0 - v * 5.5) * 0.4);
      const centerBodyZ =
        (baseDepth + Math.sin(v * Math.PI) * 0.065 + pufferWave + chestDrape) *
        Math.cos(nx * (Math.PI / 2));

      let topPinch = 1.0;
      if (nxAbs >= NECK_HALF_RATIO) {
        topPinch = Math.min(1, Math.pow(v / 0.16, 0.75));
      } else {
        const neckCircleZ =
          Math.sqrt(Math.max(0, 1 - Math.pow(nxAbs / NECK_HALF_RATIO, 2))) * 0.165;
        const vBlend = Math.min(1, v / 0.18);
        const bodyAtV0 = Math.max(0.001, centerBodyZ);
        topPinch = (neckCircleZ / bodyAtV0) * (1 - vBlend) + vBlend;
      }

      let armholeSocketZ = 0;
      if (v < ARMHOLE_V_END && !isTank) {
        const tArm = v / ARMHOLE_V_END;
        const ringZ = Math.sin(tArm * Math.PI) * 0.21;
        armholeSocketZ = ringZ * Math.pow(nxAbs, 3);
      }

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
      return new THREE.Vector3(x, y, (isBack ? -1 : 1) * rawZ);
    };

    addParametricPatch(68, 72, PANEL_UV_MAP.front, false, (u, v) =>
      evalTorsoByViewerS(u, v, false)
    );
    addParametricPatch(68, 72, PANEL_UV_MAP.back, false, (u, v) =>
      evalTorsoByViewerS(1 - u, v, true)
    );

    if (isTank) {
      const evalTankTrim = (u, v, isRightSide) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const tArm = (1 - Math.cos(theta)) / 2;
        const vTorso = tArm * ARMHOLE_V_END;
        const base = evalTorsoByViewerS(isRightSide ? 1 : 0, vTorso, Math.sin(theta) < 0);
        return new THREE.Vector3(
          base.x + (isRightSide ? 1 : -1) * v * 0.024,
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
      const evalSleeve = (u, v, mirrorToViewerLeft) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const tArm = (1 - cosT) / 2;
        const vTorso = tArm * ARMHOLE_V_END;
        const rootFront = evalTorsoByViewerS(1.0, vTorso, false);
        const rootX = rootFront.x;
        const rootY = rootFront.y;
        const rootZ = sinT * Math.abs(rootFront.z);
        const angleRad = isLongSleeve ? 0.98 : 0.66;
        const len = isLongSleeve ? 1.18 : 0.46;
        const dirX = Math.cos(angleRad);
        const dirY = -Math.sin(angleRad);
        const perpX = Math.sin(angleRad);
        const perpY = Math.cos(angleRad);
        const vAxial = v <= 0.94 ? v / 0.94 : 1.0 - (v - 0.94) * 0.35;
        const cuffRollInward = v > 0.94 ? ((v - 0.94) / 0.06) * 0.018 : 0;
        const cuffRadius = isLongSleeve
          ? 0.215 * (1 - vAxial * 0.28)
          : 0.23 * (1 - vAxial * 0.08);
        const pufferWave = isJacket ? Math.abs(Math.sin(vAxial * Math.PI * 5)) * 0.028 : 0;
        const r = Math.max(0.06, cuffRadius + pufferWave - cuffRollInward);
        const axisCenterX = 0.67 + vAxial * len * dirX;
        const axisCenterY = 0.54 + vAxial * len * dirY;
        const forwardElbowZ = isLongSleeve ? Math.sin(vAxial * Math.PI * 0.85) * 0.06 : 0;
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

    const evalNeckRing = (theta) => {
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const s = 0.5 + sinT * (NECK_HALF_RATIO * 0.5);
      const pt = evalTorsoByViewerS(s, 0.0, cosT < 0);
      return new THREE.Vector3(pt.x, pt.y, cosT * 0.165);
    };

    if (isHoodie) {
      addParametricPatch(56, 34, PANEL_UV_MAP.collar, true, (u, v) => {
        const theta = (u - 0.5) * Math.PI * 1.85 + Math.PI;
        const baseNeck = evalNeckRing(theta);
        const rise = Math.sin(v * Math.PI * 0.82);
        const swell = Math.sin(v * Math.PI);
        const crownClose = Math.pow(v, 2.3);
        return new THREE.Vector3(
          baseNeck.x * (1 - crownClose * 0.85) +
            Math.sin(theta - Math.PI) * swell * 0.11 * (1 - crownClose),
          baseNeck.y + rise * 0.65,
          baseNeck.z * (1 - v * 0.3) -
            swell * 0.17 +
            crownClose * 0.18 * Math.cos((u - 0.5) * Math.PI)
        );
      });
    } else if (isJacket) {
      addParametricPatch(56, 20, PANEL_UV_MAP.collar, true, (u, v) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const baseNeck = evalNeckRing(theta);
        const hCurve = v <= 0.65 ? v / 0.65 : 1.0 - ((v - 0.65) / 0.35) * 0.55;
        const puff = Math.sin(v * Math.PI) * 0.028;
        const scale = 1 - (v > 0.65 ? ((v - 0.65) / 0.35) * 0.09 : 0);
        return new THREE.Vector3(
          baseNeck.x * scale + Math.sin(theta) * puff,
          baseNeck.y + hCurve * 0.22,
          baseNeck.z * scale + Math.cos(theta) * puff
        );
      });
    } else {
      addParametricPatch(56, 20, PANEL_UV_MAP.collar, true, (u, v) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const baseNeck = evalNeckRing(theta);
        const hCurve = v <= 0.6 ? v / 0.6 : 1.0 - ((v - 0.6) / 0.4) * 1.15;
        const inwardScale =
          v <= 0.6 ? 1 - (v / 0.6) * 0.12 : 0.88 - ((v - 0.6) / 0.4) * 0.06;
        return new THREE.Vector3(
          baseNeck.x * inwardScale,
          baseNeck.y + hCurve * 0.072,
          baseNeck.z * inwardScale
        );
      });
    }
  } else if (garmentType === "pants" || garmentType === "shorts") {
    const isShorts = garmentType === "shorts";
    const totalHeight = isShorts ? 1.35 : 2.35;
    const topY = isShorts ? 0.72 : 1.12;
    const evalBottomsSurface = (u, v, isBack) => {
      const splitStart = 0.26;
      const y = topY - v * totalHeight;
      if (v <= splitStart) {
        const angle = isBack ? (0.5 - u) * Math.PI : (u - 0.5) * Math.PI;
        const hipFlare = Math.sin((v / splitStart) * (Math.PI / 2)) * 0.08;
        const w = 0.6 + hipFlare;
        const d = 0.31 + hipFlare * 0.5;
        return new THREE.Vector3(
          Math.sin(angle) * w,
          y,
          (isBack ? -1 : 1) * Math.cos(angle) * d
        );
      }
      const legT = (v - splitStart) / (1 - splitStart);
      const isRightSide = u >= 0.5;
      const localU = isRightSide ? (u - 0.5) * 2 : u * 2;
      const angle = isBack ? (0.5 - localU) * Math.PI : (localU - 0.5) * Math.PI;
      const legCenterOffset = (isRightSide ? 1 : -1) * (0.31 + legT * 0.05);
      const cuffTaper = !isShorts && legT > 0.86 ? (legT - 0.86) * 0.38 : 0;
      const legRadiusX = (isShorts ? 0.3 : 0.28 - legT * 0.035) - cuffTaper;
      const legRadiusZ = (isShorts ? 0.27 : 0.26 - legT * 0.025) - cuffTaper;
      return new THREE.Vector3(
        legCenterOffset + Math.sin(angle) * legRadiusX,
        y,
        (isBack ? -1 : 1) * Math.cos(angle) * legRadiusZ
      );
    };
    addParametricPatch(56, 60, PANEL_UV_MAP.front, false, (u, v) =>
      evalBottomsSurface(u, v, false)
    );
    addParametricPatch(56, 60, PANEL_UV_MAP.back, false, (u, v) =>
      evalBottomsSurface(u, v, true)
    );
    addParametricPatch(48, 16, PANEL_UV_MAP.collar, true, (u, v) => {
      const theta = u * Math.PI * 2;
      return new THREE.Vector3(
        Math.sin(theta) * 0.6,
        topY + 0.14 - v * 0.15,
        Math.cos(theta) * 0.31
      );
    });
  } else {
    const sockSpine = (v) => {
      if (v < 0.55) {
        const t = v / 0.55;
        return { y: 0.95 - t * 1.35, z: -0.15, r: 0.26 - t * 0.02 };
      }
      const t = (v - 0.55) / 0.45;
      return {
        y: -0.4 - Math.sin(t * (Math.PI / 2)) * 0.32,
        z: -0.15 + Math.pow(t, 0.9) * 1.15,
        r: 0.24 - t * 0.04,
      };
    };
    addParametricPatch(36, 48, PANEL_UV_MAP.front, false, (u, v) => {
      const sp = sockSpine(v);
      const angle = (u - 0.5) * Math.PI;
      return new THREE.Vector3(
        Math.sin(angle) * sp.r,
        sp.y + (v >= 0.55 ? Math.cos(angle) * sp.r * 0.65 : 0),
        sp.z + (v < 0.55 ? Math.cos(angle) * sp.r : 0)
      );
    });
    addParametricPatch(36, 48, PANEL_UV_MAP.back, false, (u, v) => {
      const sp = sockSpine(v);
      const angle = (0.5 - u) * Math.PI;
      return new THREE.Vector3(
        Math.sin(angle) * sp.r,
        sp.y - (v >= 0.55 ? Math.cos(angle) * sp.r * 0.65 : 0),
        sp.z - (v < 0.55 ? Math.cos(angle) * sp.r : 0)
      );
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

function serializeToGlb(geometry, garmentName) {
  const posAttr = geometry.getAttribute("position");
  const normAttr = geometry.getAttribute("normal");
  const uvAttr = geometry.getAttribute("uv");
  const indexAttr = geometry.getIndex();

  const vertexCount = posAttr.count;
  const posArray = new Float32Array(posAttr.array);
  const normArray = new Float32Array(normAttr.array);
  const uvArray = new Float32Array(uvAttr.array);
  const gltfUvArray = new Float32Array(uvArray.length);
  for (let i = 0; i < uvArray.length; i += 2) {
    gltfUvArray[i] = uvArray[i];
    gltfUvArray[i + 1] = 1.0 - uvArray[i + 1];
  }
  const indexArray = new Uint32Array(indexAttr.array);

  const minPos = [Infinity, Infinity, Infinity];
  const maxPos = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < posArray.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (posArray[i + k] < minPos[k]) minPos[k] = posArray[i + k];
      if (posArray[i + k] > maxPos[k]) maxPos[k] = posArray[i + k];
    }
  }

  const align4 = (n) => (n + 3) & ~3;
  const posBytes = new Uint8Array(posArray.buffer);
  const normBytes = new Uint8Array(normArray.buffer);
  const uvBytes = new Uint8Array(gltfUvArray.buffer);
  const idxBytes = new Uint8Array(indexArray.buffer);

  const posOffset = 0;
  const normOffset = align4(posOffset + posBytes.byteLength);
  const uvOffset = align4(normOffset + normBytes.byteLength);
  const idxOffset = align4(uvOffset + uvBytes.byteLength);
  const totalBinLength = align4(idxOffset + idxBytes.byteLength);

  const binBuffer = new Uint8Array(totalBinLength);
  binBuffer.set(posBytes, posOffset);
  binBuffer.set(normBytes, normOffset);
  binBuffer.set(uvBytes, uvOffset);
  binBuffer.set(idxBytes, idxOffset);

  const gltfJson = {
    asset: { version: "2.0", generator: "GuruShirt 3D Apparel Studio Engine" },
    scene: 0,
    scenes: [{ name: "GuruShirt_Scene", nodes: [0] }],
    nodes: [{ name: garmentName, mesh: 0 }],
    meshes: [
      {
        name: `${garmentName}_Mesh`,
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: `${garmentName}_Material`,
        doubleSided: true,
        pbrMetallicRoughness: { roughnessFactor: 0.82, metallicFactor: 0.04 },
      },
    ],
    buffers: [{ byteLength: totalBinLength }],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: posBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: normOffset, byteLength: normBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: uvOffset, byteLength: uvBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, byteOffset: 0, componentType: 5126, count: vertexCount, type: "VEC3", min: minPos, max: maxPos },
      { bufferView: 1, byteOffset: 0, componentType: 5126, count: vertexCount, type: "VEC3" },
      { bufferView: 2, byteOffset: 0, componentType: 5126, count: vertexCount, type: "VEC2" },
      { bufferView: 3, byteOffset: 0, componentType: 5125, count: indexArray.length, type: "SCALAR" },
    ],
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
  const paddedJsonLen = align4(jsonBytes.byteLength);
  const paddedJsonBytes = new Uint8Array(paddedJsonLen);
  paddedJsonBytes.fill(0x20);
  paddedJsonBytes.set(jsonBytes, 0);

  const totalGlbSize = 12 + 8 + paddedJsonLen + 8 + totalBinLength;
  const glbBuffer = new ArrayBuffer(totalGlbSize);
  const view = new DataView(glbBuffer);
  const outBytes = new Uint8Array(glbBuffer);

  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalGlbSize, true);
  view.setUint32(12, paddedJsonLen, true);
  view.setUint32(16, 0x4e4f534a, true);
  outBytes.set(paddedJsonBytes, 20);

  const binChunkHeaderOffset = 20 + paddedJsonLen;
  view.setUint32(binChunkHeaderOffset, totalBinLength, true);
  view.setUint32(binChunkHeaderOffset + 4, 0x004e4942, true);
  outBytes.set(binBuffer, binChunkHeaderOffset + 8);

  return Buffer.from(glbBuffer);
}

const outDir = path.resolve(process.cwd(), "public/models");
fs.mkdirSync(outDir, { recursive: true });

for (const gt of ["tshirt", "hoodie", "tank", "jacket", "pants", "shorts", "socks"]) {
  const geom = buildGarmentGeometry(gt);
  const buf = serializeToGlb(geom, `GuruShirt_${gt}`);
  const filePath = path.join(outDir, `${gt}.glb`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${filePath} (${(buf.length / 1024).toFixed(1)} KB)`);
}
