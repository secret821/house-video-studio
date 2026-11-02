/** Pointer sorting shares one path for mouse, pen and touch; project data changes only on drop. */
import { useEffect, useRef, useState, type PointerEvent } from 'react';

import type { useVideoEdit } from './use-video-edit';

const SCROLL_EDGE = 48;
const SCROLL_SPEED = 12;
const DRAG_THRESHOLD = 6;
interface DragSession {
  id: string;
  pointerId: number;
  startY: number;
  x: number;
  y: number;
  target: number;
  moved: boolean;
}

/** Keep transient pointer state separate from the editor's single project, including cancellation and unmount. */
export function useMaterialSort(editor: ReturnType<typeof useVideoEdit>) {
  const list = useRef<HTMLOListElement>(null);
  const session = useRef<DragSession | null>(null);
  const frame = useRef(0);
  const [drag, setDrag] = useState<{ id: string; target: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const { materials, busy, moveMaterial } = editor;

  /** Locate the nearest row in current viewport coordinates, also after automatic scrolling. */
  function updateTarget() {
    const active = session.current;
    if (!active || !list.current) return;
    const rows = Array.from(list.current.children);
    let nearest = active.target;
    let distance = Infinity;
    rows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      const next = Math.abs(active.y - (rect.top + rect.height / 2));
      if (next < distance) {
        nearest = index;
        distance = next;
      }
    });
    if (nearest !== active.target) {
      active.target = nearest;
      setDrag({ id: active.id, target: nearest });
    }
  }
  /** Dragging near the visible edges scrolls the document, never a nested miniature list. */
  function scrollWhileDragging() {
    const active = session.current;
    if (!active) return;
    const top =
      document.querySelector('.studio-step-nav')?.getBoundingClientRect()
        .bottom ?? 0;
    const bottom =
      document.querySelector('.studio-export-bar')?.getBoundingClientRect()
        .top ?? window.innerHeight;
    let offset = 0;
    if (active.y < top + SCROLL_EDGE) offset = -SCROLL_SPEED;
    else if (active.y > bottom - SCROLL_EDGE) offset = SCROLL_SPEED;
    if (offset && active.moved) {
      window.scrollBy(0, offset);
      updateTarget();
    }
    frame.current = requestAnimationFrame(scrollWhileDragging);
  }
  /** A dedicated handle prevents ordinary touch scrolling on the rest of the row from starting a drag. */
  function startDrag(event: PointerEvent<HTMLElement>, index: number) {
    if (busy || materials.length < 2 || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    session.current = {
      id: materials[index].id,
      pointerId: event.pointerId,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      target: index,
      moved: false,
    };
    setDrag({ id: materials[index].id, target: index });
    setAnnouncement(`正在移动素材${index + 1}，松开放置，Escape取消。`);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(scrollWhileDragging);
  }
  /** Only movement beyond a small threshold selects a new drop position. */
  function moveDrag(event: PointerEvent<HTMLElement>) {
    const active = session.current;
    if (!active || active.pointerId !== event.pointerId) return;
    active.x = event.clientX;
    active.y = event.clientY;
    active.moved ||= Math.abs(active.y - active.startY) >= DRAG_THRESHOLD;
    if (active.moved) updateTarget();
  }
  /** A cancelled gesture or drop outside the list leaves media, timing and text untouched. */
  function finishDrag(commit: boolean) {
    const active = session.current;
    if (!active) return;
    session.current = null;
    cancelAnimationFrame(frame.current);
    setDrag(null);
    const bounds = list.current?.getBoundingClientRect();
    const inside =
      bounds &&
      active.x >= bounds.left &&
      active.x <= bounds.right &&
      active.y >= bounds.top &&
      active.y <= bounds.bottom;
    const from = materials.findIndex(({ id }) => id === active.id);
    if (
      commit &&
      !busy &&
      inside &&
      active.moved &&
      from >= 0 &&
      from !== active.target
    ) {
      moveMaterial(from, active.target - from);
      setAnnouncement(`素材已移到第${active.target + 1}位，请保存草稿。`);
    } else setAnnouncement('排序未改变。');
  }
  /** Keyboard sorting is an alternative to dragging for each focused handle. */
  function moveWithKeyboard(index: number, offset: number) {
    const target = index + offset;
    if (busy || session.current || target < 0 || target >= materials.length)
      return;
    moveMaterial(index, offset);
    setAnnouncement(`素材已移到第${target + 1}位，请保存草稿。`);
  }
  useEffect(() => {
    if (busy) {
      session.current = null;
      cancelAnimationFrame(frame.current);
      setDrag(null);
    }
    return () => {
      session.current = null;
      cancelAnimationFrame(frame.current);
    };
  }, [busy]);
  return {
    list,
    drag,
    announcement,
    startDrag,
    moveDrag,
    finishDrag,
    moveWithKeyboard,
  };
}
