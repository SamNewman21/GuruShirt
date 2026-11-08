"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  DesignLayer,
  GarmentPanelId,
  GarmentState,
  PANEL_UV_MAP,
} from "@/types/studio";
import { createGarmentGeometry } from "@/lib/garmentMeshes3D";
import {
  MousePointerClick,
  Orbit,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface Viewport3DStudioProps {
  masterCanvas: HTMLCanvasElement | null;
  textureVersion: number;
  garment: GarmentState;
  selectedLayerId: string | null;
  activePanel: GarmentPanelId;
  onSelectPanel: (panel: GarmentPanelId) => void;
  onUpdateLayer: (id: string, patch: Partial<DesignLayer>) => void;
}

const DEFAULT_CAMERA_DISTANCE = 4.6;

function uvToPanelCoordinate(
  u: number,
  v: number
): { panel: GarmentPanelId; x: number; y: number } | null {
  const canvasU = u;
  const canvasV = 1 - v;

  for (const panelId of Object.keys(PANEL_UV_MAP) as GarmentPanelId[]) {
    const rect = PANEL_UV_MAP[panelId];
    if (
      canvasU >= rect.uMin &&
      canvasU <= rect.uMax &&
      canvasV >= rect.vMin &&
      canvasV <= rect.vMax
    ) {
      const normX = (canvasU - rect.uMin) / (rect.uMax - rect.uMin);
      const normY = (canvasV - rect.vMin) / (rect.vMax - rect.vMin);
      return {
        panel: panelId,
        x: Math.max(0.02, Math.min(0.98, normX)),
        y: Math.max(0.02, Math.min(0.98, normY)),
      };
    }
  }
  return null;
}

export default function Viewport3DStudio({
  masterCanvas,
  textureVersion,
  garment,
  selectedLayerId,
  activePanel,
  onSelectPanel,
  onUpdateLayer,
}: Viewport3DStudioProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [directDragMode, setDirectDragMode] = useState(false);
  const [zoom3D, setZoom3D] = useState<number>(1.0);

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const directDragRef = useRef(directDragMode);
  directDragRef.current = directDragMode;

  const selectedLayerIdRef = useRef(selectedLayerId);
  selectedLayerIdRef.current = selectedLayerId;

  const onSelectPanelRef = useRef(onSelectPanel);
  onSelectPanelRef.current = onSelectPanel;

  const onUpdateLayerRef = useRef(onUpdateLayer);
  onUpdateLayerRef.current = onUpdateLayer;

  const geometry = useMemo(
    () => createGarmentGeometry(garment.garmentType),
    [garment.garmentType]
  );

  // Set 3D camera distance from a zoom multiplier (0.25 .. 2.5)
  const applyZoomLevel = (nextZoom: number) => {
    const clamped = Math.max(0.25, Math.min(2.5, Number(nextZoom.toFixed(2))));
    setZoom3D(clamped);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;

    const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target);
    if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
    dir.normalize();

    const targetDist = DEFAULT_CAMERA_DISTANCE / clamped;
    cam.position.copy(ctrl.target).addScaledVector(dir, targetDist);
    ctrl.update();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.15, DEFAULT_CAMERA_DISTANCE);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(3.5, 4.5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa5b4fc, 0.65);
    rimLight.position.set(-3.5, 2.5, -3.5);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.35);
    fillLight.position.set(0, 2.2, 2.2);
    scene.add(fillLight);

    const ringGeo = new THREE.RingGeometry(0.65, 0.95, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.position.set(0, -1.28, 0);
    scene.add(floorRing);

    const material = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      roughness: 0.82,
      metalness: 0.03,
    });
    materialRef.current = material;

    const garmentMesh = new THREE.Mesh(geometry, material);
    garmentMesh.position.set(0, 0.12, 0);
    garmentMesh.castShadow = true;
    garmentMesh.receiveShadow = true;
    scene.add(garmentMesh);
    meshRef.current = garmentMesh;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.4;
    controls.maxDistance = 16.0; // Allow zooming way out!
    controlsRef.current = controls;

    // Sync top-right zoom slider when user scrolls mouse wheel in 3D
    const onControlsChange = () => {
      const dist = camera.position.distanceTo(controls.target);
      if (dist > 0.05) {
        const computedZoom = Math.max(
          0.25,
          Math.min(2.5, Number((DEFAULT_CAMERA_DISTANCE / dist).toFixed(2)))
        );
        setZoom3D(computedZoom);
      }
    };
    controls.addEventListener("change", onControlsChange);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDraggingOnShirt = false;

    const performRaycastPlacement = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(garmentMesh, false);
      if (intersects.length > 0 && intersects[0].uv) {
        const hitUV = intersects[0].uv;
        const mapped = uvToPanelCoordinate(hitUV.x, hitUV.y);
        if (mapped) {
          onSelectPanelRef.current(mapped.panel);
          if (selectedLayerIdRef.current) {
            onUpdateLayerRef.current(selectedLayerIdRef.current, {
              panel: mapped.panel,
              x: Number(mapped.x.toFixed(3)),
              y: Number(mapped.y.toFixed(3)),
            });
          }
          return true;
        }
      }
      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!directDragRef.current) return;
      const hit = performRaycastPlacement(e.clientX, e.clientY);
      if (hit) {
        isDraggingOnShirt = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!directDragRef.current || !isDraggingOnShirt) return;
      performRaycastPlacement(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      isDraggingOnShirt = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", onPointerDown);
    domElem.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let reqId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (autoRotateRef.current && !isDraggingOnShirt) {
        garmentMesh.rotation.y += delta * 0.5;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      controls.removeEventListener("change", onControlsChange);
      domElem.removeEventListener("pointerdown", onPointerDown);
      domElem.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry = geometry;
    }
  }, [geometry]);

  useEffect(() => {
    if (!masterCanvas || !materialRef.current) return;
    const tex = new THREE.CanvasTexture(masterCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    textureRef.current = tex;
    materialRef.current.map = tex;
    materialRef.current.needsUpdate = true;
  }, [masterCanvas]);

  useEffect(() => {
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [textureVersion]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enableRotate = !directDragMode;
    }
  }, [directDragMode]);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    switch (garment.fabric) {
      case "nylon-tech":
        mat.roughness = 0.35;
        mat.metalness = 0.15;
        break;
      case "french-terry":
        mat.roughness = 0.92;
        mat.metalness = 0.02;
        break;
      case "ribbed-knit":
        mat.roughness = 0.85;
        mat.metalness = 0.04;
        break;
      case "mesh":
        mat.roughness = 0.65;
        mat.metalness = 0.08;
        break;
      case "heavy-cotton":
      default:
        mat.roughness = 0.82;
        mat.metalness = 0.03;
        break;
    }
    mat.needsUpdate = true;
  }, [garment.fabric]);

  useEffect(() => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const mesh = meshRef.current;
    if (!cam || !ctrl) return;
    if (mesh) mesh.rotation.y = 0;

    const dist = DEFAULT_CAMERA_DISTANCE / zoom3D;

    if (activePanel === "front") {
      cam.position.set(0, 0.15, dist);
      ctrl.target.set(0, 0.05, 0);
    } else if (activePanel === "back") {
      cam.position.set(0, 0.15, -dist);
      ctrl.target.set(0, 0.05, 0);
    } else if (activePanel === "leftSleeve") {
      cam.position.set(dist * 0.88, 0.3, dist * 0.35);
      ctrl.target.set(0.35, 0.15, 0);
    } else if (activePanel === "rightSleeve") {
      cam.position.set(-dist * 0.88, 0.3, dist * 0.35);
      ctrl.target.set(-0.35, 0.15, 0);
    } else if (activePanel === "collar") {
      cam.position.set(0, 1.35, dist * 0.62);
      ctrl.target.set(0, 0.85, 0);
    }
    ctrl.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, garment.garmentType]);

  return (
    <div className="relative flex flex-col w-full h-full bg-gradient-to-b from-[#131720] via-[#0e1117] to-[#090b0f] select-none overflow-hidden">
      <div
        ref={mountRef}
        className={`relative flex-1 w-full h-full overflow-hidden ${
          directDragMode
            ? "cursor-crosshair"
            : "cursor-grab active:cursor-grabbing"
        }`}
      />

      {/* Top-Right Compact 3D Controls & Zoom Slider */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={() => setDirectDragMode((d) => !d)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-md transition-all ${
            directDragMode
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
              : "bg-studio-panel/90 border-studio-border text-slate-300 hover:text-white"
          }`}
        >
          {directDragMode ? (
            <>
              <MousePointerClick className="w-3.5 h-3.5" />
              3D Direct Drag: ON
            </>
          ) : (
            <>
              <Orbit className="w-3.5 h-3.5" />
              Orbit Camera
            </>
          )}
        </button>

        <button
          onClick={() => setAutoRotate((r) => !r)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-md transition-all ${
            autoRotate
              ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
              : "bg-studio-panel/90 border-studio-border text-slate-300 hover:text-white"
          }`}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`}
          />
          Turntable
        </button>

        {/* Top-Right 3D Zoom Slider */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-studio-panel/90 border border-studio-border backdrop-blur-md shadow-lg">
          <button
            onClick={() => applyZoomLevel(zoom3D - 0.15)}
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
            value={zoom3D}
            onChange={(e) => applyZoomLevel(parseFloat(e.target.value))}
            className="w-28 accent-indigo-500 cursor-pointer"
            title="3D Zoom Slider (25% - 250%)"
          />
          <button
            onClick={() => applyZoomLevel(zoom3D + 0.15)}
            className="p-1 rounded hover:bg-studio-surface text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyZoomLevel(1.0)}
            className="px-1.5 py-0.5 rounded bg-studio-surface text-[11px] font-mono text-slate-200 hover:text-white min-w-[44px] text-center"
            title="Reset 3D Zoom to 100%"
          >
            {Math.round(zoom3D * 100)}%
          </button>
        </div>
      </div>
    </div>
  );
}
