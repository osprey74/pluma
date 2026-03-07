import "./ConfirmSaveDialog.css";

interface ConfirmSaveDialogProps {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function ConfirmSaveDialog({
  open,
  onSave,
  onDiscard,
  onCancel,
}: ConfirmSaveDialogProps) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-body">
          <span className="material-symbols-rounded confirm-icon">
            warning
          </span>
          <span>ファイルは変更されています。保存しますか？</span>
        </div>
        <div className="confirm-footer">
          <button
            type="button"
            className="confirm-btn confirm-btn-discard"
            onClick={onDiscard}
          >
            保存しない
          </button>
          <button
            type="button"
            className="confirm-btn confirm-btn-save"
            onClick={onSave}
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
