import { useState, useEffect, useCallback } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
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
  const {
    fontFamily,
    fontSize,
    fontColor,
    editorBgColor,
    setFontFamily,
    setFontSize,
    setFontColor,
    setEditorBgColor,
  } = useEditorStore();

  const [localFontFamily, setLocalFontFamily] = useState(fontFamily);
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localFontColor, setLocalFontColor] = useState(fontColor || "#333333");
  const [localBgColor, setLocalBgColor] = useState(editorBgColor || "#ffffff");
  const [useFontColor, setUseFontColor] = useState(!!fontColor);
  const [useBgColor, setUseBgColor] = useState(!!editorBgColor);

  useEffect(() => {
    if (open) {
      setLocalFontFamily(fontFamily);
      setLocalFontSize(fontSize);
      setLocalFontColor(fontColor || "#333333");
      setLocalBgColor(editorBgColor || "#ffffff");
      setUseFontColor(!!fontColor);
      setUseBgColor(!!editorBgColor);
    }
  }, [open, fontFamily, fontSize, fontColor, editorBgColor]);

  const handleApply = useCallback(() => {
    setFontFamily(localFontFamily);
    setFontSize(localFontSize);
    setFontColor(useFontColor ? localFontColor : "");
    setEditorBgColor(useBgColor ? localBgColor : "");
    onClose();
  }, [
    localFontFamily,
    localFontSize,
    localFontColor,
    localBgColor,
    useFontColor,
    useBgColor,
    setFontFamily,
    setFontSize,
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
            <label className="settings-label">フォント</label>
            <select
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
            <label className="settings-label">文字サイズ</label>
            <div className="settings-row">
              <input
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
            <label className="settings-label">
              <input
                type="checkbox"
                checked={useFontColor}
                onChange={(e) => setUseFontColor(e.target.checked)}
              />
              文字色
            </label>
            <input
              type="color"
              value={localFontColor}
              onChange={(e) => setLocalFontColor(e.target.value)}
              disabled={!useFontColor}
              className="settings-color"
            />
          </div>

          <div className="settings-group">
            <label className="settings-label">
              <input
                type="checkbox"
                checked={useBgColor}
                onChange={(e) => setUseBgColor(e.target.checked)}
              />
              背景色
            </label>
            <input
              type="color"
              value={localBgColor}
              onChange={(e) => setLocalBgColor(e.target.value)}
              disabled={!useBgColor}
              className="settings-color"
            />
          </div>

          <div
            className="settings-preview"
            style={{
              fontFamily: localFontFamily,
              fontSize: `${localFontSize}px`,
              color: useFontColor ? localFontColor : undefined,
              backgroundColor: useBgColor ? localBgColor : undefined,
            }}
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
