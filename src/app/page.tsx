"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  DesignLayer,
  GARMENT_CATALOG,
  GarmentPanelId,
  GarmentState,
  GarmentType,
  PatternViewMode,
  TextLayerConfig,
  UploadedAsset,
  ViewMode,
  WardrobeItem,
} from "@/types/studio";
import { SAMPLE_MOTIFS } from "@/lib/sampleMotifs";
import {
  renderMasterUVTexture,
  renderTextConfigToDataUrl,
} from "@/lib/textureEngine";
import Canvas2DEditor from "@/components/Canvas2DEditor";
import BottomToolDock from "@/components/BottomToolDock";
import { Shirt } from "lucide-react";

const Viewport3DStudio = dynamic(
  () => import("@/components/Viewport3DStudio"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full bg-[#0e1117] text-slate-400 text-xs">
        Initializing 3D Garment Engine...
      </div>
    ),
  }
);

const WARDROBE_STORAGE_KEY = "gurushirt_wardrobe_v2";
const UPLOADED_ASSETS_STORAGE_KEY = "gurushirt_uploaded_assets_v2";

const STARTER_WARDROBE: WardrobeItem[] = [
  {
    id: "wardrobe-starter-hoodie",
    name: "Neo Tokyo Heavy Hoodie",
    garmentType: "hoodie",
    createdAt: "Starter Closet",
    thumbnailDataUrl: SAMPLE_MOTIFS[1].src,
    garment: {
      garmentType: "hoodie",
      panelColors: {
        front: "#0f172a",
        back: "#0f172a",
        leftSleeve: "#1e293b",
        rightSleeve: "#1e293b",
        collar: "#090d16",
      },
      stitchColor: "#38bdf8",
      fabric: "french-terry",
      showSeams: true,
      showPrintGuides: true,
    },
    layers: [
      {
        id: "starter-hoodie-layer-1",
        name: SAMPLE_MOTIFS[1].name,
        src: SAMPLE_MOTIFS[1].src,
        panel: "front",
        x: 0.5,
        y: 0.36,
        width: 0.42,
        height: 0.42,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        flipX: false,
        flipY: false,
        invert: false,
        singleColorMode: false,
        singleColorHex: "#ffffff",
        singleColorThreshold: 140,
        tintEnabled: false,
        tintHex: "#38bdf8",
        removeBg: false,
        removeBgTolerance: 35,
        blendMode: "source-over",
        multiplyPattern: {
          enabled: false,
          cols: 2,
          rows: 2,
          gapX: 0.15,
          gapY: 0.15,
          stagger: false,
        },
        crop: { top: 0, right: 0, bottom: 0, left: 0, shape: "rect" },
      },
    ],
  },
  {
    id: "wardrobe-starter-jacket",
    name: "Turbo 99 Puffer Jacket",
    garmentType: "jacket",
    createdAt: "Starter Closet",
    thumbnailDataUrl: SAMPLE_MOTIFS[4].src,
    garment: {
      garmentType: "jacket",
      panelColors: {
        front: "#18181b",
        back: "#18181b",
        leftSleeve: "#991b1b",
        rightSleeve: "#991b1b",
        collar: "#09090b",
      },
      stitchColor: "#facc15",
      fabric: "nylon-tech",
      showSeams: true,
      showPrintGuides: true,
    },
    layers: [
      {
        id: "starter-jacket-layer-1",
        name: SAMPLE_MOTIFS[4].name,
        src: SAMPLE_MOTIFS[4].src,
        panel: "back",
        x: 0.5,
        y: 0.4,
        width: 0.52,
        height: 0.38,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        flipX: false,
        flipY: false,
        invert: false,
        singleColorMode: false,
        singleColorHex: "#ffffff",
        singleColorThreshold: 140,
        tintEnabled: false,
        tintHex: "#ef4444",
        removeBg: false,
        removeBgTolerance: 35,
        blendMode: "source-over",
        multiplyPattern: {
          enabled: false,
          cols: 2,
          rows: 2,
          gapX: 0.15,
          gapY: 0.15,
          stagger: false,
        },
        crop: { top: 0, right: 0, bottom: 0, left: 0, shape: "rect" },
      },
    ],
  },
];

interface HistorySnapshot {
  garment: GarmentState;
  layers: DesignLayer[];
}

export default function GuruShirtStudioPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [patternViewMode, setPatternViewMode] =
    useState<PatternViewMode>("single-panel");
  const [activePanel, setActivePanel] = useState<GarmentPanelId>("front");

  // Garment State (now supports all 7 clothing types)
  const [garment, setGarment] = useState<GarmentState>({
    garmentType: "tshirt",
    panelColors: {
      front: "#181b22",
      back: "#181b22",
      leftSleeve: "#181b22",
      rightSleeve: "#181b22",
      collar: "#111318",
    },
    stitchColor: "#475569",
    fabric: "heavy-cotton",
    showSeams: true,
    showPrintGuides: true,
  });

  // Design Layers State
  const [layers, setLayers] = useState<DesignLayer[]>([
    {
      id: "layer-initial-1",
      name: SAMPLE_MOTIFS[0].name,
      src: SAMPLE_MOTIFS[0].src,
      panel: "front",
      x: 0.5,
      y: 0.38,
      width: 0.42,
      height: 0.42,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      flipX: false,
      flipY: false,
      invert: false,
      singleColorMode: false,
      singleColorHex: "#ffffff",
      singleColorThreshold: 145,
      tintEnabled: false,
      tintHex: "#6366f1",
      removeBg: false,
      removeBgTolerance: 35,
      blendMode: "source-over",
      multiplyPattern: {
        enabled: false,
        cols: 2,
        rows: 2,
        gapX: 0.15,
        gapY: 0.15,
        stagger: false,
      },
      crop: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        shape: "rect",
      },
    },
  ]);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    "layer-initial-1"
  );

  // Undo / Redo History
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  const pushHistory = useCallback(
    (curGarment: GarmentState, curLayers: DesignLayer[]) => {
      setPast((prev) => [
        ...prev.slice(-24),
        {
          garment: JSON.parse(JSON.stringify(curGarment)),
          layers: JSON.parse(JSON.stringify(curLayers)),
        },
      ]);
      setFuture([]);
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [
      {
        garment: JSON.parse(JSON.stringify(garment)),
        layers: JSON.parse(JSON.stringify(layers)),
      },
      ...prev,
    ]);
    setGarment(previous.garment);
    setLayers(previous.layers);
  }, [past, garment, layers]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [
      ...prev,
      {
        garment: JSON.parse(JSON.stringify(garment)),
        layers: JSON.parse(JSON.stringify(layers)),
      },
    ]);
    setGarment(next.garment);
    setLayers(next.layers);
  }, [future, garment, layers]);

  // Digital Wardrobe & Uploaded Designs Vault (persisted in localStorage)
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(STARTER_WARDROBE);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);

  useEffect(() => {
    try {
      const savedW = localStorage.getItem(WARDROBE_STORAGE_KEY);
      if (savedW) {
        const parsed = JSON.parse(savedW);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWardrobe(parsed);
        }
      }
      const savedA = localStorage.getItem(UPLOADED_ASSETS_STORAGE_KEY);
      if (savedA) {
        const parsedA = JSON.parse(savedA);
        if (Array.isArray(parsedA)) {
          setUploadedAssets(parsedA);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const persistWardrobe = (next: WardrobeItem[]) => {
    setWardrobe(next);
    try {
      localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota
    }
  };

  // Offscreen 2048x2048 Master UV Texture Canvas bridged to 3D
  const [masterCanvas, setMasterCanvas] = useState<HTMLCanvasElement | null>(
    null
  );
  const [textureVersion, setTextureVersion] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 2048;
    offscreen.height = 2048;
    setMasterCanvas(offscreen);
  }, []);

  const rebuildMasterTexture = useCallback(() => {
    if (!masterCanvas) return;
    renderMasterUVTexture(masterCanvas, garment, layers, () => {
      renderMasterUVTexture(masterCanvas, garment, layers);
      setTextureVersion((v) => v + 1);
    });
    setTextureVersion((v) => v + 1);
  }, [masterCanvas, garment, layers]);

  useEffect(() => {
    rebuildMasterTexture();
  }, [rebuildMasterTexture]);

  const selectedLayer =
    layers.find((l) => l.id === selectedLayerId) || null;

  const handleUpdateLayer = useCallback(
    (id: string, patch: Partial<DesignLayer>) => {
      setLayers((prev) =>
        prev.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer))
      );
    },
    []
  );

  const handleAddGraphicLayer = (name: string, src: string) => {
    pushHistory(garment, layers);
    const newLayer: DesignLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      src,
      panel: activePanel,
      x: 0.5,
      y: 0.4,
      width: 0.38,
      height: 0.38,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      flipX: false,
      flipY: false,
      invert: false,
      singleColorMode: false,
      singleColorHex: "#ffffff",
      singleColorThreshold: 140,
      tintEnabled: false,
      tintHex: "#6366f1",
      removeBg: false,
      removeBgTolerance: 35,
      blendMode: "source-over",
      multiplyPattern: {
        enabled: false,
        cols: 2,
        rows: 2,
        gapX: 0.15,
        gapY: 0.15,
        stagger: false,
      },
      crop: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        shape: "rect",
      },
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleAddOrUpdateTextLayer = (
    cfg: TextLayerConfig,
    createNew: boolean
  ) => {
    const dataUrl = renderTextConfigToDataUrl(cfg);
    if (!dataUrl) return;

    if (!createNew && selectedLayer && selectedLayer.textConfig) {
      handleUpdateLayer(selectedLayer.id, {
        name: `Text: ${cfg.text.slice(0, 16) || "Custom"}`,
        src: dataUrl,
        textConfig: cfg,
      });
      return;
    }

    pushHistory(garment, layers);
    const newLayer: DesignLayer = {
      id: `layer-text-${Date.now()}`,
      name: `Text: ${cfg.text.slice(0, 16) || "Custom"}`,
      src: dataUrl,
      panel: activePanel,
      x: 0.5,
      y: 0.36,
      width: 0.48,
      height: 0.26,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      flipX: false,
      flipY: false,
      invert: false,
      singleColorMode: false,
      singleColorHex: "#ffffff",
      singleColorThreshold: 140,
      tintEnabled: false,
      tintHex: "#6366f1",
      removeBg: false,
      removeBgTolerance: 35,
      textConfig: cfg,
      blendMode: "source-over",
      multiplyPattern: {
        enabled: false,
        cols: 2,
        rows: 2,
        gapX: 0.15,
        gapY: 0.15,
        stagger: false,
      },
      crop: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        shape: "rect",
      },
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        handleAddGraphicLayer(cleanName, reader.result);

        // Save into user's personal Uploaded Designs Vault
        const nextAssets: UploadedAsset[] = [
          {
            id: `asset-${Date.now()}`,
            name: cleanName,
            src: reader.result,
            createdAt: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          ...uploadedAssets.slice(0, 15),
        ];
        setUploadedAssets(nextAssets);
        try {
          localStorage.setItem(
            UPLOADED_ASSETS_STORAGE_KEY,
            JSON.stringify(nextAssets)
          );
        } catch {
          // ignore quota
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDuplicateLayer = (id: string) => {
    const orig = layers.find((l) => l.id === id);
    if (!orig) return;
    pushHistory(garment, layers);
    const copy: DesignLayer = {
      ...orig,
      id: `layer-${Date.now()}`,
      name: `${orig.name} (Copy)`,
      x: Math.min(0.9, orig.x + 0.06),
      y: Math.min(0.9, orig.y + 0.06),
      multiplyPattern: { ...orig.multiplyPattern },
      crop: { ...orig.crop },
      textConfig: orig.textConfig ? { ...orig.textConfig } : undefined,
    };
    setLayers((prev) => [...prev, copy]);
    setSelectedLayerId(copy.id);
  };

  const handleDeleteLayer = useCallback(
    (id: string) => {
      pushHistory(garment, layers);
      setLayers((prev) => prev.filter((l) => l.id !== id));
      if (selectedLayerId === id) {
        setSelectedLayerId(null);
      }
    },
    [garment, layers, pushHistory, selectedLayerId]
  );

  const handleMoveLayerOrder = (id: string, dir: "up" | "down") => {
    pushHistory(garment, layers);
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const targetIdx = dir === "up" ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const handleUpdateGarment = (patch: Partial<GarmentState>) => {
    pushHistory(garment, layers);
    setGarment((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectGarmentType = (type: GarmentType) => {
    pushHistory(garment, layers);
    setGarment((prev) => ({
      ...prev,
      garmentType: type,
      fabric: GARMENT_CATALOG[type].defaultFabric,
    }));
  };

  const handleSetPanelColor = (
    panel: GarmentPanelId | "all",
    color: string
  ) => {
    pushHistory(garment, layers);
    setGarment((prev) => {
      if (panel === "all") {
        return {
          ...prev,
          panelColors: {
            front: color,
            back: color,
            leftSleeve: color,
            rightSleeve: color,
            collar: color,
          },
        };
      }
      return {
        ...prev,
        panelColors: {
          ...prev.panelColors,
          [panel]: color,
        },
      };
    });
  };

  const handleSaveToWardrobe = (name: string) => {
    let thumb = layers[layers.length - 1]?.src || SAMPLE_MOTIFS[0].src;
    if (masterCanvas) {
      // Generate a lightweight 256x256 thumbnail from the front UV island
      const tCanvas = document.createElement("canvas");
      tCanvas.width = 240;
      tCanvas.height = 240;
      const tCtx = tCanvas.getContext("2d");
      if (tCtx) {
        tCtx.drawImage(masterCanvas, 0, 0, 1024, 1400, 0, 0, 240, 240);
        thumb = tCanvas.toDataURL("image/jpeg", 0.8);
      }
    }

    const newItem: WardrobeItem = {
      id: `wardrobe-${Date.now()}`,
      name,
      garmentType: garment.garmentType,
      createdAt: new Date().toLocaleDateString([], {
        month: "short",
        day: "numeric",
      }),
      thumbnailDataUrl: thumb,
      garment: JSON.parse(JSON.stringify(garment)),
      layers: JSON.parse(JSON.stringify(layers)),
    };
    persistWardrobe([newItem, ...wardrobe]);
  };

  const handleLoadWardrobeItem = (item: WardrobeItem) => {
    pushHistory(garment, layers);
    setGarment(JSON.parse(JSON.stringify(item.garment)));
    const clonedLayers: DesignLayer[] = JSON.parse(JSON.stringify(item.layers));
    setLayers(clonedLayers);
    setSelectedLayerId(clonedLayers[clonedLayers.length - 1]?.id || null);
    setActivePanel("front");
  };

  const handleDeleteWardrobeItem = (id: string) => {
    persistWardrobe(wardrobe.filter((w) => w.id !== id));
  };

  const handleExportPatternPNG = () => {
    if (!masterCanvas) return;
    const url = masterCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `gurushirt-${garment.garmentType}-pattern-spec.png`;
    a.click();
  };

  // Global Keyboard Shortcuts (Undo, Redo, Delete, Arrow Nudge)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (selectedLayerId) {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          handleDeleteLayer(selectedLayerId);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          const cur = layers.find((l) => l.id === selectedLayerId);
          if (cur)
            handleUpdateLayer(selectedLayerId, {
              x: Math.max(0.02, Number((cur.x - 0.01).toFixed(3))),
            });
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          const cur = layers.find((l) => l.id === selectedLayerId);
          if (cur)
            handleUpdateLayer(selectedLayerId, {
              x: Math.min(0.98, Number((cur.x + 0.01).toFixed(3))),
            });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const cur = layers.find((l) => l.id === selectedLayerId);
          if (cur)
            handleUpdateLayer(selectedLayerId, {
              y: Math.max(0.02, Number((cur.y - 0.01).toFixed(3))),
            });
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const cur = layers.find((l) => l.id === selectedLayerId);
          if (cur)
            handleUpdateLayer(selectedLayerId, {
              y: Math.min(0.98, Number((cur.y + 0.01).toFixed(3))),
            });
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleDeleteLayer,
    handleUpdateLayer,
    selectedLayerId,
    layers,
  ]);

  return (
    <div className="relative h-screen w-screen bg-studio-bg text-slate-100 overflow-hidden select-none">
      {/* Hidden File Input for Importing Designs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Minimal Floating Top-Left Brand & Active Garment Pill */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-studio-panel/90 border border-studio-border backdrop-blur-md shadow-lg pointer-events-none">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
          <Shirt className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs tracking-wide text-white leading-none">
              GURUSHIRT
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
              {GARMENT_CATALOG[garment.garmentType].shortName}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {viewMode === "2d" ? "2D Design Canvas" : "3D Garment Studio"}
          </span>
        </div>
      </div>

      {/* SINGLE FULL-SCREEN VIEWPORT (Either 2D or 3D) */}
      <main className="w-full h-full overflow-hidden">
        {viewMode === "2d" ? (
          <Canvas2DEditor
            garment={garment}
            layers={layers}
            selectedLayerId={selectedLayerId}
            activePanel={activePanel}
            patternViewMode={patternViewMode}
            onSelectLayer={setSelectedLayerId}
            onSelectPanel={setActivePanel}
            onPatternViewModeChange={setPatternViewMode}
            onUpdateLayer={handleUpdateLayer}
            onTextureDirty={rebuildMasterTexture}
          />
        ) : (
          <Viewport3DStudio
            masterCanvas={masterCanvas}
            textureVersion={textureVersion}
            garment={garment}
            selectedLayerId={selectedLayerId}
            activePanel={activePanel}
            onSelectPanel={setActivePanel}
            onUpdateLayer={handleUpdateLayer}
          />
        )}
      </main>

      {/* UNIFIED EXPANDABLE BOTTOM TOOL DOCK */}
      <BottomToolDock
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activePanel={activePanel}
        onSelectPanel={setActivePanel}
        layers={layers}
        selectedLayer={selectedLayer}
        onSelectLayer={setSelectedLayerId}
        onAddGraphicLayer={handleAddGraphicLayer}
        onAddOrUpdateTextLayer={handleAddOrUpdateTextLayer}
        onTriggerUpload={() => fileInputRef.current?.click()}
        onUpdateLayer={handleUpdateLayer}
        onDuplicateLayer={handleDuplicateLayer}
        onDeleteLayer={handleDeleteLayer}
        onMoveLayerOrder={handleMoveLayerOrder}
        garment={garment}
        onUpdateGarment={handleUpdateGarment}
        onSelectGarmentType={handleSelectGarmentType}
        onSetPanelColor={handleSetPanelColor}
        wardrobe={wardrobe}
        uploadedAssets={uploadedAssets}
        onSaveToWardrobe={handleSaveToWardrobe}
        onLoadWardrobeItem={handleLoadWardrobeItem}
        onDeleteWardrobeItem={handleDeleteWardrobeItem}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExportSpec={handleExportPatternPNG}
      />
    </div>
  );
}
