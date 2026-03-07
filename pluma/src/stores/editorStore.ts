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
}

const DEFAULT_SETTINGS: PersistedSettings = {
  fontFamily: "'Source Han Code JP', monospace",
  fontSize: 14,
  fontColor: "",
  editorBgColor: "",
  wrapMode: "none",
  wrapColumn: 80,
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
  setDelimiter: (delimiter: "," | "\t" | ";" | null) => void;
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (fontSize: number) => void;
  setFontColor: (fontColor: string) => void;
  setEditorBgColor: (editorBgColor: string) => void;
  setWrapMode: (wrapMode: WrapMode) => void;
  setWrapColumn: (wrapColumn: number) => void;
  reset: () => void;
}

const initial = loadSettings();

export const useEditorStore = create<EditorStore>((set, get) => ({
  filePath: null,
  encoding: "UTF-8",
  hasBom: false,
  lineEnding: "LF",
  fileSize: 0,
  isModified: false,
  cursorLine: 1,
  cursorCol: 1,
  delimiter: null,
  fontFamily: initial.fontFamily,
  fontSize: initial.fontSize,
  fontColor: initial.fontColor,
  editorBgColor: initial.editorBgColor,
  wrapMode: initial.wrapMode,
  wrapColumn: initial.wrapColumn,

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
  setDelimiter: (delimiter) => set({ delimiter }),
  setFontFamily: (fontFamily) => {
    set({ fontFamily });
    const s = get();
    saveSettings({ fontFamily, fontSize: s.fontSize, fontColor: s.fontColor, editorBgColor: s.editorBgColor, wrapMode: s.wrapMode, wrapColumn: s.wrapColumn });
  },
  setFontSize: (fontSize) => {
    set({ fontSize });
    const s = get();
    saveSettings({ fontFamily: s.fontFamily, fontSize, fontColor: s.fontColor, editorBgColor: s.editorBgColor, wrapMode: s.wrapMode, wrapColumn: s.wrapColumn });
  },
  setFontColor: (fontColor) => {
    set({ fontColor });
    const s = get();
    saveSettings({ fontFamily: s.fontFamily, fontSize: s.fontSize, fontColor, editorBgColor: s.editorBgColor, wrapMode: s.wrapMode, wrapColumn: s.wrapColumn });
  },
  setEditorBgColor: (editorBgColor) => {
    set({ editorBgColor });
    const s = get();
    saveSettings({ fontFamily: s.fontFamily, fontSize: s.fontSize, fontColor: s.fontColor, editorBgColor, wrapMode: s.wrapMode, wrapColumn: s.wrapColumn });
  },
  setWrapMode: (wrapMode) => {
    set({ wrapMode });
    const s = get();
    saveSettings({ fontFamily: s.fontFamily, fontSize: s.fontSize, fontColor: s.fontColor, editorBgColor: s.editorBgColor, wrapMode, wrapColumn: s.wrapColumn });
  },
  setWrapColumn: (wrapColumn) => {
    set({ wrapColumn });
    const s = get();
    saveSettings({ fontFamily: s.fontFamily, fontSize: s.fontSize, fontColor: s.fontColor, editorBgColor: s.editorBgColor, wrapMode: s.wrapMode, wrapColumn });
  },
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
      delimiter: null,
    }),
}));
