import { create } from "zustand";

export type WrapMode = "none" | "window" | "column";

const SETTINGS_KEY = "pluma-settings";

interface PersistedSettings {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  editorBgColor: string;
  wrapMode: WrapMode;
  wrapColumn: number;
  showInspector: boolean;
  showWhitespace: boolean;
  inspectorWidth: number;
  mdPreviewWidth: number;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  fontFamily: "'Source Han Code JP', monospace",
  fontSize: 14,
  fontColor: "",
  editorBgColor: "",
  wrapMode: "none",
  wrapColumn: 80,
  showInspector: false,
  showWhitespace: true,
  inspectorWidth: 340,
  mdPreviewWidth: 500,
};

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: PersistedSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export interface EditorStore {
  filePath: string | null;
  encoding: string;
  hasBom: boolean;
  lineEnding: string;
  fileSize: number;
  isModified: boolean;
  cursorLine: number;
  cursorCol: number;
  selectionLength: number;
  delimiter: "," | "\t" | ";" | null;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  editorBgColor: string;
  wrapMode: WrapMode;
  wrapColumn: number;

  setFileInfo: (info: {
    filePath: string;
    encoding: string;
    hasBom: boolean;
    lineEnding: string;
    fileSize: number;
  }) => void;
  setEncoding: (encoding: string) => void;
  setLineEnding: (lineEnding: string) => void;
  setIsModified: (isModified: boolean) => void;
  setCursorPosition: (line: number, col: number) => void;
  setSelectionLength: (length: number) => void;
  setDelimiter: (delimiter: "," | "\t" | ";" | null) => void;
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (fontSize: number) => void;
  setFontColor: (fontColor: string) => void;
  setEditorBgColor: (editorBgColor: string) => void;
  setWrapMode: (wrapMode: WrapMode) => void;
  setWrapColumn: (wrapColumn: number) => void;
  showInspector: boolean;
  showWhitespace: boolean;
  inspectorWidth: number;
  mdPreviewWidth: number;
  setShowInspector: (show: boolean) => void;
  setShowWhitespace: (show: boolean) => void;
  setInspectorWidth: (width: number) => void;
  setMdPreviewWidth: (width: number) => void;
  reset: () => void;
}

const initial = loadSettings();

function persist(s: EditorStore) {
  saveSettings({
    fontFamily: s.fontFamily, fontSize: s.fontSize, fontColor: s.fontColor,
    editorBgColor: s.editorBgColor, wrapMode: s.wrapMode, wrapColumn: s.wrapColumn,
    showInspector: s.showInspector, showWhitespace: s.showWhitespace,
    inspectorWidth: s.inspectorWidth, mdPreviewWidth: s.mdPreviewWidth,
  });
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  filePath: null,
  encoding: "UTF-8",
  hasBom: false,
  lineEnding: "LF",
  fileSize: 0,
  isModified: false,
  cursorLine: 1,
  cursorCol: 1,
  selectionLength: 0,
  delimiter: null,
  fontFamily: initial.fontFamily,
  fontSize: initial.fontSize,
  fontColor: initial.fontColor,
  editorBgColor: initial.editorBgColor,
  wrapMode: initial.wrapMode,
  wrapColumn: initial.wrapColumn,
  showInspector: initial.showInspector,
  showWhitespace: initial.showWhitespace,
  inspectorWidth: initial.inspectorWidth,
  mdPreviewWidth: initial.mdPreviewWidth,

  setFileInfo: (info) =>
    set({
      filePath: info.filePath,
      encoding: info.encoding,
      hasBom: info.hasBom,
      lineEnding: info.lineEnding,
      fileSize: info.fileSize,
      isModified: false,
    }),

  setEncoding: (encoding) => set({ encoding }),
  setLineEnding: (lineEnding) => set({ lineEnding }),
  setIsModified: (isModified) => set({ isModified }),
  setCursorPosition: (line, col) => set({ cursorLine: line, cursorCol: col }),
  setSelectionLength: (selectionLength) => set({ selectionLength }),
  setDelimiter: (delimiter) => set({ delimiter }),
  setFontFamily: (fontFamily) => { set({ fontFamily }); persist(get()); },
  setFontSize: (fontSize) => { set({ fontSize }); persist(get()); },
  setFontColor: (fontColor) => { set({ fontColor }); persist(get()); },
  setEditorBgColor: (editorBgColor) => { set({ editorBgColor }); persist(get()); },
  setWrapMode: (wrapMode) => { set({ wrapMode }); persist(get()); },
  setWrapColumn: (wrapColumn) => { set({ wrapColumn }); persist(get()); },
  setShowInspector: (showInspector) => { set({ showInspector }); persist(get()); },
  setShowWhitespace: (showWhitespace) => { set({ showWhitespace }); persist(get()); },
  setInspectorWidth: (inspectorWidth) => { set({ inspectorWidth }); persist(get()); },
  setMdPreviewWidth: (mdPreviewWidth) => { set({ mdPreviewWidth }); persist(get()); },
  reset: () =>
    set({
      filePath: null,
      encoding: "UTF-8",
      hasBom: false,
      lineEnding: "LF",
      fileSize: 0,
      isModified: false,
      cursorLine: 1,
      cursorCol: 1,
      selectionLength: 0,
      delimiter: null,
    }),
}));
