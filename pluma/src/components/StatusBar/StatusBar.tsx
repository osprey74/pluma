import { useEditorStore } from "../../stores/editorStore";
import "./StatusBar.css";

const ENCODINGS = [
  "UTF-8",
  "Shift_JIS",
  "EUC-JP",
  "UTF-16LE",
  "UTF-16BE",
  "ISO-8859-1",
];

interface StatusBarProps {
  onEncodingChange: (encoding: string) => void;
  onLineEndingChange: (lineEnding: string) => void;
}

export default function StatusBar({
  onEncodingChange,
  onLineEndingChange,
}: StatusBarProps) {
  const {
    encoding,
    lineEnding,
    cursorLine,
    cursorCol,
    fileSize,
    isModified,
    filePath,
    hasBom,
  } = useEditorStore();

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-item file-name" title={filePath ?? "Untitled"}>
          {isModified ? "* " : ""}
          {filePath ? getFileName(filePath) : "Untitled"}
        </span>
      </div>

      <div className="status-bar-right">
        <select
          className="status-item status-select"
          value={encoding}
          onChange={(e) => onEncodingChange(e.target.value)}
          title="Encoding"
        >
          {ENCODINGS.map((enc) => (
            <option key={enc} value={enc}>
              {enc}
              {enc === encoding && hasBom ? " (BOM)" : ""}
            </option>
          ))}
        </select>

        <select
          className="status-item status-select"
          value={lineEnding}
          onChange={(e) => onLineEndingChange(e.target.value)}
          title="Line Ending"
        >
          <option value="LF">LF</option>
          <option value="CRLF">CRLF</option>
          <option value="CR">CR</option>
        </select>

        <span className="status-item">
          Ln {cursorLine}, Col {cursorCol}
        </span>

        {fileSize > 0 && (
          <span className="status-item">{formatFileSize(fileSize)}</span>
        )}
      </div>
    </div>
  );
}

function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
