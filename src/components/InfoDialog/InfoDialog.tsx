import "../ConfirmSaveDialog/ConfirmSaveDialog.css";

interface InfoDialogProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export default function InfoDialog({
  open,
  message,
  onClose,
}: InfoDialogProps) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-body">
          <span className="material-symbols-rounded confirm-icon" style={{ color: "#0078d4" }}>
            info
          </span>
          <span>{message}</span>
        </div>
        <div className="confirm-footer">
          <button
            type="button"
            className="confirm-btn confirm-btn-save"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
