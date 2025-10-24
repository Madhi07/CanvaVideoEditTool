'use client';

import { useState, useRef, useEffect } from "react";

// Minimum duration in seconds to prevent trim collapse
const MIN_CLIP_DURATION = 0.1;

export default function Timeline({
  clips = [],
  currentTime = 0,
  totalDuration = 0,
  onClipUpdate = () => {},
  onClipSelect = () => {},
  onSeek = () => {},
  selectedClipId = null,
}) {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null);
  const [dragClipId, setDragClipId] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);

  const pixelsPerSecond = 100;
  const maxDuration = Math.max(totalDuration, 60);
  const timelineWidth = maxDuration * pixelsPerSecond;

  // ✅ Handle click to seek
  const handleTimelineClick = (e) => {
    if (!timelineRef.current || isDragging) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    const clampedTime = Math.max(0, Math.min(time, totalDuration));
    onSeek(clampedTime);
  };

  // ✅ Handle clip interactions
  const handleClipMouseDown = (e, clip, type) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setDragClipId(clip.id);
    setDragStartX(e.clientX);

    if (type === "move") {
      setDragStartValue(clip.startTime);
    } else if (type === "trim-left") {
      setDragStartValue(clip.trimStart);
    } else if (type === "trim-right") {
      setDragStartValue(clip.trimEnd);
    }

    onClipSelect(clip);
  };

  // ✅ Drag logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !dragClipId || !dragType) return;

      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;
      const clip = clips.find((c) => c.id === dragClipId);
      if (!clip) return;

      if (dragType === "move") {
        const newStartTime = Math.max(0, dragStartValue + deltaTime);
        const clipDuration = clip.endTime - clip.startTime;
        onClipUpdate(dragClipId, {
          startTime: newStartTime,
          endTime: newStartTime + clipDuration,
        });
      } else if (dragType === "trim-left") {
        const newTrimStart = Math.max(
          0,
          Math.min(
            dragStartValue + deltaTime,
            clip.duration - clip.trimEnd - MIN_CLIP_DURATION
          )
        );
        const newDuration = clip.duration - newTrimStart - clip.trimEnd;
        const newEndTime = clip.startTime + newDuration;
        onClipUpdate(dragClipId, {
          trimStart: newTrimStart,
          startTime: clip.startTime + (newTrimStart - clip.trimStart),
          endTime: newEndTime,
        });
      } else if (dragType === "trim-right") {
        const newTrimEnd = Math.max(
          0,
          Math.min(
            dragStartValue - deltaTime,
            clip.duration - clip.trimStart - MIN_CLIP_DURATION
          )
        );
        const newDuration = clip.duration - clip.trimStart - newTrimEnd;
        const newEndTime = clip.startTime + newDuration;
        onClipUpdate(dragClipId, {
          trimEnd: newTrimEnd,
          endTime: newEndTime,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragType(null);
      setDragClipId(null);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [
    isDragging,
    dragClipId,
    dragType,
    dragStartX,
    dragStartValue,
    clips,
    pixelsPerSecond,
    onClipUpdate,
  ]);

  // ✅ Auto-scroll timeline while playing
  useEffect(() => {
    if (!timelineRef.current) return;
    const playheadX = currentTime * pixelsPerSecond;
    const container = timelineRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    if (playheadX > scrollLeft + containerWidth - 100) {
      container.scrollLeft = playheadX - containerWidth / 2;
    }
  }, [currentTime, pixelsPerSecond]);

  // ✅ Optional keyboard seek
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        onSeek(Math.max(0, currentTime - 1));
      } else if (e.key === "ArrowRight") {
        onSeek(Math.min(totalDuration, currentTime + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, totalDuration, onSeek]);

  // ✅ Time markers every 10s
  const generateTimeMarkers = () => {
    const markers = [];
    const totalSeconds = Math.ceil(maxDuration);
    for (let i = 0; i <= totalSeconds; i += 10) {
      markers.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${i * pixelsPerSecond}px` }}
        >
          <div className="w-px h-3 bg-gray-300"></div>
          <span className="text-xs text-gray-400 mt-1">{i}s</span>
        </div>
      );
    }
    return markers;
  };

  return (
    <div className="p-4">
      {/* Time markers */}
      <div className="relative mb-4 overflow-x-auto scrollbar-hide">
        <div className="absolute top-0 left-0 w-full h-px bg-gray-300"></div>
        <div className="relative h-10" style={{ width: `${timelineWidth}px` }}>
          {generateTimeMarkers()}
        </div>
      </div>

      {/* Main timeline */}
      <div
        ref={timelineRef}
        className="relative overflow-x-auto scrollbar-hide cursor-pointer"
        style={{ minHeight: "200px" }}
        onClick={handleTimelineClick}
      >
        <div
          className="relative"
          style={{ width: `${timelineWidth}px`, minHeight: "140px" }}
        >
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[#754ffe] z-20 pointer-events-none transition-all"
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
          >
            <div className="absolute -top-2 -left-[5px] w-3 h-3 bg-[#754ffe] rotate-45 rounded-sm shadow-md"></div>
          </div>

          {/* Clips */}
          {clips.map((clip) => {
            const clipDuration = clip.endTime - clip.startTime;
            const clipWidth = clipDuration * pixelsPerSecond;
            const clipLeft = clip.startTime * pixelsPerSecond;

            const isActive =
              currentTime >= clip.startTime && currentTime < clip.endTime;
            const isSelected = clip.id === selectedClipId;
            const trackPosition = clip.track === 1 ? 120 : 20;

            return (
              <div
                key={clip.id}
                className={`absolute h-[80px] rounded-xl cursor-move shadow-md border transition-all flex items-center justify-center overflow-hidden ${
                  isSelected
                    ? "border-[#754ffe] ring-2 ring-[#754ffe]/40"
                    : isActive
                    ? "border-indigo-400 ring-1 ring-indigo-300"
                    : "border-gray-200 hover:shadow-lg"
                }`}
                style={{
                  left: `${clipLeft}px`,
                  width: `${clipWidth}px`,
                  top: `${trackPosition}px`,
                }}
                onMouseDown={(e) => handleClipMouseDown(e, clip, "move")}
              >
                {clip.thumbnail ? (
                  <img
                    src={clip.thumbnail}
                    alt="clip"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-sm">No thumbnail</div>
                )}

                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-[1px] rounded-md">
                  {clipDuration.toFixed(1)}s
                </div>

                {clip.hasAudio && (
                  <div className="absolute -bottom-[4px] left-0 right-0 h-[3px] bg-blue-400 rounded-full"></div>
                )}

                {/* Trim Handles */}
                {isSelected && (
                  <>
                    <div
                      className="absolute top-0 bottom-0 -left-[5px] w-[10px] bg-[#754ffe] cursor-col-resize z-30 opacity-80"
                      onMouseDown={(e) =>
                        handleClipMouseDown(e, clip, "trim-left")
                      }
                    />
                    <div
                      className="absolute top-0 bottom-0 -right-[5px] w-[10px] bg-[#754ffe] cursor-col-resize z-30 opacity-80"
                      onMouseDown={(e) =>
                        handleClipMouseDown(e, clip, "trim-right")
                      }
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
