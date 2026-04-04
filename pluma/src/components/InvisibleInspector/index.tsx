import { useMemo } from "react";
import {
  analyzeText,
  type InspectorResult,
} from "../../lib/invisibleChars";
import "./InvisibleInspector.css";

interface Props {
  text: string;
  onClean: (cleanText: string) => void;
  onClose: () => void;
  mode: "edit" | "preview";
  onSwitchToPreview: () => void;
  onSwitchToEdit: () => void;
}

export function InvisibleInspector({
  text,
  onClean,
  onClose,
  mode,
  onSwitchToPreview,
  onSwitchToEdit,
}: Props) {
  const result: InspectorResult = useMemo(() => analyzeText(text), [text]);
  const invTypes = Object.values(result.invisibleByType);
  const isClean = result.totalCount > 0 && result.invisibleCount === 0;

  const copyClean = async () => {
    await navigator.clipboard.writeText(result.cleanText);
  };

  return (
    <div className="inspector-bottom-panel">
      {/* Header */}
      <div className="inspector-header">
        <span className="inspector-header-title">
          <span className="material-symbols-rounded">visibility</span>
          不可視文字インスペクター
        </span>
        <div className="inspector-header-actions">
          <div className="inspector-mode-toggle">
            <button
              className={`mode-btn${mode === "edit" ? " active" : ""}`}
              onClick={onSwitchToEdit}
              title="エディター表示"
            >
              <span className="material-symbols-rounded">edit</span>
            </button>
            <button
              className={`mode-btn${mode === "preview" ? " active" : ""}`}
              onClick={onSwitchToPreview}
              title="プレビュー表示"
            >
              <span className="material-symbols-rounded">preview</span>
            </button>
          </div>
          <button
            className="inspector-close-btn"
            onClick={onClose}
            title="閉じる"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
              close
            </span>
          </button>
        </div>
      </div>

      {/* Body */}
      {result.totalCount === 0 ? (
        <div className="inspector-empty">
          テキストを入力すると解析が始まります
        </div>
      ) : (
        <div className="inspector-body">
          <div className="inspector-body-left">
            {/* Stats */}
            <div className="inspector-stats">
              <span>
                総文字数 <strong>{result.totalCount}</strong>
              </span>
              <span className="stat-ok">
                可視 <strong>{result.visibleCount}</strong>
              </span>
              <span className={result.invisibleCount > 0 ? "stat-warn" : "stat-ok"}>
                不可視 <strong>{result.invisibleCount}</strong>
              </span>
            </div>

            {/* Status */}
            <div
              className={`inspector-status ${isClean ? "status-ok" : "status-warn"}`}
            >
              {isClean
                ? "不可視文字は検出されませんでした"
                : `${result.invisibleCount} 個の不可視文字を検出 — ${invTypes.length} 種類`}
            </div>

            {/* Actions */}
            {result.invisibleCount > 0 && (
              <div className="inspector-actions">
                <button onClick={copyClean}>クリーン版をコピー</button>
                <button onClick={() => onClean(result.cleanText)}>
                  不可視文字を削除
                </button>
              </div>
            )}
          </div>

          {/* Details — detected types only */}
          {invTypes.length > 0 && (
            <div className="inspector-details">
              {invTypes.map(({ info, hex, positions }) => (
                <div key={hex} className="detail-row">
                  <span className="inv-badge">{info.abbr}</span>
                  <span className="hex-code">{hex}</span>
                  <span className="char-name">{info.name}</span>
                  <span className="positions">
                    {positions.length}個 @{" "}
                    {positions
                      .slice(0, 5)
                      .map((p) => `[${p}]`)
                      .join(" ")}
                    {positions.length > 5 && ` +${positions.length - 5}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
