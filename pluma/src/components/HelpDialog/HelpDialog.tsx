import { useEffect, useCallback } from "react";
import "./HelpDialog.css";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

interface KeyBinding {
  shortcut: string;
  description: string;
}

interface KeyBindingGroup {
  title: string;
  bindings: KeyBinding[];
}

const KEYBINDING_GROUPS: KeyBindingGroup[] = [
  {
    title: "ファイル",
    bindings: [
      { shortcut: "Ctrl+N", description: "新規作成" },
      { shortcut: "Ctrl+O", description: "ファイルを開く" },
      { shortcut: "Ctrl+S", description: "保存（未保存時は名前を付けて保存）" },
      { shortcut: "Ctrl+W", description: "タブを閉じる" },
    ],
  },
  {
    title: "編集",
    bindings: [
      { shortcut: "Ctrl+Z", description: "元に戻す" },
      { shortcut: "Ctrl+Y", description: "やり直し" },
      { shortcut: "Ctrl+A", description: "すべて選択" },
      { shortcut: "Ctrl+F", description: "検索・置換" },
      { shortcut: "Ctrl+H", description: "置換" },
    ],
  },
  {
    title: "表示",
    bindings: [
      { shortcut: "Ctrl++", description: "文字サイズを拡大" },
      { shortcut: "Ctrl+-", description: "文字サイズを縮小" },
      { shortcut: "Ctrl+0", description: "文字サイズをリセット" },
      { shortcut: "Ctrl+ホイール", description: "文字サイズを拡大/縮小" },
      { shortcut: "Ctrl+Shift+I", description: "不可視文字インスペクター" },
      { shortcut: "Ctrl+Shift+M", description: "Markdownプレビュー" },
    ],
  },
  {
    title: "CSV / TSV",
    bindings: [
      { shortcut: "Tab", description: "次のセルへ移動" },
      { shortcut: "Shift+Tab", description: "前のセルへ移動" },
    ],
  },
  {
    title: "選択",
    bindings: [
      { shortcut: "Alt+ドラッグ", description: "矩形選択" },
      { shortcut: "Ctrl+D", description: "次の同一語句を選択に追加" },
    ],
  },
];

export default function HelpDialog({ open, onClose }: HelpDialogProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <span className="material-symbols-rounded">keyboard</span>
          キーバインド一覧
        </div>
        <div className="help-body">
          {KEYBINDING_GROUPS.map((group) => (
            <div key={group.title} className="help-group">
              <div className="help-group-title">{group.title}</div>
              <div className="help-group-bindings">
                {group.bindings.map((binding) => (
                  <div key={binding.shortcut} className="help-row">
                    <kbd className="help-kbd">{binding.shortcut}</kbd>
                    <span className="help-desc">{binding.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="help-footer">
          <button className="help-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
