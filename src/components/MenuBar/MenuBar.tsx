import { useState, useRef, useEffect, useCallback } from "react";
import "./MenuBar.css";

export interface MenuItem {
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  dividerAfter?: boolean;
  checked?: boolean;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface MenuBarProps {
  menus: MenuGroup[];
  readOnly?: boolean;
}

export default function MenuBar({ menus, readOnly }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    if (openMenu === null) return;
    const handler = (e: MouseEvent) => {
      if (
        menuBarRef.current &&
        !menuBarRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu, closeMenu]);

  useEffect(() => {
    if (openMenu === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openMenu, closeMenu]);

  return (
    <div className="menu-bar" ref={menuBarRef}>
      {menus.map((menu, i) => (
        <div key={menu.label} className="menu-trigger-wrapper">
          <button
            type="button"
            className={`menu-trigger ${openMenu === i ? "active" : ""}`}
            onClick={() => setOpenMenu(openMenu === i ? null : i)}
            onMouseEnter={() => {
              if (openMenu !== null) setOpenMenu(i);
            }}
          >
            {menu.label}
          </button>
          {openMenu === i && (
            <div className="menu-dropdown">
              {menu.items.map((item) => (
                <div key={item.label}>
                  <button
                    type="button"
                    className="menu-item"
                    disabled={item.disabled}
                    onClick={() => {
                      item.action();
                      closeMenu();
                    }}
                  >
                    <span className="menu-item-check">
                      {item.checked !== undefined && (
                        <span className="material-symbols-rounded">
                          {item.checked ? "check" : ""}
                        </span>
                      )}
                    </span>
                    <span className="material-symbols-rounded menu-item-icon">
                      {item.icon}
                    </span>
                    <span className="menu-item-label">{item.label}</span>
                    {item.shortcut && (
                      <span className="menu-item-shortcut">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                  {item.dividerAfter && <div className="menu-divider" />}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {readOnly && <span className="readonly-badge">Read Only</span>}
    </div>
  );
}
