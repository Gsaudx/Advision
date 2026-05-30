import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '../api';
import { NotificationPanel } from './NotificationPanel';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const { data: count = 0 } = useUnreadCount();
  const ref = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | undefined>(undefined);
  const popoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = count;

    if (count <= 0 || (prev !== undefined && count <= prev) || isOpen) return;

    if (popoverTimer.current) clearTimeout(popoverTimer.current);
    const showTimer = setTimeout(() => {
      setShowPopover(true);
      popoverTimer.current = setTimeout(() => setShowPopover(false), 5000);
    }, 0);

    return () => clearTimeout(showTimer);
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setShowPopover(false);
    if (popoverTimer.current) clearTimeout(popoverTimer.current);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="hidden sm:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold px-0.5">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {showPopover && !isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 animate-fade-in">
          {/* seta */}
          <div className="absolute -top-1.5 right-3.5 w-3 h-3 bg-slate-800 border-l border-t border-slate-600 rotate-45" />
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl px-3.5 py-2.5 w-52">
            <p className="text-xs font-semibold text-white">
              Você tem novas notificações
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clique no sino para ver
            </p>
          </div>
        </div>
      )}

      {isOpen && <NotificationPanel onClose={() => setIsOpen(false)} />}
    </div>
  );
}
