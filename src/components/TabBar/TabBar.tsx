import { useCallback } from "react";
import "./TabBar.css";

export interface TabInfo {
  id: number;
  title: string;
  isModified: boolean;
}

interface Props {
  tabs: TabInfo[];
  activeTabId: number;
  onSelect: (id: number) => void;
  onClose: (id: number) => void;
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose }: Props) {
  const handleClose = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      onClose(id);
    },
    [onClose],
  );

  return (
    <div className="tabbar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab${tab.id === activeTabId ? " active" : ""}`}
          onClick={() => onSelect(tab.id)}
          title={tab.title}
        >
          <span className="tab-title">
            {tab.isModified && <span className="tab-dot" />}
            {tab.title}
          </span>
          <button
            className="tab-close"
            onClick={(e) => handleClose(e, tab.id)}
            title="閉じる"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
