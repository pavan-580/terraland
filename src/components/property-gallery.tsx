"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function PropertyGallery({ images, title, badge }: { images: string[]; title: string; badge: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const imageCount = images.length;

  useEffect(() => {
    if (imageCount < 2 || viewerOpen) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % imageCount);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [imageCount, viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    viewerRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowLeft") setActiveIndex((index) => (index - 1 + imageCount) % imageCount);
      if (event.key === "ArrowRight") setActiveIndex((index) => (index + 1) % imageCount);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [imageCount, viewerOpen]);

  if (!imageCount) return null;
  const showImage = (index: number) => setActiveIndex((index + imageCount) % imageCount);
  function closeViewer() {
    setViewerOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return <section className="detail-gallery" aria-label="Property photos" aria-roledescription="carousel">
    <button ref={triggerRef} className="detail-photo" type="button"
      aria-label={`Open photo ${activeIndex + 1} of ${imageCount}: ${title}`}
      onClick={() => setViewerOpen(true)}
      style={{ backgroundImage: `url("${images[activeIndex]}")` }}>
      <span className="photo-caption">{badge}</span>
    </button>
    {imageCount > 1 && <>
      <button className="gallery-control gallery-previous" type="button" onClick={() => showImage(activeIndex - 1)} aria-label="Previous photo"><ChevronLeft size={22} /></button>
      <button className="gallery-control gallery-next" type="button" onClick={() => showImage(activeIndex + 1)} aria-label="Next photo"><ChevronRight size={22} /></button>
      <span className="gallery-count" aria-live="polite">{activeIndex + 1} / {imageCount}</span>
    </>}
    {imageCount > 1 && <div className="gallery-thumbnails" aria-label="Choose a property photo">
      {images.map((image, index) => <button key={`${image}-${index}`} type="button"
        className={`gallery-thumbnail${activeIndex === index ? " is-active" : ""}`}
        aria-label={`Open photo ${index + 1} of ${imageCount}`}
        aria-current={activeIndex === index ? "true" : undefined}
        onClick={() => { setActiveIndex(index); setViewerOpen(true); }}
        style={{ backgroundImage: `url("${image}")` }} />)}
    </div>}
    {viewerOpen && <div className="photo-viewer-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) closeViewer();
    }}>
      <div ref={viewerRef} className="photo-viewer" role="dialog" aria-modal="true" aria-label={`Photos of ${title}`} tabIndex={-1}
        onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          const startX = touchStartX.current;
          const endX = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (startX === null || endX === undefined || Math.abs(endX - startX) < 40 || imageCount < 2) return;
          showImage(activeIndex + (endX < startX ? 1 : -1));
        }}>
        <button className="photo-viewer-close" type="button" aria-label="Close photo viewer" onClick={closeViewer}><X size={24} /></button>
        {imageCount > 1 && <>
          <button className="photo-viewer-control photo-viewer-previous" type="button" onClick={() => showImage(activeIndex - 1)} aria-label="Previous photo"><ChevronLeft size={30} /></button>
          <button className="photo-viewer-control photo-viewer-next" type="button" onClick={() => showImage(activeIndex + 1)} aria-label="Next photo"><ChevronRight size={30} /></button>
        </>}
        <Image className="photo-viewer-image" src={images[activeIndex]} alt={`${title} — photo ${activeIndex + 1} of ${imageCount}`}
          fill sizes="100vw" unoptimized />
        <span className="photo-viewer-count" aria-live="polite">{activeIndex + 1} / {imageCount}</span>
      </div>
    </div>}
  </section>;
}
