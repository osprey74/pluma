import "./Toolbar.css";

export interface ToolbarItem {
  icon: string;
  title: string;
  action: () => void;
  disabled?: boolean;
  active?: boolean;
  separator?: boolean;
  colorClass?: string;
}

interface Props {
  items: ToolbarItem[];
}

export default function Toolbar({ items }: Props) {
  return (
    <div className="toolbar">
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="toolbar-sep" />
        ) : (
          <button
            key={i}
            className={`toolbar-btn${item.active ? " active" : ""}${item.colorClass ? ` ${item.colorClass}` : ""}`}
            onClick={item.action}
            disabled={item.disabled}
            title={item.title}
          >
            <span className="material-symbols-rounded">{item.icon}</span>
          </button>
        ),
      )}
    </div>
  );
}
