import { useMemo, useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { marked } from "marked";
import "./MarkdownPreview.css";

export interface MarkdownPreviewHandle {
  getScrollEl: () => HTMLDivElement | null;
}

interface Props {
  text: string;
  width: number;
  onWidthChange: (width: number) => void;
}

export const MarkdownPreview = forwardRef<MarkdownPreviewHandle, Props>(
  ({ text, width, onWidthChange }, ref) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const html = useMemo(() => {
      return marked.parse(text, { async: false }) as string;
    }, [text]);

    useImperativeHandle(ref, () => ({
      getScrollEl: () => scrollRef.current,
    }));

    const [resizing, setResizing] = useState(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        setResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = width;
      },
      [width],
    );

    useEffect(() => {
      if (!resizing) return;
      const handleMouseMove = (e: MouseEvent) => {
        const delta = startXRef.current - e.clientX;
        const newWidth = Math.max(200, Math.min(1200, startWidthRef.current + delta));
        onWidthChange(newWidth);
      };
      const handleMouseUp = () => setResizing(false);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [resizing, onWidthChange]);

    return (
      <>
        <div
          className={`md-resizer${resizing ? " resizing" : ""}`}
          onMouseDown={handleMouseDown}
        />
        <div className="md-preview" style={{ width }}>
          <div className="md-preview-header">
            <span className="md-preview-header-title">Markdownプレビュー</span>
          </div>
          <div ref={scrollRef} className="md-preview-scroll">
            <div
              className="md-preview-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </>
    );
  },
);

MarkdownPreview.displayName = "MarkdownPreview";
