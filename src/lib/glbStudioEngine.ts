import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Serializes a THREE.BufferGeometry (positions, normals, uvs, indices) and an optional
 * 2D texture canvas into a standard binary glTF 2.0 (.glb) ArrayBuffer.
 * Works identically in browser and Node environments.
 */
export async function serializeGeometryToGlbBuffer(
  geometry: THREE.BufferGeometry,
  garmentName: string = "GuruShirt_Garment",
  textureCanvas?: HTMLCanvasElement | null
): Promise<ArrayBuffer> {
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normAttr = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const uvAttr = geometry.getAttribute("uv") as THREE.BufferAttribute;
  const indexAttr = geometry.getIndex();

  const vertexCount = posAttr.count;
  const posArray = new Float32Array(posAttr.array);
  const normArray = normAttr
    ? new Float32Array(normAttr.array)
    : new Float32Array(vertexCount * 3);
  const uvArray = uvAttr
    ? new Float32Array(uvAttr.array)
    : new Float32Array(vertexCount * 2);

  // Flip V for glTF standard UV convention (1 - v)
  const gltfUvArray = new Float32Array(uvArray.length);
  for (let i = 0; i < uvArray.length; i += 2) {
    gltfUvArray[i] = uvArray[i];
    gltfUvArray[i + 1] = 1.0 - uvArray[i + 1];
  }

  const indexArray = indexAttr
    ? new Uint32Array(indexAttr.array)
    : new Uint32Array(0);

  // Compute min/max for POSITION accessor (required by glTF 2.0 spec)
  const minPos = [Infinity, Infinity, Infinity];
  const maxPos = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < posArray.length; i += 3) {
    const x = posArray[i];
    const y = posArray[i + 1];
    const z = posArray[i + 2];
    if (x < minPos[0]) minPos[0] = x;
    if (y < minPos[1]) minPos[1] = y;
    if (z < minPos[2]) minPos[2] = z;
    if (x > maxPos[0]) maxPos[0] = x;
    if (y > maxPos[1]) maxPos[1] = y;
    if (z > maxPos[2]) maxPos[2] = z;
  }

  let pngBytes = new Uint8Array(0);
  if (textureCanvas && typeof textureCanvas.toDataURL === "function") {
    const dataUrl = textureCanvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1] || "";
    const binaryStr = atob(base64);
    pngBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      pngBytes[i] = binaryStr.charCodeAt(i);
    }
  }

  const align4 = (n: number) => (n + 3) & ~3;

  const posBytes = new Uint8Array(
    posArray.buffer,
    posArray.byteOffset,
    posArray.byteLength
  );
  const normBytes = new Uint8Array(
    normArray.buffer,
    normArray.byteOffset,
    normArray.byteLength
  );
  const uvBytes = new Uint8Array(
    gltfUvArray.buffer,
    gltfUvArray.byteOffset,
    gltfUvArray.byteLength
  );
  const idxBytes = new Uint8Array(
    indexArray.buffer,
    indexArray.byteOffset,
    indexArray.byteLength
  );

  const posOffset = 0;
  const posLen = posBytes.byteLength;
  const normOffset = align4(posOffset + posLen);
  const normLen = normBytes.byteLength;
  const uvOffset = align4(normOffset + normLen);
  const uvLen = uvBytes.byteLength;
  const idxOffset = align4(uvOffset + uvLen);
  const idxLen = idxBytes.byteLength;
  const imgOffset = align4(idxOffset + idxLen);
  const imgLen = pngBytes.byteLength;
  const totalBinLength = align4(imgOffset + imgLen);

  const binBuffer = new Uint8Array(totalBinLength);
  binBuffer.set(posBytes, posOffset);
  binBuffer.set(normBytes, normOffset);
  binBuffer.set(uvBytes, uvOffset);
  if (idxLen > 0) binBuffer.set(idxBytes, idxOffset);
  if (imgLen > 0) binBuffer.set(pngBytes, imgOffset);

  const bufferViews: Array<Record<string, unknown>> = [
    {
      buffer: 0,
      byteOffset: posOffset,
      byteLength: posLen,
      target: 34962, // ARRAY_BUFFER
    },
    {
      buffer: 0,
      byteOffset: normOffset,
      byteLength: normLen,
      target: 34962,
    },
    {
      buffer: 0,
      byteOffset: uvOffset,
      byteLength: uvLen,
      target: 34962,
    },
  ];

  const accessors: Array<Record<string, unknown>> = [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: vertexCount,
      type: "VEC3",
      min: minPos,
      max: maxPos,
    },
    {
      bufferView: 1,
      byteOffset: 0,
      componentType: 5126,
      count: vertexCount,
      type: "VEC3",
    },
    {
      bufferView: 2,
      byteOffset: 0,
      componentType: 5126,
      count: vertexCount,
      type: "VEC2",
    },
  ];

  let indicesAccessorIndex: number | undefined;
  if (idxLen > 0) {
    const bvIdx = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: idxOffset,
      byteLength: idxLen,
      target: 34963, // ELEMENT_ARRAY_BUFFER
    });
    indicesAccessorIndex = accessors.length;
    accessors.push({
      bufferView: bvIdx,
      byteOffset: 0,
      componentType: 5125, // UNSIGNED_INT
      count: indexArray.length,
      type: "SCALAR",
    });
  }

  const materialDef: Record<string, unknown> = {
    name: `${garmentName}_Material`,
    doubleSided: true,
    pbrMetallicRoughness: {
      roughnessFactor: 0.82,
      metallicFactor: 0.04,
    },
  };

  const gltfJson: Record<string, unknown> = {
    asset: {
      version: "2.0",
      generator: "GuruShirt 3D Apparel Studio Engine",
    },
    scene: 0,
    scenes: [{ name: "GuruShirt_Scene", nodes: [0] }],
    nodes: [{ name: garmentName, mesh: 0 }],
    meshes: [
      {
        name: `${garmentName}_Mesh`,
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
              TEXCOORD_0: 2,
            },
            ...(indicesAccessorIndex !== undefined
              ? { indices: indicesAccessorIndex }
              : {}),
            material: 0,
          },
        ],
      },
    ],
    materials: [materialDef],
    buffers: [{ byteLength: totalBinLength }],
    bufferViews,
    accessors,
  };

  if (imgLen > 0) {
    const imgBvIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: imgOffset,
      byteLength: imgLen,
    });
    gltfJson.images = [
      {
        bufferView: imgBvIndex,
        mimeType: "image/png",
        name: `${garmentName}_UVTexture`,
      },
    ];
    gltfJson.textures = [{ source: 0 }];
    (
      materialDef.pbrMetallicRoughness as Record<string, unknown>
    ).baseColorTexture = { index: 0 };
  }

  const jsonString = JSON.stringify(gltfJson);
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonString);
  const paddedJsonLen = align4(jsonBytes.byteLength);
  const paddedJsonBytes = new Uint8Array(paddedJsonLen);
  paddedJsonBytes.fill(0x20); // pad with spaces per glTF 2.0 spec
  paddedJsonBytes.set(jsonBytes, 0);

  // Total GLB size: 12-byte header + (8 + paddedJsonLen) + (8 + totalBinLength)
  const totalGlbSize = 12 + 8 + paddedJsonLen + 8 + totalBinLength;
  const glbBuffer = new ArrayBuffer(totalGlbSize);
  const view = new DataView(glbBuffer);
  const outBytes = new Uint8Array(glbBuffer);

  // 12-byte GLB Header
  view.setUint32(0, 0x46546c67, true); // 'glTF'
  view.setUint32(4, 2, true); // version 2
  view.setUint32(8, totalGlbSize, true);

  // Chunk 0: JSON
  view.setUint32(12, paddedJsonLen, true);
  view.setUint32(16, 0x4e4f534a, true); // 'JSON'
  outBytes.set(paddedJsonBytes, 20);

  // Chunk 1: BIN
  const binChunkHeaderOffset = 20 + paddedJsonLen;
  view.setUint32(binChunkHeaderOffset, totalBinLength, true);
  view.setUint32(binChunkHeaderOffset + 4, 0x004e4942, true); // 'BIN\0'
  outBytes.set(binBuffer, binChunkHeaderOffset + 8);

  return glbBuffer;
}

/**
 * Loads a custom .glb URL or ObjectURL and returns a single merged, normalized BufferGeometry
 * so it can be textured and raycasted inside Viewport3DStudio.
 */
export function loadCustomGlbGeometry(
  url: string
): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        let foundGeometry: THREE.BufferGeometry | null = null;
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && !foundGeometry) {
            const mesh = child as THREE.Mesh;
            foundGeometry = mesh.geometry.clone();
          }
        });
        if (!foundGeometry) {
          reject(new Error("No 3D mesh found inside .glb file"));
          return;
        }
        const geom = foundGeometry as THREE.BufferGeometry;
        geom.computeBoundingBox();
        if (geom.boundingBox) {
          const center = new THREE.Vector3();
          geom.boundingBox.getCenter(center);
          const size = new THREE.Vector3();
          geom.boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z, 0.001);
          const targetScale = 2.2 / maxDim;
          geom.translate(-center.x, -center.y, -center.z);
          geom.scale(targetScale, targetScale, targetScale);
        }
        geom.computeVertexNormals();
        resolve(geom);
      },
      undefined,
      (err) => reject(err)
    );
  });
}
