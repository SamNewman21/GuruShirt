"use client";

import React, { useState } from "react";
import {
  BlendModeType,
  CropShapeType,
  DesignLayer,
  FabricType,
  GarmentPanelId,
  GarmentState,
  PANEL_UV_MAP,
} from "@/types/studio";
import {
  AlignCenter,
   Contrast,
  Copy,
  Crop,
  Droplet,
  FlipHorizontal,
  FlipVertical,
  Grid,
  Layers,
  Palette,
  RotateCcw,
  Scissors,
  Shirt,
  Sliders,
  Trash2,
  Wand2,
} from "lucide-react";

interface InspectorSidebarProps {
  selectedLayer: DesignLayer | null;
  garment: GarmentState;
  activePanel: GarmentPanelId;
  onUpdateLayer: (id: string, patch: Partial<DesignLayer>) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onUpdateGarment: (patch: Partial<GarmentState>) => void;
  onSetPanelColor: (panel: GarmentPanelId | "all", color: string) => void;
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

export default function InspectorSidebar({
  selectedLayer,
  garment,
  activePanel,
  onUpdateLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onUpdateGarment,
  onSetPanelColor,
}: InspectorSidebarProps) {
  const [activeTab, setActiveTab] = useState<"graphic" | "garment">("graphic");
  const [lockAspect, setLockAspect] = useState(true);

  const effectiveTab = selectedLayer ? activeTab : "garment";

  return (
    <aside className="w-80 bg-studio-panel border-l border-studio-border flex flex-col h-full select-none overflow-hidden">
      {/* Top Inspector Mode Switcher */}
      <div className="grid grid-cols-2 p-1.5 gap-1 bg-studio-bg border-b border-studio-border">
        <button
          onClick={() => setActiveTab("graphic")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold transition-all ${
            effectiveTab === "graphic"
              ? "bg-indigo-600 text-white shadow"
              : "text-slate-400 hover:text-white hover:bg-studio-surface"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Graphic Studio
        </button>
        <button
          onClick={() => setActiveTab("garment")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold transition-all ${
            effectiveTab === "garment"
              ? "bg-indigo-600 text-white shadow"
              : "text-slate-400 hover:text-white hover:bg-studio-surface"
          }`}
        >
          <Shirt className="w-3.5 h-3.5" />
          Fabric & Panels
        </button>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {effectiveTab === "graphic" && selectedLayer ? (
          <>
            {/* Selected Layer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-studio-border">
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[175px]">
                  {selectedLayer.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  On {PANEL_UV_MAP[selectedLayer.panel].label}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDuplicateLayer(selectedLayer.id)}
                  className="p-1.5 rounded bg-studio-surface hover:bg-slate-700 text-slate-200"
                  title="Duplicate Graphic Layer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteLayer(selectedLayer.id)}
                  className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400"
                  title="Delete Graphic Layer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 1. Move to Any Part of Clothing */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Clothing Zone Placement</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(PANEL_UV_MAP) as GarmentPanelId[]).map((pid) => (
                  <button
                    key={pid}
                    onClick={() =>
                      onUpdateLayer(selectedLayer.id, { panel: pid })
                    }
                    className={`px-2 py-1.5 rounded text-xs font-medium border transition-all ${
                      selectedLayer.panel === pid
                        ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                        : "bg-studio-surface border-studio-border text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {PANEL_UV_MAP[pid].shortLabel}
                  </button>
                ))}
              </div>

              {/* Quick Printful-style Snap Presets */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, {
                      x: 0.5,
                      y: 0.36,
                    })
                  }
                  className="px-2 py-1 rounded bg-studio-surface hover:bg-slate-700 text-[11px] text-slate-300"
                >
                  Center Chest
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
                  className="px-2 py-1 rounded bg-studio-surface hover:bg-slate-700 text-[11px] text-slate-300"
                >
                  Left Pocket
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
                  className="px-2 py-1 rounded bg-studio-surface hover:bg-slate-700 text-[11px] text-slate-300"
                >
                  Oversized
                </button>
              </div>
            </div>

            {/* 2. Size, Shape (Stretch), & Rotation */}
            <div className="space-y-3 pt-3 border-t border-studio-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Size, Shape & Rotation
                </span>
                <button
                  onClick={() => setLockAspect((l) => !l)}
                  className={`text-[11px] px-2 py-0.5 rounded border ${
                    lockAspect
                      ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                      : "border-studio-border bg-studio-surface text-slate-400"
                  }`}
                >
                  {lockAspect ? "Ratio Locked" : "Free Stretch"}
                </button>
              </div>

              {/* Width Slider */}
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
                          Math.min(1.25, Math.max(0.05, nextW * ratio)).toFixed(
                            3
                          )
                        ),
                      });
                    } else {
                      onUpdateLayer(selectedLayer.id, { width: nextW });
                    }
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Height Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Height / Stretch</span>
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
                          Math.min(1.25, Math.max(0.05, nextH * ratio)).toFixed(
                            3
                          )
                        ),
                      });
                    } else {
                      onUpdateLayer(selectedLayer.id, { height: nextH });
                    }
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Rotation Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Rotation</span>
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
                    className="p-1 rounded bg-studio-surface hover:bg-slate-700 text-slate-300"
                    title="Reset Rotation to 0°"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Flip Horizontal / Vertical */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, {
                      flipX: !selectedLayer.flipX,
                    })
                  }
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs border ${
                    selectedLayer.flipX
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
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
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs border ${
                    selectedLayer.flipY
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                      : "bg-studio-surface border-studio-border text-slate-300"
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" /> Flip Y
                </button>
              </div>
            </div>

            {/* 3. Single-Color Stencil, Invert, Color & Ink Blend */}
            <div className="space-y-3 pt-3 border-t border-studio-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Color, Single-Color Stencil & Invert
              </span>

              {/* One-Click Invert Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-surface border border-studio-border">
                <div className="flex items-center gap-2">
                  <Contrast className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Invert Design Colors
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Flip light & dark channels
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, {
                      invert: !selectedLayer.invert,
                    })
                  }
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    selectedLayer.invert
                      ? "bg-indigo-600 text-white"
                      : "bg-studio-bg text-slate-400 hover:text-white"
                  }`}
                >
                  {selectedLayer.invert ? "ON" : "OFF"}
                </button>
              </div>

              {/* Single-Color Stencil Conversion */}
              <div className="p-2.5 rounded-lg bg-studio-surface border border-studio-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Turn into Single Color
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Screen-print stencil threshold
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateLayer(selectedLayer.id, {
                        singleColorMode: !selectedLayer.singleColorMode,
                      })
                    }
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      selectedLayer.singleColorMode
                        ? "bg-emerald-600 text-white"
                        : "bg-studio-bg text-slate-400 hover:text-white"
                    }`}
                  >
                    {selectedLayer.singleColorMode ? "ON" : "OFF"}
                  </button>
                </div>

                {selectedLayer.singleColorMode && (
                  <div className="space-y-2.5 pt-2 border-t border-studio-border/70">
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
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
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
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Detail Cutoff</span>
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
                            singleColorThreshold: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Color Tint (Preserves Shading) */}
              {!selectedLayer.singleColorMode && (
                <div className="p-2.5 rounded-lg bg-studio-surface border border-studio-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Colorize / Recolor Tint
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
                        className={`px-2.5 py-1 rounded text-xs font-bold ${
                          selectedLayer.tintEnabled
                            ? "bg-indigo-600 text-white"
                            : "bg-studio-bg text-slate-400"
                        }`}
                      >
                        {selectedLayer.tintEnabled ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ink Blend Mode (Multiply / Screen / Overlay) */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 block">
                  Ink Blend Mode (Multiply into Fabric)
                </label>
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
                        onUpdateLayer(selectedLayer.id, { blendMode: bm.id })
                      }
                      className={`px-2 py-1.5 rounded text-xs font-medium border ${
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

            {/* 4. Multiply Pattern (Step & Repeat Grid) */}
            <div className="space-y-2.5 pt-3 border-t border-studio-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-indigo-400" />
                  Multiply Pattern Repeat
                </span>
                <button
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, {
                      multiplyPattern: {
                        ...selectedLayer.multiplyPattern,
                        enabled: !selectedLayer.multiplyPattern.enabled,
                      },
                    })
                  }
                  className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    selectedLayer.multiplyPattern.enabled
                      ? "bg-indigo-600 text-white"
                      : "bg-studio-surface text-slate-400"
                  }`}
                >
                  {selectedLayer.multiplyPattern.enabled ? "ACTIVE" : "OFF"}
                </button>
              </div>

              {selectedLayer.multiplyPattern.enabled && (
                <div className="p-2.5 rounded-lg bg-studio-surface border border-studio-border space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-slate-300 block mb-1">
                        Columns: {selectedLayer.multiplyPattern.cols}
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={6}
                        value={selectedLayer.multiplyPattern.cols}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, {
                            multiplyPattern: {
                              ...selectedLayer.multiplyPattern,
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
                        max={6}
                        value={selectedLayer.multiplyPattern.rows}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, {
                            multiplyPattern: {
                              ...selectedLayer.multiplyPattern,
                              rows: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>Tile Spacing</span>
                      <span>
                        {Math.round(selectedLayer.multiplyPattern.gapX * 100)}%
                      </span>
                    </div>
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
                            gapX: g,
                            gapY: g,
                          },
                        });
                      }}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <button
                    onClick={() =>
                      onUpdateLayer(selectedLayer.id, {
                        multiplyPattern: {
                          ...selectedLayer.multiplyPattern,
                          stagger: !selectedLayer.multiplyPattern.stagger,
                        },
                      })
                    }
                    className={`w-full py-1 rounded text-xs border ${
                      selectedLayer.multiplyPattern.stagger
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                        : "bg-studio-bg border-studio-border text-slate-400"
                    }`}
                  >
                    Brick Stagger Offset:{" "}
                    {selectedLayer.multiplyPattern.stagger ? "ON" : "OFF"}
                  </button>
                </div>
              )}
            </div>

            {/* 5. Non-Destructive Crop & Shape Mask */}
            <div className="space-y-2.5 pt-3 border-t border-studio-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-indigo-400" />
                  Crop & Shape Mask
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

              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: "rect", label: "Rect" },
                    { id: "circle", label: "Circle" },
                    { id: "arch", label: "Arch" },
                    { id: "diamond", label: "Diamond" },
                  ] as { id: CropShapeType; label: string }[]
                ).map((sh) => (
                  <button
                    key={sh.id}
                    onClick={() =>
                      onUpdateLayer(selectedLayer.id, {
                        crop: { ...selectedLayer.crop, shape: sh.id },
                      })
                    }
                    className={`py-1 rounded text-xs font-medium border ${
                      selectedLayer.crop.shape === sh.id
                        ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                        : "bg-studio-surface border-studio-border text-slate-300"
                    }`}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {(["top", "bottom", "left", "right"] as const).map((edge) => (
                  <div key={edge} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-400 capitalize">
                      <span>Crop {edge}</span>
                      <span>{Math.round(selectedLayer.crop[edge] * 100)}%</span>
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
                ))}
              </div>
            </div>
          </>
        ) : effectiveTab === "graphic" && !selectedLayer ? (
          <div className="py-12 text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-medium text-slate-300">
              No Graphic Selected
            </p>
            <p className="text-xs text-slate-500">
              Click any graphic on the 2D canvas or choose one from the left
              library to edit its size, rotation, single-color stencil, or crop.
            </p>
          </div>
        ) : null}

        {/* GARMENT & FABRIC STUDIO TAB (Browzwear / CLO 3D Controls) */}
        {effectiveTab === "garment" && (
          <div className="space-y-5">
            {/* Multi-Zone Panel Dyeing */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Cut & Sew Panel Colors
              </span>

              <div className="space-y-2">
                {(Object.keys(PANEL_UV_MAP) as GarmentPanelId[]).map((pid) => (
                  <div
                    key={pid}
                    className="flex items-center justify-between p-2 rounded-lg bg-studio-surface border border-studio-border"
                  >
                    <span className="text-xs font-medium text-slate-200">
                      {PANEL_UV_MAP[pid].label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        {garment.panelColors[pid]}
                      </span>
                      <input
                        type="color"
                        value={garment.panelColors[pid]}
                        onChange={(e) => onSetPanelColor(pid, e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Dye Entire Garment Swatches */}
              <div className="pt-2 space-y-1.5">
                <span className="text-xs text-slate-400 block">
                  Dye All Garment Panels:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => onSetPanelColor("all", hex)}
                      className="w-6 h-6 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: hex }}
                      title={`Dye entire shirt ${hex}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Browzwear Fabric Weave & Weight Selector */}
            <div className="space-y-2.5 pt-3 border-t border-studio-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Fabric Material & Weave (PBR)
              </span>
              <div className="space-y-1.5">
                {(
                  [
                    {
                      id: "heavy-cotton",
                      name: "450 GSM Heavyweight Cotton",
                      desc: "Tight jersey weave, matte finish",
                    },
                    {
                      id: "french-terry",
                      name: "French Terry Loopback",
                      desc: "Heavy streetwear diagonal grain",
                    },
                    {
                      id: "ribbed-knit",
                      name: "Vertical Ribbed Knit",
                      desc: "Textured vertical knit columns",
                    },
                    {
                      id: "nylon-tech",
                      name: "Ripstop Technical Nylon",
                      desc: "Crisp crosshatch grid with subtle sheen",
                    },
                    {
                      id: "mesh",
                      name: "Perforated Athletic Mesh",
                      desc: "Breathable jersey dimple texture",
                    },
                  ] as { id: FabricType; name: string; desc: string }[]
                ).map((fab) => (
                  <button
                    key={fab.id}
                    onClick={() => onUpdateGarment({ fabric: fab.id })}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                      garment.fabric === fab.id
                        ? "bg-indigo-600/20 border-indigo-500 text-white"
                        : "bg-studio-surface border-studio-border text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <p className="text-xs font-semibold">{fab.name}</p>
                    <p className="text-[10px] text-slate-400">{fab.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Seam Top-Stitching & Print Guides */}
            <div className="space-y-2.5 pt-3 border-t border-studio-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Seams & Construction Guides
              </span>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-surface border border-studio-border">
                <span className="text-xs text-slate-200">
                  Show Top-Stitch Seams
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={garment.stitchColor}
                    onChange={(e) =>
                      onUpdateGarment({ stitchColor: e.target.value })
                    }
                    className="w-6 h-6 rounded cursor-pointer bg-transparent"
                    title="Seam Thread Color"
                  />
                  <button
                    onClick={() =>
                      onUpdateGarment({ showSeams: !garment.showSeams })
                    }
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      garment.showSeams
                        ? "bg-indigo-600 text-white"
                        : "bg-studio-bg text-slate-400"
                    }`}
                  >
                    {garment.showSeams ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-surface border border-studio-border">
                <span className="text-xs text-slate-200">
                  Print Placement Safe Guides
                </span>
                <button
                  onClick={() =>
                    onUpdateGarment({
                      showPrintGuides: !garment.showPrintGuides,
                    })
                  }
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    garment.showPrintGuides
                      ? "bg-indigo-600 text-white"
                      : "bg-studio-bg text-slate-400"
                  }`}
                >
                  {garment.showPrintGuides ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
