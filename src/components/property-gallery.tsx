"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize2,
  Play,
  Film,
  Camera,
} from "lucide-react";

export interface PropertyGalleryProps {
  images: string[];
  videos?: string[];
  title: string;
  badge: string;
}

interface MediaItem {
  type: "image" | "video";
  url: string;
}

export function PropertyGallery({ images, videos = [], title, badge }: PropertyGalleryProps) {
  // Combine all images and videos into a single unified gallery
  const mediaItems: MediaItem[] = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...videos.map((url) => ({ type: "video" as const, url })),
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const viewerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const totalCount = mediaItems.length;

  const activeMedia = mediaItems[activeIndex] ?? mediaItems[0];

  useEffect(() => {
    const strip = thumbnailsRef.current;
    const activeThumbnail = strip?.querySelector<HTMLButtonElement>(".gallery-thumbnail.is-active");
    activeThumbnail?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeIndex]);

  // Reset zoom whenever active item or viewer changes
  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const showMedia = useCallback(
    (index: number) => {
      resetZoom();
      setActiveIndex((index + totalCount) % totalCount);
    },
    [totalCount, resetZoom]
  );

  const zoomIn = useCallback(() => {
    setZoomScale((scale) => Math.min(3.5, Number((scale + 0.5).toFixed(1))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomScale((scale) => {
      const next = Math.max(1, Number((scale - 0.5).toFixed(1)));
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const toggleDoubleZoom = useCallback(() => {
    setZoomScale((prev) => {
      if (prev > 1) {
        setPanOffset({ x: 0, y: 0 });
        return 1;
      }
      return 2;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    viewerRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowLeft") showMedia(activeIndex - 1);
      if (event.key === "ArrowRight") showMedia(activeIndex + 1);
      if (event.key === "+" || event.key === "=") zoomIn();
      if (event.key === "-") zoomOut();
      if (event.key === "0") resetZoom();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerOpen, activeIndex, showMedia, zoomIn, zoomOut, resetZoom]);

  function closeViewer() {
    setViewerOpen(false);
    resetZoom();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  // File download handler for high-res images and videos
  async function downloadCurrentMedia(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!activeMedia) return;

    const ext = activeMedia.type === "video" ? "mp4" : "jpg";
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `NILAY-${slug}-${activeIndex + 1}.${ext}`;

    try {
      const res = await fetch(activeMedia.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      const a = document.createElement("a");
      a.href = activeMedia.url;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  // Drag-to-pan handlers when zoomed
  function handleMouseDown(e: React.MouseEvent) {
    if (zoomScale <= 1 || activeMedia?.type === "video") return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || zoomScale <= 1) return;
    setPanOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  if (!totalCount) return null;

  return (
    <section className="detail-gallery" aria-label="Property gallery" aria-roledescription="carousel">
      {/* Main Display Area */}
      <div className="gallery-media-wrapper">
        {mediaItems.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={`${item.url}-${idx}`}
              className={`gallery-media-item ${isActive ? "is-active" : ""}`}
              aria-hidden={!isActive}
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="gallery-main-video"
                  aria-label={`${title} video tour ${idx + 1}`}
                />
              ) : (
                <img
                  src={item.url}
                  alt={`${title} — photo ${idx + 1}`}
                  className="gallery-main-image"
                  onClick={() => setViewerOpen(true)}
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              )}
            </div>
          );
        })}

        {/* Video / Photo Type Badge */}
        {activeMedia?.type === "video" ? (
          <span className="gallery-video-pill">
            <Film size={13} /> Site Footage
          </span>
        ) : (
          <span className="photo-caption">{badge}</span>
        )}

        {/* Action Overlay: Zoom & Download */}
        <div className="gallery-actions-overlay">
          <button
            type="button"
            className="gallery-action-btn"
            onClick={downloadCurrentMedia}
            title="Download this file"
            aria-label="Download current photo or video"
          >
            <Download size={14} /> Download
          </button>
          <button
            ref={triggerRef}
            type="button"
            className="gallery-action-btn"
            onClick={() => setViewerOpen(true)}
            title="Open full view & zoom"
            aria-label="Open full screen zoom view"
          >
            <Maximize2 size={14} /> Fullscreen
          </button>
        </div>

        {/* Previous / Next Arrows */}
        {totalCount > 1 && (
          <>
            <button
              className="gallery-control gallery-previous"
              type="button"
              onClick={() => showMedia(activeIndex - 1)}
              aria-label="Previous media"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              className="gallery-control gallery-next"
              type="button"
              onClick={() => showMedia(activeIndex + 1)}
              aria-label="Next media"
            >
              <ChevronRight size={22} />
            </button>
            <span className="gallery-count" aria-live="polite">
              {activeIndex + 1} / {totalCount}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails Filmstrip with Play Badge for Videos */}
      {totalCount > 1 && (
        <div ref={thumbnailsRef} className="gallery-thumbnails" aria-label="Choose property media">
          {mediaItems.map((item, index) => {
            const isItemActive = activeIndex === index;
            return (
              <button
                key={`${item.url}-${index}`}
                type="button"
                className={`gallery-thumbnail ${isItemActive ? "is-active" : ""}`}
                aria-label={`Show ${item.type} ${index + 1} of ${totalCount}`}
                aria-current={isItemActive ? "true" : undefined}
                onClick={() => showMedia(index)}
                style={
                  item.type === "image"
                    ? { backgroundImage: `url("${item.url}")` }
                    : { backgroundColor: "#0b110d" }
                }
              >
                {item.type === "video" && (
                  <div className="gallery-thumbnail-video-badge" aria-hidden="true">
                    <Play size={14} fill="white" />
                    <span>VIDEO</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
      {totalCount > 1 && (
        <p className="gallery-swipe-hint" aria-hidden="true">Swipe to browse photos and video</p>
      )}

      {/* Full-Screen Interactive Lightbox Viewer with Zoom & Download */}
      {viewerOpen && (
        <div
          className="lightbox-viewer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeViewer();
          }}
        >
          {/* Top Control Bar */}
          <div className="lightbox-top-bar">
            <div className="lightbox-info">
              <span className="lightbox-counter-badge">
                {activeMedia?.type === "video" ? <Film size={13} style={{ display: "inline", marginRight: "4px" }} /> : <Camera size={13} style={{ display: "inline", marginRight: "4px" }} />}
                {activeIndex + 1} of {totalCount}
              </span>
              <span style={{ fontWeight: 600 }}>{title}</span>
            </div>

            <div className="lightbox-controls">
              {/* Zoom controls for images */}
              {activeMedia?.type === "image" && (
                <>
                  <button
                    type="button"
                    className="lightbox-btn"
                    onClick={zoomOut}
                    disabled={zoomScale <= 1}
                    title="Zoom Out (-)"
                    aria-label="Zoom out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="lightbox-counter-badge" style={{ minWidth: "50px", textAlign: "center" }}>
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    className="lightbox-btn"
                    onClick={zoomIn}
                    disabled={zoomScale >= 3.5}
                    title="Zoom In (+)"
                    aria-label="Zoom in"
                  >
                    <ZoomIn size={16} />
                  </button>
                  {zoomScale > 1 && (
                    <button
                      type="button"
                      className="lightbox-btn"
                      onClick={resetZoom}
                      title="Reset Zoom (0)"
                      aria-label="Reset zoom"
                    >
                      <RotateCcw size={15} /> Reset
                    </button>
                  )}
                </>
              )}

              {/* Direct Download Button */}
              <button
                type="button"
                className="lightbox-btn"
                onClick={downloadCurrentMedia}
                title="Download this file to your device"
                aria-label="Download file"
              >
                <Download size={16} /> Download
              </button>

              {/* Close Button */}
              <button
                type="button"
                className="lightbox-btn lightbox-btn-icon-only"
                onClick={closeViewer}
                title="Close viewer (Esc)"
                aria-label="Close viewer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Interactive Media Stage */}
          <div
            ref={viewerRef}
            className={`lightbox-stage ${isDragging ? "is-dragging" : ""}`}
            tabIndex={-1}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(event) => {
              touchStartX.current = event.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (zoomScale > 1) return;
              const startX = touchStartX.current;
              const endX = event.changedTouches[0]?.clientX;
              touchStartX.current = null;
              if (startX === null || endX === undefined || Math.abs(endX - startX) < 40 || totalCount < 2) return;
              showMedia(activeIndex + (endX < startX ? 1 : -1));
            }}
          >
            {/* Arrows */}
            {totalCount > 1 && (
              <>
                <button
                  className="photo-viewer-control photo-viewer-previous"
                  type="button"
                  onClick={() => showMedia(activeIndex - 1)}
                  aria-label="Previous"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  className="photo-viewer-control photo-viewer-next"
                  type="button"
                  onClick={() => showMedia(activeIndex + 1)}
                  aria-label="Next"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            {/* Media Content */}
            <div
              className="lightbox-media-container"
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                cursor: activeMedia?.type === "image" ? (zoomScale > 1 ? "grab" : "zoom-in") : "default",
              }}
              onDoubleClick={activeMedia?.type === "image" ? toggleDoubleZoom : undefined}
            >
              {activeMedia?.type === "video" ? (
                <video
                  src={activeMedia.url}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="lightbox-video"
                  aria-label={`${title} video player`}
                />
              ) : (
                <img
                  src={activeMedia?.url}
                  alt={`${title} — full preview ${activeIndex + 1}`}
                  className="lightbox-image"
                  draggable={false}
                />
              )}
            </div>
          </div>

          {/* Bottom Bar: Filmstrip & Zoom Hint */}
          <div className="lightbox-bottom-bar">
            {activeMedia?.type === "image" && (
              <span className="lightbox-zoom-hint">
                {zoomScale > 1 ? "Click and drag to pan around image" : "Double-click image or use zoom buttons to inspect details"}
              </span>
            )}
            {totalCount > 1 && (
              <div className="lightbox-filmstrip" aria-label="Select photo or video">
                {mediaItems.map((item, index) => {
                  const isItemActive = activeIndex === index;
                  return (
                    <button
                      key={`lightbox-${item.url}-${index}`}
                      type="button"
                      className={`lightbox-thumb ${isItemActive ? "is-active" : ""}`}
                      onClick={() => showMedia(index)}
                      style={
                        item.type === "image"
                          ? { backgroundImage: `url("${item.url}")` }
                          : { backgroundColor: "#0b110d" }
                      }
                      aria-label={`Go to ${item.type} ${index + 1}`}
                    >
                      {item.type === "video" && (
                        <div className="gallery-thumbnail-video-badge">
                          <Play size={14} fill="white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
