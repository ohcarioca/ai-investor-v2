'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseSidebarResizeOptions {
  minWidth?: number;
  maxWidthPercent?: number; // Max width as percentage of screen (0-100)
  defaultWidth?: number;
  storageKey?: string;
}

interface UseSidebarResizeReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

const DEFAULT_WIDTH = 384; // w-96
const MIN_WIDTH = 280;
const MAX_WIDTH_PERCENT = 50; // 50% of screen

export function useSidebarResize(options: UseSidebarResizeOptions = {}): UseSidebarResizeReturn {
  const {
    minWidth = MIN_WIDTH,
    maxWidthPercent = MAX_WIDTH_PERCENT,
    defaultWidth = DEFAULT_WIDTH,
    storageKey = 'sidebar-width',
  } = options;

  // Calculate max width based on screen size
  const getMaxWidth = useCallback(() => {
    if (typeof window === 'undefined') return 600;
    return Math.floor(window.innerWidth * (maxWidthPercent / 100));
  }, [maxWidthPercent]);

  // Initialize width from localStorage or default
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth;
    const maxWidth = Math.floor(window.innerWidth * (maxWidthPercent / 100));
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);

  // Handle mouse move during resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const maxWidth = getMaxWidth();
      // Calculate new width (sidebar is on right, so drag left = increase width)
      const deltaX = startXRef.current - e.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + deltaX));

      setWidth(newWidth);
      // Dispatch event immediately during drag for instant sync
      window.dispatchEvent(new CustomEvent('sidebar-resize', { detail: { width: newWidth } }));
    },
    [isResizing, minWidth, getMaxWidth]
  );

  // Handle mouse up - stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [storageKey, width]);

  // Handle mouse down - start resizing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  // Add/remove global event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Save width to localStorage (event is dispatched in handleMouseMove for instant sync)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [width, storageKey]);

  // Adjust width if window resizes and current width exceeds new max
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = getMaxWidth();
      if (width > maxWidth) {
        setWidth(maxWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, getMaxWidth]);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
}
