import { useState, useEffect, useCallback } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "../../stores/editorStore";
import "./SettingsDialog.css";

const FONT_OPTIONS = [
  { label: "Source Han Code JP", value: "'Source Han Code JP', monospace" },
  { label: "MS ゴシック", value: "'MS Gothic', monospace" },
  { label: "MS 明朝", value: "'MS Mincho', monospace" },
];

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { fontFamily, fontSize, lineHeight, fontColor, editorBgColor } = useEditorStore(
    useShallow((s) => ({
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      fontColor: s.fontColor,
      editorBgColor: s.editorBgColor,
    })),
  );
  const setFontFamily = useEditorStore((s) => s.setFontFamily);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const setLineHeight = useEditorStore((s) => s.setLineHeight);
  const setFontColor = useEditorStore((s) => s.setFontColor);
  const setEditorBgColor = useEditorStore((s) => s.setEditorBgColor);

  const [localFontFamily, setLocalFontFamily] = useState(fontFamily);
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [localFontColor, setLocalFontColor] = useState(fontColor || "#333333");
  const [localBgColor, setLocalBgColor] = useState(editorBgColor || "#ffffff");
  const [useFontColor, setUseFontColor] = useState(!!fontColor);
  const [useBgColor, setUseBgColor] = useState(!!editorBgColor);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    if (open) {
      setLocalFontFamily(fontFamily);
      setLocalFontSize(fontSize);
      setLocalLineHeight(lineHeight);
      setLocalFontColor(fontColor || "#333333");
      setLocalBgColor(editorBgColor || "#ffffff");
      setUseFontColor(!!fontColor);
      setUseBgColor(!!editorBgColor);
    }
  }, [open, fontFamily, fontSize, lineHeight, fontColor, editorBgColor]);

  const handleApply = useCallback(() => {
    setFontFamily(localFontFamily);
    setFontSize(localFontSize);
    setLineHeight(localLineHeight);
    setFontColor(useFontColor ? localFontColor : "");
    setEditorBgColor(useBgColor ? localBgColor : "");
    onClose();
  }, [
    localFontFamily,
    localFontSize,
    localLineHeight,
    localFontColor,
    localBgColor,
    useFontColor,
    useBgColor,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setFontColor,
    setEditorBgColor,
    onClose,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") handleApply();
    },
    [onClose, handleApply],
  );

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="settings-header">
          <span className="material-symbols-rounded">settings</span>
          <span>設定</span>
        </div>

        <div className="settings-body">
          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-font-family">
              フォント
            </label>
            <select
              id="settings-font-family"
              className="settings-select"
              value={localFontFamily}
              onChange={(e) => setLocalFontFamily(e.target.value)}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-font-size">
              文字サイズ
            </label>
            <div className="settings-row">
              <input
                id="settings-font-size"
                type="range"
                min={8}
                max={40}
                value={localFontSize}
                onChange={(e) => setLocalFontSize(Number(e.target.value))}
                className="settings-range"
              />
              <span className="settings-value">{localFontSize}px</span>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-line-height">
              行の高さ
            </label>
            <div className="settings-row">
              <input
                id="settings-line-height"
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={localLineHeight}
                onChange={(e) => setLocalLineHeight(Number(e.target.value))}
                className="settings-range"
              />
              <span className="settings-value">{localLineHeight.toFixed(1)}</span>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-use-font-color">
              <input
                id="settings-use-font-color"
                type="checkbox"
                checked={useFontColor}
                onChange={(e) => setUseFontColor(e.target.checked)}
              />
              文字色
            </label>
            <input
              type="color"
              aria-label="文字色"
              value={localFontColor}
              onChange={(e) => setLocalFontColor(e.target.value)}
              disabled={!useFontColor}
              className="settings-color"
            />
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="settings-use-bg-color">
              <input
                id="settings-use-bg-color"
                type="checkbox"
                checked={useBgColor}
                onChange={(e) => setUseBgColor(e.target.checked)}
              />
              背景色
            </label>
            <input
              type="color"
              aria-label="背景色"
              value={localBgColor}
              onChange={(e) => setLocalBgColor(e.target.value)}
              disabled={!useBgColor}
              className="settings-color"
            />
          </div>

          <div
            className="settings-preview"
            style={
              {
                "--preview-font-family": localFontFamily,
                "--preview-font-size": `${localFontSize}px`,
                "--preview-line-height": `${localLineHeight}`,
                "--preview-color": useFontColor ? localFontColor : "inherit",
                "--preview-bg": useBgColor ? localBgColor : "transparent",
              } as React.CSSProperties
            }
          >
            ABCabc あいう 123 サンプルテキスト
          </div>
        </div>

        <div className="settings-credits">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openUrl("https://www.flaticon.com/free-icons/scroll");
            }}
            title="scroll icons"
          >
            Scroll icons created by Freepik - Flaticon
          </a>
        </div>

        <div className="settings-version">
          Pluma{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openUrl("https://github.com/osprey74/pluma");
            }}
          >
            v{appVersion}
          </a>
        </div>

        <div className="settings-footer">
          <button
            type="button"
            className="settings-btn settings-btn-cancel"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="settings-btn settings-btn-ok"
            onClick={handleApply}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
