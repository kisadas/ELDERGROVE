import React, { useRef, useState, useEffect } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

interface DraggableResizableModalProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  onClose: () => void;
  children: React.ReactNode;
}

export const DraggableResizableModal: React.FC<DraggableResizableModalProps> = ({
  title,
  subtitle,
  icon,
  headerRight,
  initialWidth = 640,
  initialHeight = 520,
  onClose,
  children,
}) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight });
  const [minimized, setMinimized] = useState(false);
  const [isCentered, setIsCentered] = useState(true);

  const modalRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<{ active: boolean; startX: number; startY: number; initX: number; initY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const resizeRef = useRef<{ active: boolean; startX: number; startY: number; initW: number; initH: number }>({
    active: false,
    startX: 0,
    startY: 0,
    initW: initialWidth,
    initH: initialHeight,
  });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current.active) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPos({
          x: Math.max(10, Math.min(window.innerWidth - 120, dragRef.current.initX + dx)),
          y: Math.max(10, Math.min(window.innerHeight - 80, dragRef.current.initY + dy)),
        });
      } else if (resizeRef.current.active) {
        const dw = e.clientX - resizeRef.current.startX;
        const dh = e.clientY - resizeRef.current.startY;
        setSize({
          w: Math.max(340, Math.min(window.innerWidth - 30, resizeRef.current.initW + dw)),
          h: Math.max(200, Math.min(window.innerHeight - 30, resizeRef.current.initH + dh)),
        });
      }
    };

    const onMouseUp = () => {
      dragRef.current.active = false;
      resizeRef.current.active = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    let initX = pos.x;
    let initY = pos.y;
    if (isCentered && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      initX = rect.left;
      initY = rect.top;
      setPos({ x: initX, y: initY });
      setIsCentered(false);
    }
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
    };
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    let initW = size.w;
    let initH = size.h;
    if (isCentered && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      initW = rect.width;
      initH = rect.height;
      setPos({ x: rect.left, y: rect.top });
      setSize({ w: initW, h: initH });
      setIsCentered(false);
    }
    resizeRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initW,
      initH,
    };
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/45 flex items-center justify-center p-2 sm:p-4 pointer-events-none backdrop-blur-[1px]">
      <div
        ref={modalRef}
        style={
          isCentered
            ? {
                width: `${Math.min(window.innerWidth - 24, size.w)}px`,
                maxHeight: `${Math.min(window.innerHeight - 24, size.h)}px`,
              }
            : {
                position: 'fixed',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${Math.min(window.innerWidth - 20, size.w)}px`,
                height: minimized ? 'auto' : `${Math.min(window.innerHeight - 20, size.h)}px`,
              }
        }
        className="pointer-events-auto bg-[#131822]/98 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col select-none relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Draggable Header */}
        <div
          onMouseDown={startDrag}
          className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[#182030] border-b border-white/10 cursor-grab active:cursor-grabbing shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icon}
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-50 truncate">{title}</h2>
              {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {headerRight}
            <button
              type="button"
              onClick={() => setMinimized((v) => !v)}
              aria-label={minimized ? 'Maximize window' : 'Minimize window'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close window"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!minimized && (
          <div className="flex-1 overflow-y-auto mmo-scroll p-4 sm:p-5 space-y-4">
            {children}
          </div>
        )}

        {/* Resize Handle (Bottom-Right Corner) */}
        {!minimized && (
          <div
            onMouseDown={startResize}
            title="Drag to resize window"
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 text-slate-500 hover:text-amber-400 transition-colors z-20"
          >
            <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-current rounded-br" />
          </div>
        )}
      </div>
    </div>
  );
};
