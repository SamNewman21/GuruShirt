export type ViewMode = "2d" | "3d";

export type GarmentType =
  | "tshirt"
  | "hoodie"
  | "tank"
  | "jacket"
  | "pants"
  | "shorts"
  | "socks";

export type GarmentPanelId =
  | "front"
  | "back"
  | "leftSleeve"
  | "rightSleeve"
  | "collar";

export type PatternViewMode = "single-panel" | "all-panels";

export type FabricType =
  | "heavy-cotton"
  | "french-terry"
  | "ribbed-knit"
  | "nylon-tech"
  | "mesh";

export type BlendModeType = "source-over" | "multiply" | "screen" | "overlay";

export type PrintFinishType =
  | "screenprint"
  | "puff-print"
  | "embroidery"
  | "vintage-cracked";

export interface GarmentFitConfig {
  bodyWidth: number; // 0.85 (Slim) .. 1.0 (Standard) .. 1.25 (Boxy Oversized)
  bodyLength: number; // 0.82 (Cropped) .. 1.0 (Standard) .. 1.18 (Longline)
  sleeveLength: number; // 0.72 (Short/Cap) .. 1.0 (Standard) .. 1.28 (Extended Drop)
  collarWeight: number; // 0.75 (Fine Rib) .. 1.0 (Standard) .. 1.45 (Heavy Mock Rib)
  drapeFolds: number; // 0.0 (Crisp Press) .. 0.5 (Natural) .. 1.0 (Heavy Street Drape)
}

export const DEFAULT_GARMENT_FIT: GarmentFitConfig = {
  bodyWidth: 1.0,
  bodyLength: 1.0,
  sleeveLength: 1.0,
  collarWeight: 1.0,
  drapeFolds: 0.55,
};

export type CropShapeType =
  | "rect"
  | "circle"
  | "arch"
  | "diamond"
  | "star"
  | "shield"
  | "pill"
  | "hexagon";

export interface MultiplyPatternConfig {
  enabled: boolean;
  cols: number;
  rows: number;
  gapX: number;
  gapY: number;
  stagger: boolean;
  allOver?: boolean; // Cover the entire garment (Front, Back, Sleeves & Collar)
}

export interface CropConfig {
  top: number; // 0..0.45
  right: number; // 0..0.45
  bottom: number; // 0..0.45
  left: number; // 0..0.45
  shape: CropShapeType;
}

export interface TextLayerConfig {
  text: string;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  letterSpacing: number;
  archCurve: number; // -100 to 100
}

export interface DesignLayer {
  id: string;
  name: string;
  src: string;
  panel: GarmentPanelId;
  x: number; // 0..1 normalized within panel
  y: number; // 0..1 normalized within panel
  width: number; // normalized 0.05..1.2 relative to panel width
  height: number; // normalized 0.05..1.2 relative to panel height
  rotation: number; // degrees
  opacity: number; // 0..1
  visible: boolean;
  locked: boolean;
  flipX: boolean;
  flipY: boolean;
  wrapAround?: boolean; // Seamless 360 wrap across side seams & sleeves (default true)
  // Kittl & Pro Ink Filters
  invert: boolean;
  singleColorMode: boolean;
  singleColorHex: string;
  singleColorThreshold: number; // 10..245
  tintEnabled: boolean;
  tintHex: string;
  // Phase 2: Smart Background Removal & Live Text
  removeBg: boolean;
  removeBgTolerance: number; // 5..90
  textConfig?: TextLayerConfig;
  blendMode: BlendModeType;
  printFinish?: PrintFinishType; // Phase 3: Screenprint, 3D Puff Print, Embroidery, Vintage Cracked
  multiplyPattern: MultiplyPatternConfig;
  crop: CropConfig;
}

export interface GarmentState {
  garmentType: GarmentType;
  panelColors: Record<GarmentPanelId, string>;
  stitchColor: string;
  fabric: FabricType;
  showSeams: boolean;
  showPrintGuides: boolean;
  fit?: GarmentFitConfig;
  customGlbUrl?: string;
  customGlbName?: string;
}

export interface WardrobeItem {
  id: string;
  name: string;
  garmentType: GarmentType;
  createdAt: string;
  thumbnailDataUrl: string;
  garment: GarmentState;
  layers: DesignLayer[];
}

export interface UploadedAsset {
  id: string;
  name: string;
  src: string;
  createdAt: string;
}

export interface PanelUVRect {
  id: GarmentPanelId;
  label: string;
  shortLabel: string;
  uMin: number;
  vMin: number;
  uMax: number;
  vMax: number;
}

export const PANEL_UV_MAP: Record<GarmentPanelId, PanelUVRect> = {
  front: {
    id: "front",
    label: "Front Torso",
    shortLabel: "Front",
    uMin: 0.02,
    vMin: 0.04,
    uMax: 0.48,
    vMax: 0.68,
  },
  back: {
    id: "back",
    label: "Back Torso",
    shortLabel: "Back",
    uMin: 0.52,
    vMin: 0.04,
    uMax: 0.98,
    vMax: 0.68,
  },
  leftSleeve: {
    id: "leftSleeve",
    label: "Left Sleeve",
    shortLabel: "L. Sleeve",
    uMin: 0.02,
    vMin: 0.72,
    uMax: 0.36,
    vMax: 0.96,
  },
  rightSleeve: {
    id: "rightSleeve",
    label: "Right Sleeve",
    shortLabel: "R. Sleeve",
    uMin: 0.38,
    vMin: 0.72,
    uMax: 0.72,
    vMax: 0.96,
  },
  collar: {
    id: "collar",
    label: "Neck Rib Collar",
    shortLabel: "Collar",
    uMin: 0.74,
    vMin: 0.72,
    uMax: 0.98,
    vMax: 0.96,
  },
};

export interface GarmentCatalogEntry {
  id: GarmentType;
  name: string;
  shortName: string;
  defaultFabric: FabricType;
  panelLabels: Record<
    GarmentPanelId,
    { label: string; shortLabel: string }
  >;
}

export const GARMENT_CATALOG: Record<GarmentType, GarmentCatalogEntry> = {
  tshirt: {
    id: "tshirt",
    name: "Boxy Streetwear T-Shirt",
    shortName: "T-Shirt",
    defaultFabric: "heavy-cotton",
    panelLabels: {
      front: { label: "Front Torso", shortLabel: "Front" },
      back: { label: "Back Torso", shortLabel: "Back" },
      leftSleeve: { label: "Left Sleeve", shortLabel: "L. Sleeve" },
      rightSleeve: { label: "Right Sleeve", shortLabel: "R. Sleeve" },
      collar: { label: "Ribbed Crew Collar", shortLabel: "Collar" },
    },
  },
  hoodie: {
    id: "hoodie",
    name: "Heavyweight Pullover Hoodie",
    shortName: "Hoodie",
    defaultFabric: "french-terry",
    panelLabels: {
      front: { label: "Front & Kangaroo Pocket", shortLabel: "Front" },
      back: { label: "Back Panel", shortLabel: "Back" },
      leftSleeve: { label: "Left Long Sleeve", shortLabel: "L. Sleeve" },
      rightSleeve: { label: "Right Long Sleeve", shortLabel: "R. Sleeve" },
      collar: { label: "Hood & Ribbed Cuffs", shortLabel: "Hood" },
    },
  },
  tank: {
    id: "tank",
    name: "Athletic Rib Tank Top",
    shortName: "Tank Top",
    defaultFabric: "ribbed-knit",
    panelLabels: {
      front: { label: "Front Chest", shortLabel: "Front" },
      back: { label: "Racer / Back Cut", shortLabel: "Back" },
      leftSleeve: { label: "Left Armhole Trim", shortLabel: "L. Trim" },
      rightSleeve: { label: "Right Armhole Trim", shortLabel: "R. Trim" },
      collar: { label: "Neck Binding", shortLabel: "Neck Trim" },
    },
  },
  jacket: {
    id: "jacket",
    name: "Quilted Puffer Winter Jacket",
    shortName: "Winter Jacket",
    defaultFabric: "nylon-tech",
    panelLabels: {
      front: { label: "Quilted Front Zip", shortLabel: "Front" },
      back: { label: "Quilted Back Yoke", shortLabel: "Back" },
      leftSleeve: { label: "Left Puffer Sleeve", shortLabel: "L. Sleeve" },
      rightSleeve: { label: "Right Puffer Sleeve", shortLabel: "R. Sleeve" },
      collar: { label: "High Stand Collar", shortLabel: "Stand Collar" },
    },
  },
  pants: {
    id: "pants",
    name: "Relaxed Streetwear Pants",
    shortName: "Pants",
    defaultFabric: "french-terry",
    panelLabels: {
      front: { label: "Front Legs (L & R)", shortLabel: "Front Legs" },
      back: { label: "Back Legs & Pockets", shortLabel: "Back Legs" },
      leftSleeve: { label: "Left Outer Leg Panel", shortLabel: "Left Leg" },
      rightSleeve: { label: "Right Outer Leg Panel", shortLabel: "Right Leg" },
      collar: { label: "Waistband & Ankle Cuffs", shortLabel: "Waist/Cuffs" },
    },
  },
  shorts: {
    id: "shorts",
    name: "Court & Street Shorts",
    shortName: "Shorts",
    defaultFabric: "mesh",
    panelLabels: {
      front: { label: "Front Thigh Panels", shortLabel: "Front" },
      back: { label: "Back Panels", shortLabel: "Back" },
      leftSleeve: { label: "Left Side Vent", shortLabel: "Left Side" },
      rightSleeve: { label: "Right Side Vent", shortLabel: "Right Side" },
      collar: { label: "Elastic Drawstring Waist", shortLabel: "Waistband" },
    },
  },
  socks: {
    id: "socks",
    name: "Ribbed Crew Socks",
    shortName: "Socks",
    defaultFabric: "ribbed-knit",
    panelLabels: {
      front: { label: "Front Shin / Instep", shortLabel: "Front Tube" },
      back: { label: "Back Calf / Achilles", shortLabel: "Back Tube" },
      leftSleeve: { label: "Heel Pocket Patch", shortLabel: "Heel Patch" },
      rightSleeve: { label: "Reinforced Toe Cap", shortLabel: "Toe Cap" },
      collar: { label: "Top Ribbed Cuff", shortLabel: "Top Cuff" },
    },
  },
};

export function getPanelLabel(
  garmentType: GarmentType,
  panelId: GarmentPanelId
): { label: string; shortLabel: string } {
  return (
    GARMENT_CATALOG[garmentType]?.panelLabels[panelId] ||
    PANEL_UV_MAP[panelId]
  );
}
