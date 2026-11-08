"use client";

import React, { useState } from "react";
import {
  BlendModeType,
  CropShapeType,
  DesignLayer,
  FabricType,
  GARMENT_CATALOG,
  GarmentPanelId,
  GarmentState,
  GarmentType,
  getPanelLabel,
  PANEL_UV_MAP,
  TextLayerConfig,
  UploadedAsset,
  ViewMode,
  WardrobeItem,
} from "@/types/studio";
import { SAMPLE_MOTIFS, SampleMotif } from "@/lib/sampleMotifs";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Box,
  ChevronDown,
  ChevronUp,
  Contrast,
  Copy,
  Crop,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  FolderOpen,
  FolderPlus,
  Grid,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Lock,
  Move,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Shirt,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Wand2,
} from "lucide-react";

export type BottomDrawerTab =
  | "designs"
  | "transform"
  | "color"
  | "multiply-crop"
  | "garment"
  | "wardrobe"
  | null;

interface BottomToolDockProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  activePanel: GarmentPanelId;
  onSelectPanel: (panel: GarmentPanelId) => void;
  layers: DesignLayer[];
  selectedLayer: DesignLayer | null;
  onSelectLayer: (id: string | null) => void;
  onAddGraphicLayer: (name: string, src: string) => void;
  onAddOrUpdateTextLayer: (cfg: TextLayerConfig, createNew: boolean) => void;
  onTriggerUpload: () => void;
  onUpdateLayer: (id: string, patch: Partial<DesignLayer>) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayerOrder: (id: string, dir: "up" | "down") => void;
  garment: GarmentState;
  onUpdateGarment: (patch: Partial<GarmentState>) => void;
  onSelectGarmentType: (type: GarmentType) => void;
  onSetPanelColor: (panel: GarmentPanelId | "all", color: string) => void;
  wardrobe: WardrobeItem[];
  uploadedAssets: UploadedAsset[];
  onSaveToWardrobe: (name: string) => void;
  onLoadWardrobeItem: (item: WardrobeItem) => void;
  onDeleteWardrobeItem: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExportSpec: () => void;
}

const PRESET_SWATCHES = [
  "#111318",
  "#f8fafc",
  "#dc2626",
  "#ea580c",
  "#eab308",
  "#16a34a",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#d6d3d1",
];

const FONT_OPTIONS = [
  { label: "Impact Heavy", value: "Impact, Arial Black, sans-serif" },
  { label: "Street Sans", value: "Arial Black, Helvetica, sans-serif" },
  { label: "Collegiate Serif", value: "Georgia, Times New Roman, serif" },
  { label: "Tech Mono", value: "Courier New, monospace" },
  { label: "Modern Display", value: "Trebuchet MS, sans-serif" },
];

export default function BottomToolDock({
  viewMode,
  onViewModeChange,
  activePanel,
  onSelectPanel,
  layers,
  selectedLayer,
  onSelectLayer,
  onAddGraphicLayer,
  onAddOrUpdateTextLayer,
  onTriggerUpload,
  onUpdateLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onMoveLayerOrder,
  garment,
  onUpdateGarment,
  onSelectGarmentType,
  onSetPanelColor,
  wardrobe,
  uploadedAssets,
  onSaveToWardrobe,
  onLoadWardrobeItem,
  onDeleteWardrobeItem,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExportSpec,
}: BottomToolDockProps) {
  const [openTab, setOpenTab] = useState<BottomDrawerTab>(null);
  const [lockAspect, setLockAspect] = useState(true);
  const [wardrobeName, setWardrobeName] = useState("");
  const [wardrobeFilter, setWardrobeFilter] = useState<GarmentType | "all">(
    "all"
  );

  // Live Text Studio local state (syncs with selected text layer if one is selected)
  const [textDraft, setTextDraft] = useState<TextLayerConfig>({
    text: "GURUSHIRT",
    fontFamily: FONT_OPTIONS[0].value,
    color: "#ffffff",
    strokeColor: "#111318",
    strokeWidth: 6,
    letterSpacing: 4,
    archCurve: 0,
  });

  const activeTextConfig = selectedLayer?.textConfig || textDraft;

  const updateTextConfig = (patch: Partial<TextLayerConfig>) => {
    const next = { ...activeTextConfig, ...patch };
    setTextDraft(next);
    if (selectedLayer?.textConfig) {
      onAddOrUpdateTextLayer(next, false);
    }
  };

  const toggleTab = (tab: Exclude<BottomDrawerTab, null>) => {
    setOpenTab((prev) => (prev === tab ? null : tab));
  };

  const currentGarmentEntry =
    GARMENT_CATALOG[garment.garmentType] || GARMENT_CATALOG.tshirt;

  const filteredWardrobe =
    wardrobeFilter === "all"
      ? wardrobe
      : wardrobe.filter((item) => item.garmentType === wardrobeFilter);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[97vw] max-w-7xl flex flex-col items-center select-none pointer-events-none">
      {/* EXPANDABLE DRAWER PANEL */}
      {openTab !== null && (
        <div className="w-full mb-2 rounded-2xl bg-[#151821]/95 border border-studio-border backdrop-blur-xl shadow-2xl overflow-hidden pointer-events-auto transition-all">
          {/* Drawer Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#10131a] border-b border-studio-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                {openTab === "designs" &&
                  "Designs, Live Typography & Layer Stack"}
                {openTab === "transform" && "Size, Shape, Rotation & Placement"}
                {openTab === "color" &&
                  "Single-Color Stencil, Auto-Cutout & Invert"}
                {openTab === "multiply-crop" &&
                  "Multiply Pattern Repeat & 8 Shape Cutouts"}
                {openTab === "garment" &&
                  "7 Garment Types, Panel Dyeing & PBR Fabrics"}
                {openTab === "wardrobe" &&
                  `Digital Wardrobe Closet (${wardrobe.length} Saved Items)`}
              </span>
              {selectedLayer &&
                openTab !== "garment" &&
                openTab !== "wardrobe" && (
                  <span className="text-xs text-slate-400">
                    — Selected:{" "}
                    <strong className="text-slate-200">
                      {selectedLayer.name}
                    </strong>
                  </span>
                )}
            </div>

            <div className="flex items-center gap-2">
              {selectedLayer && openTab !== "wardrobe" && (
                <>
                  <button
                    onClick={() => onDuplicateLayer(selectedLayer.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-surface hover:bg-slate-700 text-xs text-slate-200"
                  >
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                  <button
                    onClick={() => onDeleteLayer(selectedLayer.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-xs text-rose-300"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </>
              )}
              <button
                onClick={() => setOpenTab(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-surface hover:bg-slate-700 text-xs text-slate-300"
              >
                <ChevronDown className="w-3.5 h-3.5" /> Collapse
              </button>
            </div>
          </div>

          {/* Drawer Content Body */}
          <div className="p-4 max-h-[42vh] overflow-y-auto">
            {/* TAB 1: DESIGNS, LIVE TEXT & LAYER STACK */}
            {openTab === "designs" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Col 1: Upload + Motifs + Uploaded Vault */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/10">
                    <div>
                      <p className="text-xs font-bold text-indigo-200">
                        Upload Custom Graphic
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG, SVG, WebP →{" "}
                        {
                          getPanelLabel(garment.garmentType, activePanel)
                            .shortLabel
                        }
                      </p>
                    </div>
                    <button
                      onClick={onTriggerUpload}
                      className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow shrink-0"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Upload File
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Starter Motifs & Uploaded Vault
                    </span>
                    <div className="grid grid-cols-5 gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {uploadedAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() =>
                            onAddGraphicLayer(asset.name, asset.src)
                          }
                          className="group flex flex-col items-center p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 hover:border-indigo-400 transition-all"
                          title={`Uploaded: ${asset.name}`}
                        >
                          <img
                            src={asset.src}
                            alt={asset.name}
                            className="w-10 h-10 object-contain"
                          />
                          <span className="mt-1 text-[9px] text-indigo-200 truncate w-full text-center">
                            {asset.name}
                          </span>
                        </button>
                      ))}
                      {SAMPLE_MOTIFS.map((motif: SampleMotif) => (
                        <button
                          key={motif.id}
                          onClick={() =>
                            onAddGraphicLayer(motif.name, motif.src)
                          }
                          className="group flex flex-col items-center p-1.5 rounded-lg bg-studio-surface border border-studio-border hover:border-indigo-500 transition-all"
                          title={`Add ${motif.name}`}
                        >
                          <img
                            src={motif.src}
                            alt={motif.name}
                            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
                          />
                          <span className="mt-1 text-[9px] text-slate-300 truncate w-full text-center">
                            {motif.name.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Col 2: Live Custom Text & Arched Typography Studio */}
                <div className="md:col-span-4 p-3 rounded-xl bg-studio-surface border border-studio-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-indigo-400" />
                      Custom Text & Arch Maker
                    </span>
                    <button
                      onClick={() =>
                        onAddOrUpdateTextLayer(activeTextConfig, true)
                      }
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                    >
                      <Plus className="w-3 h-3" /> Add Text Layer
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={activeTextConfig.text}
                      onChange={(e) =>
                        updateTextConfig({ text: e.target.value })
                      }
                      placeholder="Enter shirt text..."
                      className="px-2.5 py-1.5 rounded-lg bg-studio-bg border border-studio-border text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={activeTextConfig.fontFamily}
                      onChange={(e) =>
                        updateTextConfig({ fontFamily: e.target.value })
                      }
                      className="px-2 py-1.5 rounded-lg bg-studio-bg border border-studio-border text-xs text-slate-200 focus:outline-none"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.label} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Fill:</span>
                      <input
                        type="color"
                        value={activeTextConfig.color}
                        onChange={(e) =>
                          updateTextConfig({ color: e.target.value })
                        }
                        className="w-6 h-6 rounded cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">
                        Outline:
                      </span>
                      <input
                        type="color"
                        value={activeTextConfig.strokeColor}
                        onChange={(e) =>
                          updateTextConfig({ strokeColor: e.target.value })
                        }
                        className="w-6 h-6 rounded cursor-pointer bg-transparent"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Arch: {activeTextConfig.archCurve}%
                      </span>
                      <input
                        type="range"
                        min={-90}
                        max={90}
                        value={activeTextConfig.archCurve}
                        onChange={(e) =>
                          updateTextConfig({
                            archCurve: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Col 3: Active Layers Stack */}
                <div className="md:col-span-3 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Layers ({layers.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {layers.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        No graphics added yet.
                      </p>
                    ) : (
                      [...layers].reverse().map((layer) => {
                        const isSel = selectedLayer?.id === layer.id;
                        return (
                          <div
                            key={layer.id}
                            onClick={() => {
                              onSelectLayer(layer.id);
                              onSelectPanel(layer.panel);
                            }}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer ${
                              isSel
                                ? "bg-indigo-600/25 border-indigo-500 text-white"
                                : "bg-studio-surface border-studio-border text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={layer.src}
                                alt={layer.name}
                                className="w-7 h-7 rounded bg-studio-bg object-contain p-0.5 border border-studio-border"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {layer.name}
                                </p>
                                <p className="text-[10px] text-indigo-300">
                                  {
                                    getPanelLabel(
                                      garment.garmentType,
                                      layer.panel
                                    ).shortLabel
                                  }
                                </p>
                              </div>
                            </div>
                            <div
                              className="flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  onMoveLayerOrder(layer.id, "up")
                                }
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  onMoveLayerOrder(layer.id, "down")
                                }
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  onUpdateLayer(layer.id, {
                                    visible: !layer.visible,
                                  })
                                }
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                              >
                                {layer.visible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3 text-slate-600" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  onUpdateLayer(layer.id, {
                                    locked: !layer.locked,
                                  })
                                }
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                              >
                                {layer.locked ? (
                                  <Lock className="w-3 h-3 text-amber-400" />
                                ) : (
                                  <Unlock className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => onDeleteLayer(layer.id)}
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SIZE, SHAPE, ROTATION & PLACEMENT */}
            {openTab === "transform" &&
              (selectedLayer ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Move Graphic to Clothing Part
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.keys(PANEL_UV_MAP) as GarmentPanelId[]).map(
                        (pid) => (
                          <button
                            key={pid}
                            onClick={() => {
                              onUpdateLayer(selectedLayer.id, { panel: pid });
                              onSelectPanel(pid);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                              selectedLayer.panel === pid
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "bg-studio-surface border-studio-border text-slate-300 hover:text-white"
                            }`}
                          >
                            {
                              getPanelLabel(garment.garmentType, pid)
                                .shortLabel
                            }
                          </button>
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, { x: 0.5, y: 0.36 })
                        }
                        className="py-1.5 rounded bg-studio-surface hover:bg-slate-700 text-xs text-slate-300"
                      >
                        Center
                      </button>
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            x: 0.64,
                            y: 0.28,
                            width: 0.18,
                            height: 0.18,
                          })
                        }
                        className="py-1.5 rounded bg-studio-surface hover:bg-slate-700 text-xs text-slate-300"
                      >
                        Left Badge
                      </button>
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            x: 0.5,
                            y: 0.5,
                            width: 0.65,
                            height: 0.65,
                          })
                        }
                        className="py-1.5 rounded bg-studio-surface hover:bg-slate-700 text-xs text-slate-300"
                      >
                        Oversized
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-studio-surface border border-studio-border mt-1">
                      <span className="text-[11px] font-medium text-slate-200">
                        360° Seam Wrap (Across Edges & Sleeves)
                      </span>
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            wrapAround: selectedLayer.wrapAround === false ? true : false,
                          })
                        }
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          selectedLayer.wrapAround !== false
                            ? "bg-emerald-600 text-white"
                            : "bg-studio-bg text-slate-400"
                        }`}
                      >
                        {selectedLayer.wrapAround !== false ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Size & Shape Stretch
                      </span>
                      <button
                        onClick={() => setLockAspect((l) => !l)}
                        className={`text-[11px] px-2 py-0.5 rounded border ${
                          lockAspect
                            ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                            : "border-studio-border bg-studio-surface text-slate-400"
                        }`}
                      >
                        {lockAspect ? "Ratio Locked" : "Free Stretch"}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Width</span>
                        <span className="font-mono text-slate-400">
                          {Math.round(selectedLayer.width * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={1.25}
                        step={0.01}
                        value={selectedLayer.width}
                        onChange={(e) => {
                          const nextW = parseFloat(e.target.value);
                          if (lockAspect) {
                            const ratio =
                              selectedLayer.height /
                              Math.max(0.05, selectedLayer.width);
                            onUpdateLayer(selectedLayer.id, {
                              width: nextW,
                              height: Number(
                                Math.min(
                                  1.25,
                                  Math.max(0.05, nextW * ratio)
                                ).toFixed(3)
                              ),
                            });
                          } else {
                            onUpdateLayer(selectedLayer.id, { width: nextW });
                          }
                        }}
                        className="w-full accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Height</span>
                        <span className="font-mono text-slate-400">
                          {Math.round(selectedLayer.height * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={1.25}
                        step={0.01}
                        value={selectedLayer.height}
                        onChange={(e) => {
                          const nextH = parseFloat(e.target.value);
                          if (lockAspect) {
                            const ratio =
                              selectedLayer.width /
                              Math.max(0.05, selectedLayer.height);
                            onUpdateLayer(selectedLayer.id, {
                              height: nextH,
                              width: Number(
                                Math.min(
                                  1.25,
                                  Math.max(0.05, nextH * ratio)
                                ).toFixed(3)
                              ),
                            });
                          } else {
                            onUpdateLayer(selectedLayer.id, { height: nextH });
                          }
                        }}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Rotation & Mirror Flip
                    </span>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Angle</span>
                        <span className="font-mono text-slate-400">
                          {selectedLayer.rotation}°
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={1}
                          value={selectedLayer.rotation}
                          onChange={(e) =>
                            onUpdateLayer(selectedLayer.id, {
                              rotation: parseInt(e.target.value, 10),
                            })
                          }
                          className="flex-1 accent-indigo-500"
                        />
                        <button
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, { rotation: 0 })
                          }
                          className="px-2 py-1 rounded bg-studio-surface hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> 0°
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            flipX: !selectedLayer.flipX,
                          })
                        }
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border ${
                          selectedLayer.flipX
                            ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                            : "bg-studio-surface border-studio-border text-slate-300"
                        }`}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" /> Flip X
                      </button>
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            flipY: !selectedLayer.flipY,
                          })
                        }
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border ${
                          selectedLayer.flipY
                            ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                            : "bg-studio-surface border-studio-border text-slate-300"
                        }`}
                      >
                        <FlipVertical className="w-3.5 h-3.5" /> Flip Y
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  Click a graphic on the garment first to adjust its size,
                  shape, or rotation.
                </p>
              ))}

            {/* TAB 3: SINGLE-COLOR STENCIL, SMART BG REMOVER, INVERT & BLEND */}
            {openTab === "color" &&
              (selectedLayer ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Single-Color Stencil Conversion */}
                  <div className="p-3 rounded-xl bg-studio-surface border border-studio-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold text-white">
                            Turn into Single Color
                          </p>
                          <p className="text-[10px] text-slate-400">
                            1-color screen-print stencil
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            singleColorMode: !selectedLayer.singleColorMode,
                          })
                        }
                        className={`px-3 py-1 rounded-md text-xs font-bold ${
                          selectedLayer.singleColorMode
                            ? "bg-emerald-600 text-white"
                            : "bg-studio-bg text-slate-400 hover:text-white"
                        }`}
                      >
                        {selectedLayer.singleColorMode ? "ON" : "OFF"}
                      </button>
                    </div>

                    {selectedLayer.singleColorMode && (
                      <div className="space-y-2 pt-2 border-t border-studio-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">
                            Stencil Ink Color
                          </span>
                          <input
                            type="color"
                            value={selectedLayer.singleColorHex}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                singleColorHex: e.target.value,
                              })
                            }
                            className="w-7 h-7 rounded cursor-pointer bg-transparent"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_SWATCHES.map((hex) => (
                            <button
                              key={hex}
                              onClick={() =>
                                onUpdateLayer(selectedLayer.id, {
                                  singleColorHex: hex,
                                })
                              }
                              className={`w-5 h-5 rounded-full border ${
                                selectedLayer.singleColorHex === hex
                                  ? "border-white scale-110"
                                  : "border-slate-600"
                              }`}
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                        <div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">
                              Detail Cutoff
                            </span>
                            <span className="font-mono text-slate-400">
                              {selectedLayer.singleColorThreshold}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={20}
                            max={240}
                            value={selectedLayer.singleColorThreshold}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                singleColorThreshold: parseInt(
                                  e.target.value,
                                  10
                                ),
                              })
                            }
                            className="w-full accent-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Smart Background Auto-Cutout + Invert */}
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-studio-surface border border-studio-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eraser className="w-4 h-4 text-cyan-400" />
                          <div>
                            <p className="text-xs font-bold text-white">
                              Auto-Remove Background
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Strips solid backdrop from image
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, {
                              removeBg: !selectedLayer.removeBg,
                            })
                          }
                          className={`px-3 py-1 rounded-md text-xs font-bold ${
                            selectedLayer.removeBg
                              ? "bg-cyan-600 text-white"
                              : "bg-studio-bg text-slate-400 hover:text-white"
                          }`}
                        >
                          {selectedLayer.removeBg ? "ON" : "OFF"}
                        </button>
                      </div>

                      {selectedLayer.removeBg && (
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-300">
                            <span>Backdrop Tolerance</span>
                            <span>{selectedLayer.removeBgTolerance}</span>
                          </div>
                          <input
                            type="range"
                            min={8}
                            max={85}
                            value={selectedLayer.removeBgTolerance}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                removeBgTolerance: parseInt(
                                  e.target.value,
                                  10
                                ),
                              })
                            }
                            className="w-full accent-cyan-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-studio-surface border border-studio-border">
                      <div className="flex items-center gap-2">
                        <Contrast className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">
                          Invert Colors
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            invert: !selectedLayer.invert,
                          })
                        }
                        className={`px-3 py-1 rounded-md text-xs font-bold ${
                          selectedLayer.invert
                            ? "bg-indigo-600 text-white"
                            : "bg-studio-bg text-slate-400"
                        }`}
                      >
                        {selectedLayer.invert ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>

                  {/* Colorize Tint & Ink Blend Mode */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-studio-surface border border-studio-border">
                      <span className="text-xs font-bold text-white">
                        Colorize Tint
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedLayer.tintEnabled && (
                          <input
                            type="color"
                            value={selectedLayer.tintHex}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                tintHex: e.target.value,
                              })
                            }
                            className="w-6 h-6 rounded cursor-pointer bg-transparent"
                          />
                        )}
                        <button
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, {
                              tintEnabled: !selectedLayer.tintEnabled,
                            })
                          }
                          className={`px-3 py-1 rounded-md text-xs font-bold ${
                            selectedLayer.tintEnabled
                              ? "bg-indigo-600 text-white"
                              : "bg-studio-bg text-slate-400"
                          }`}
                        >
                          {selectedLayer.tintEnabled ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: "source-over", label: "Standard Ink" },
                          { id: "multiply", label: "Multiply (Fabric)" },
                          { id: "screen", label: "Screen (Bright)" },
                          { id: "overlay", label: "Overlay Contrast" },
                        ] as { id: BlendModeType; label: string }[]
                      ).map((bm) => (
                        <button
                          key={bm.id}
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, {
                              blendMode: bm.id,
                            })
                          }
                          className={`p-2 rounded-lg text-xs font-medium border ${
                            selectedLayer.blendMode === bm.id
                              ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                              : "bg-studio-surface border-studio-border text-slate-300"
                          }`}
                        >
                          {bm.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  Click a graphic on the garment first to edit its color,
                  remove its background, or turn it into a single color.
                </p>
              ))}

            {/* TAB 4: MULTIPLY PATTERN REPEAT & 8 SHAPE CUTOUTS */}
            {openTab === "multiply-crop" &&
              (selectedLayer ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Multiply Pattern Repeat */}
                  <div className="p-3 rounded-xl bg-studio-surface border border-studio-border space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Grid className="w-4 h-4 text-indigo-400" />
                        Multiply Pattern (Step & Repeat Tiling)
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, {
                              wrapAround: true,
                              x: 0.5,
                              y: 0.5,
                              multiplyPattern: {
                                ...selectedLayer.multiplyPattern,
                                enabled: true,
                                allOver: true,
                                cols: Math.max(
                                  6,
                                  selectedLayer.multiplyPattern.cols
                                ),
                                rows: Math.max(
                                  6,
                                  selectedLayer.multiplyPattern.rows
                                ),
                              },
                            })
                          }
                          className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors ${
                            selectedLayer.multiplyPattern.enabled &&
                            selectedLayer.multiplyPattern.allOver !== false
                              ? "bg-emerald-600 border-emerald-400 text-white shadow"
                              : "bg-emerald-600/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-600/35"
                          }`}
                          title="Wrap pattern 360° around the connected fabric piece (e.g. Front + Back torso without bleeding onto sleeves or collar)"
                        >
                          360° Fabric Piece Wrap
                        </button>
                        <button
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, {
                              multiplyPattern: {
                                ...selectedLayer.multiplyPattern,
                                enabled: true,
                                allOver:
                                  selectedLayer.multiplyPattern.allOver ===
                                  false
                                    ? true
                                    : false,
                              },
                            })
                          }
                          className={`px-2 py-1 rounded text-[11px] border ${
                            selectedLayer.multiplyPattern.allOver === false
                              ? "border-indigo-500 bg-indigo-500/25 text-indigo-200 font-semibold"
                              : "border-studio-border bg-studio-bg text-slate-400 hover:text-slate-200"
                          }`}
                          title="Switch between covering the Entire Shirt vs only the active panel"
                        >
                          {selectedLayer.multiplyPattern.allOver === false
                            ? "Front / Panel Only: ON"
                            : "Panel Only"}
                        </button>
                        <button
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, {
                              multiplyPattern: {
                                ...selectedLayer.multiplyPattern,
                                stagger:
                                  !selectedLayer.multiplyPattern.stagger,
                              },
                            })
                          }
                          className={`px-2 py-1 rounded text-[11px] border ${
                            selectedLayer.multiplyPattern.stagger
                              ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                              : "border-studio-border bg-studio-bg text-slate-400"
                          }`}
                        >
                          Brick Stagger
                        </button>
                        <button
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, {
                              multiplyPattern: {
                                ...selectedLayer.multiplyPattern,
                                enabled:
                                  !selectedLayer.multiplyPattern.enabled,
                              },
                            })
                          }
                          className={`px-3 py-1 rounded-md text-xs font-bold ${
                            selectedLayer.multiplyPattern.enabled
                              ? "bg-indigo-600 text-white"
                              : "bg-studio-bg text-slate-400"
                          }`}
                        >
                          {selectedLayer.multiplyPattern.enabled
                            ? "ON"
                            : "OFF"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] text-slate-300 block mb-1">
                          Columns: {selectedLayer.multiplyPattern.cols}
                        </span>
                        <input
                          type="range"
                          min={1}
                          max={12}
                          value={selectedLayer.multiplyPattern.cols}
                          onChange={(e) =>
                            onUpdateLayer(selectedLayer.id, {
                              multiplyPattern: {
                                ...selectedLayer.multiplyPattern,
                                enabled: true,
                                cols: parseInt(e.target.value, 10),
                              },
                            })
                          }
                          className="w-full accent-indigo-500"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-300 block mb-1">
                          Rows: {selectedLayer.multiplyPattern.rows}
                        </span>
                        <input
                          type="range"
                          min={1}
                          max={12}
                          value={selectedLayer.multiplyPattern.rows}
                          onChange={(e) =>
                            onUpdateLayer(selectedLayer.id, {
                              multiplyPattern: {
                                ...selectedLayer.multiplyPattern,
                                enabled: true,
                                rows: parseInt(e.target.value, 10),
                              },
                            })
                          }
                          className="w-full accent-indigo-500"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-300 block mb-1">
                          Spacing:{" "}
                          {Math.round(selectedLayer.multiplyPattern.gapX * 100)}
                          %
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={1.2}
                          step={0.05}
                          value={selectedLayer.multiplyPattern.gapX}
                          onChange={(e) => {
                            const g = parseFloat(e.target.value);
                            onUpdateLayer(selectedLayer.id, {
                              multiplyPattern: {
                                ...selectedLayer.multiplyPattern,
                                enabled: true,
                                gapX: g,
                                gapY: g,
                              },
                            });
                          }}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Crop & 8 Shape Cutouts */}
                  <div className="p-3 rounded-xl bg-studio-surface border border-studio-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Crop className="w-4 h-4 text-indigo-400" />
                        Crop & 8 Shape Cutouts
                      </span>
                      <button
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            crop: {
                              top: 0,
                              right: 0,
                              bottom: 0,
                              left: 0,
                              shape: "rect",
                            },
                          })
                        }
                        className="text-[11px] text-indigo-400 hover:underline"
                      >
                        Reset Crop
                      </button>
                    </div>

                    <div className="grid grid-cols-8 gap-1">
                      {(
                        [
                          { id: "rect", label: "Rect" },
                          { id: "circle", label: "Circle" },
                          { id: "arch", label: "Arch" },
                          { id: "diamond", label: "Diamond" },
                          { id: "star", label: "Star" },
                          { id: "shield", label: "Shield" },
                          { id: "pill", label: "Pill" },
                          { id: "hexagon", label: "Hex" },
                        ] as { id: CropShapeType; label: string }[]
                      ).map((sh) => (
                        <button
                          key={sh.id}
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, {
                              crop: { ...selectedLayer.crop, shape: sh.id },
                            })
                          }
                          className={`py-1 rounded text-[11px] font-medium border ${
                            selectedLayer.crop.shape === sh.id
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "bg-studio-bg border-studio-border text-slate-300"
                          }`}
                        >
                          {sh.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {(["top", "bottom", "left", "right"] as const).map(
                        (edge) => (
                          <div key={edge}>
                            <div className="flex justify-between text-[10px] text-slate-300 capitalize mb-0.5">
                              <span>{edge}</span>
                              <span>
                                {Math.round(selectedLayer.crop[edge] * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={0.42}
                              step={0.01}
                              value={selectedLayer.crop[edge]}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  crop: {
                                    ...selectedLayer.crop,
                                    [edge]: parseFloat(e.target.value),
                                  },
                                })
                              }
                              className="w-full accent-indigo-500"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  Click a graphic on the garment first to multiply or crop it.
                </p>
              ))}

            {/* TAB 5: 7 GARMENT TYPES, PANEL DYEING & PBR FABRICS */}
            {openTab === "garment" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* 7 Garment Types Selector */}
                <div className="md:col-span-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Choose Clothing Type (7 Models)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(GARMENT_CATALOG) as GarmentType[]).map(
                      (gt) => {
                        const entry = GARMENT_CATALOG[gt];
                        const active = garment.garmentType === gt;
                        return (
                          <button
                            key={gt}
                            onClick={() => onSelectGarmentType(gt)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left transition-all ${
                              active
                                ? "bg-indigo-600 border-indigo-400 text-white shadow"
                                : "bg-studio-surface border-studio-border text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            {entry.shortName}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Cut & Sew Panel Colors */}
                <div className="md:col-span-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    {currentGarmentEntry.shortName} Panel
                    Colors
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(PANEL_UV_MAP) as GarmentPanelId[]).map(
                      (pid) => (
                        <div
                          key={pid}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-studio-surface border border-studio-border"
                        >
                          <span className="text-xs text-slate-200 truncate">
                            {
                              getPanelLabel(garment.garmentType, pid)
                                .shortLabel
                            }
                          </span>
                          <input
                            type="color"
                            value={garment.panelColors[pid]}
                            onChange={(e) =>
                              onSetPanelColor(pid, e.target.value)
                            }
                            className="w-6 h-6 rounded cursor-pointer bg-transparent shrink-0"
                          />
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    <span className="text-[11px] text-slate-400 mr-1">
                      Dye All:
                    </span>
                    {PRESET_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => onSetPanelColor("all", hex)}
                        className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Fabric Weave & Seams */}
                <div className="md:col-span-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Fabric Material & Seams
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: "heavy-cotton", name: "450 GSM Cotton" },
                        { id: "french-terry", name: "French Terry" },
                        { id: "ribbed-knit", name: "Ribbed Knit" },
                        { id: "nylon-tech", name: "Ripstop Nylon" },
                        { id: "mesh", name: "Athletic Mesh" },
                      ] as { id: FabricType; name: string }[]
                    ).map((fab) => (
                      <button
                        key={fab.id}
                        onClick={() => onUpdateGarment({ fabric: fab.id })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left ${
                          garment.fabric === fab.id
                            ? "bg-indigo-600/25 border-indigo-500 text-white"
                            : "bg-studio-surface border-studio-border text-slate-300"
                        }`}
                      >
                        {fab.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-studio-surface border border-studio-border">
                    <span className="text-xs text-slate-200">
                      Seam Stitching & Details
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={garment.stitchColor}
                        onChange={(e) =>
                          onUpdateGarment({ stitchColor: e.target.value })
                        }
                        className="w-5 h-5 rounded cursor-pointer bg-transparent"
                      />
                      <button
                        onClick={() =>
                          onUpdateGarment({ showSeams: !garment.showSeams })
                        }
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          garment.showSeams
                            ? "bg-indigo-600 text-white"
                            : "bg-studio-bg text-slate-400"
                        }`}
                      >
                        {garment.showSeams ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: DIGITAL WARDROBE CLOSET */}
            {openTab === "wardrobe" && (
              <div className="space-y-4">
                {/* Save Current Creation Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/40">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-indigo-400" />
                    <div>
                      <p className="text-xs font-bold text-white">
                        Save Current {currentGarmentEntry.shortName} to Your
                        Wardrobe
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Stores all layers, single-color settings, and panel
                        colors so you can edit it anytime
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={wardrobeName}
                      onChange={(e) => setWardrobeName(e.target.value)}
                      placeholder={`My Custom ${currentGarmentEntry.shortName}...`}
                      className="px-3 py-1.5 rounded-lg bg-studio-bg border border-studio-border text-xs text-white focus:outline-none focus:border-indigo-500 w-56"
                    />
                    <button
                      onClick={() => {
                        const clean =
                          wardrobeName.trim() ||
                          `Custom ${currentGarmentEntry.shortName} #${wardrobe.length + 1}`;
                        onSaveToWardrobe(clean);
                        setWardrobeName("");
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save to Wardrobe
                    </button>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setWardrobeFilter("all")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      wardrobeFilter === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-studio-surface text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({wardrobe.length})
                  </button>
                  {(Object.keys(GARMENT_CATALOG) as GarmentType[]).map(
                    (gt) => (
                      <button
                        key={gt}
                        onClick={() => setWardrobeFilter(gt)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          wardrobeFilter === gt
                            ? "bg-indigo-600 text-white"
                            : "bg-studio-surface text-slate-400 hover:text-white"
                        }`}
                      >
                        {GARMENT_CATALOG[gt].shortName}
                      </button>
                    )
                  )}
                </div>

                {/* Saved Wardrobe Cards Grid */}
                {filteredWardrobe.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No saved items in this category yet. Click &ldquo;Save to
                    Wardrobe&rdquo; above to store your first piece!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {filteredWardrobe.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col justify-between p-2.5 rounded-xl bg-studio-surface border border-studio-border hover:border-indigo-500 transition-all"
                      >
                        <div>
                          <div className="relative h-24 w-full rounded-lg bg-studio-bg border border-studio-border overflow-hidden flex items-center justify-center">
                            {item.thumbnailDataUrl ? (
                              <img
                                src={item.thumbnailDataUrl}
                                alt={item.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Shirt className="w-8 h-8 text-slate-600" />
                            )}
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-semibold text-indigo-300">
                              {
                                GARMENT_CATALOG[item.garmentType]?.shortName
                              }
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-bold text-white truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.layers.length} layer
                            {item.layers.length === 1 ? "" : "s"} •{" "}
                            {item.createdAt}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2.5">
                          <button
                            onClick={() => onLoadWardrobeItem(item)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                          >
                            <FolderOpen className="w-3 h-3" /> Load
                          </button>
                          <button
                            onClick={() => onDeleteWardrobeItem(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                            title="Remove from Wardrobe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN BOTTOM DOCK BAR (Always Visible) */}
      <div className="w-full px-3 py-2 rounded-2xl bg-[#151821]/95 border border-studio-border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-2 pointer-events-auto overflow-x-auto">
        {/* 1. Single View Toggle (2D vs 3D) */}
        <div className="flex items-center bg-studio-bg p-1 rounded-xl border border-studio-border shrink-0">
          <button
            onClick={() => onViewModeChange("2d")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "2d"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            2D
          </button>
          <button
            onClick={() => onViewModeChange("3d")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "3d"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D
          </button>
        </div>

        {/* 2. Dynamic Clothing Part Selector Pills */}
        <div className="flex items-center gap-1 bg-studio-bg p-1 rounded-xl border border-studio-border shrink-0">
          {(Object.keys(PANEL_UV_MAP) as GarmentPanelId[]).map((pid) => (
            <button
              key={pid}
              onClick={() => onSelectPanel(pid)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePanel === pid
                  ? "bg-studio-surface text-indigo-300 border border-indigo-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {getPanelLabel(garment.garmentType, pid).shortLabel}
            </button>
          ))}
        </div>

        {/* 3. Expandable Tool Category Tabs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(
            [
              {
                id: "garment",
                label: currentGarmentEntry.shortName,
                icon: Shirt,
              },
              {
                id: "designs",
                label: "Designs & Text",
                icon: Layers,
              },
              {
                id: "transform",
                label: "Size & Rotate",
                icon: Move,
              },
              {
                id: "color",
                label: "Color & Cutout",
                icon: Wand2,
              },
              {
                id: "multiply-crop",
                label: "Multiply & Crop",
                icon: Crop,
              },
              {
                id: "wardrobe",
                label: `Wardrobe (${wardrobe.length})`,
                icon: Archive,
              },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isOpen = openTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => toggleTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isOpen
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-lg"
                    : "bg-studio-surface border-studio-border text-slate-200 hover:border-slate-500"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {isOpen ? (
                  <ChevronDown className="w-3 h-3 opacity-80" />
                ) : (
                  <ChevronUp className="w-3 h-3 opacity-60" />
                )}
              </button>
            );
          })}
        </div>

        {/* 4. Undo/Redo + Quick Import & Export */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-xl bg-studio-surface hover:bg-slate-700 disabled:opacity-35 border border-studio-border text-slate-300"
            title="Undo (Cmd/Ctrl + Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-xl bg-studio-surface hover:bg-slate-700 disabled:opacity-35 border border-studio-border text-slate-300"
            title="Redo (Cmd/Ctrl + Shift + Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTriggerUpload}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all"
            title="Upload a Design Image"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={onExportSpec}
            className="p-2 rounded-xl bg-studio-surface hover:bg-slate-700 border border-studio-border text-slate-300 hover:text-white transition-all"
            title="Export 2D UV Pattern Spec PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
