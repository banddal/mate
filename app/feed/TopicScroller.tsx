"use client";

import { type PointerEvent, type ReactNode, useRef } from "react";

type TopicScrollerProps = {
  children: ReactNode;
};

export function TopicScroller({ children }: TopicScrollerProps) {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const dragState = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startScrollLeft: 0
  });

  function startDrag(event: PointerEvent<HTMLElement>) {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    dragState.current = {
      dragging: true,
      moved: false,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft
    };
    scroller.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const scroller = scrollerRef.current;
    const state = dragState.current;

    if (!scroller || !state.dragging) {
      return;
    }

    const deltaX = event.clientX - state.startX;

    if (Math.abs(deltaX) > 4) {
      state.moved = true;
    }

    scroller.scrollLeft = state.startScrollLeft - deltaX;
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const scroller = scrollerRef.current;

    dragState.current.dragging = false;

    if (scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <nav
      ref={scrollerRef}
      className="feed-topic-strip flex gap-3 overflow-x-auto pb-1"
      aria-label="주제 필터"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(event) => {
        if (dragState.current.moved) {
          event.preventDefault();
          event.stopPropagation();
          dragState.current.moved = false;
        }
      }}
    >
      {children}
    </nav>
  );
}
