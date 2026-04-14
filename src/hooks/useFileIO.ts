import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../stores/editorStore";
import { detectDelimiter } from "../utils/detectDelimiter";

interface FileContent {
  text: string;
  encoding: string;
  has_bom: boolean;
  line_ending: string;
  file_size: number;
}

const FILE_SIZE_WARN = 50 * 1024 * 1024;
const FILE_SIZE_READONLY = 200 * 1024 * 1024;

const FILE_FILTERS = [
  {
    name: "Supported Files",
    extensions: ["txt", "csv", "tsv", "tab", "md"],
  },
  { name: "Text Files", extensions: ["txt"] },
  { name: "CSV Files", extensions: ["csv"] },
  { name: "TSV Files", extensions: ["tsv", "tab"] },
  { name: "Markdown Files", extensions: ["md"] },
  { name: "All Files", extensions: ["*"] },
];

const RECENT_FILES_KEY = "pluma-recent-files";
const MAX_RECENT_FILES = 10;

export function getRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentFile(filePath: string) {
  const recent = getRecentFiles().filter((p) => p !== filePath);
  recent.unshift(filePath);
  if (recent.length > MAX_RECENT_FILES) recent.length = MAX_RECENT_FILES;
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent));
}

export function useFileIO() {
  const store = useEditorStore();

  const openFileByPath = async (
    path: string,
  ): Promise<{ text: string; readOnly: boolean } | null> => {
    const fileSize = await invoke<number>("get_file_size", { path });

    if (fileSize > FILE_SIZE_READONLY) {
      const result = await invoke<FileContent>("read_file", { path });
      const ext = path.split(".").pop()?.toLowerCase();
      const delimiter = isCsvLike(ext) ? detectDelimiter(result.text) : null;
      store.setFileInfo({
        filePath: path,
        encoding: result.encoding,
        hasBom: result.has_bom,
        lineEnding: result.line_ending,
        fileSize: result.file_size,
      });
      store.setDelimiter(delimiter);
      addRecentFile(path);
      return { text: result.text, readOnly: true };
    }

    if (fileSize > FILE_SIZE_WARN) {
      const proceed = window.confirm(
        `This file is ${formatFileSize(fileSize)}.\nFiles over 50MB may cause some operations to be slow.\n\nContinue?`,
      );
      if (!proceed) return null;
    }

    const result = await invoke<FileContent>("read_file", { path });
    const ext = path.split(".").pop()?.toLowerCase();
    const delimiter = isCsvLike(ext) ? detectDelimiter(result.text) : null;
    store.setFileInfo({
      filePath: path,
      encoding: result.encoding,
      hasBom: result.has_bom,
      lineEnding: result.line_ending,
      fileSize: result.file_size,
    });
    store.setDelimiter(delimiter);
    addRecentFile(path);
    return { text: result.text, readOnly: false };
  };

  const openFile = async (): Promise<{
    text: string;
    readOnly: boolean;
  } | null> => {
    const selected = await open({
      multiple: false,
      filters: FILE_FILTERS,
    });

    if (!selected) return null;

    return openFileByPath(selected as string);
  };

  const saveFile = async (content: string): Promise<boolean> => {
    let path = store.filePath;

    if (!path) {
      const selected = await save({ filters: FILE_FILTERS });
      if (!selected) return false;
      path = selected;
      store.setFileInfo({
        filePath: path,
        encoding: store.encoding,
        hasBom: store.hasBom,
        lineEnding: store.lineEnding,
        fileSize: new Blob([content]).size,
      });
    }

    await invoke("write_file", {
      path,
      content,
      encodingName: store.encoding,
      hasBom: store.hasBom,
      lineEnding: store.lineEnding,
    });

    store.setIsModified(false);
    return true;
  };

  const saveFileAs = async (content: string): Promise<boolean> => {
    const selected = await save({ filters: FILE_FILTERS });
    if (!selected) return false;

    await invoke("write_file", {
      path: selected,
      content,
      encodingName: store.encoding,
      hasBom: store.hasBom,
      lineEnding: store.lineEnding,
    });

    store.setFileInfo({
      filePath: selected,
      encoding: store.encoding,
      hasBom: store.hasBom,
      lineEnding: store.lineEnding,
      fileSize: new Blob([content]).size,
    });
    store.setIsModified(false);
    addRecentFile(selected);
    return true;
  };

  const reloadWithEncoding = async (
    encodingName: string,
  ): Promise<string | null> => {
    if (!store.filePath) return null;

    const result = await invoke<FileContent>("read_file_with_encoding", {
      path: store.filePath,
      encodingName,
    });

    store.setEncoding(result.encoding);
    return result.text;
  };

  return { openFile, openFileByPath, saveFile, saveFileAs, reloadWithEncoding };
}

function isCsvLike(ext: string | undefined): boolean {
  return ext === "csv" || ext === "tsv" || ext === "tab";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
