import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { Play, Pause } from "lucide-react";

export default function VideoPlayer({
  currentClip,
  isPlaying,
  onPlayPause,
  onClipEnd,
  onTimeUpdate,
  clips,
  duration,
  zoom = 1,
}) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [localTime, setLocalTime] = useState(0);
  const safeZoom = Math.min(Math.max(zoom, 0.5), 2);

  console.log("_________________________ videoRef", videoRef);

  // ✅ Initialize player once
  useEffect(() => {
    if (!videoRef.current || playerRef.current) return;

    const player = videojs(videoRef.current, {
      controls: false,
      autoplay: false,
      preload: "auto",
      fluid: true,
      muted: true, // required for instant play in browsers
    });

    playerRef.current = player;

    // Update current time
    player.on("timeupdate", () => {
      const time = player.currentTime();
      setLocalTime(time);
      onTimeUpdate(time);
    });

    // Move to next clip when ended
    player.on("ended", () => {
      if (onClipEnd) onClipEnd();
    });

    // return () => {
    //   player.dispose();
    //   playerRef.current = null;
    // };
  }, [clips]);

  console.log("currentClip", currentClip);

  // ✅ Load / play clip safely (no flicker or freeze)
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !currentClip) return;

    console.log("Switching clip:", currentClip.url, "isPlaying:", isPlaying);

    const currentSrc = player.currentSrc();

    // Reload only if URL changed
    if (currentClip.url && currentSrc !== currentClip.url) {
      player.pause();
      player.src({ src: currentClip.url, type: "video/mp4" });
      console.log("Switching clip2:", currentClip.url, "isPlaying:", isPlaying);
      // Wait until the video is ready before seeking & playing
      player.one("canplay", () => {
        player.currentTime(currentClip.relativeTime || 0);
        if (isPlaying) {
          const playPromise = player.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn("Autoplay blocked:", err);
            });
          }
        }
      });
    } else {
      // Same clip — just play/pause
      if (isPlaying) {
        const playPromise = player.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Play blocked:", err);
          });
        }
      } else {
        player.pause();
      }
    }
    // return () => {
    //   if (player) player.dispose();
    // };
  }, [currentClip?.url, currentClip?.relativeTime, isPlaying]);

  // ✅ Manual play toggle (ensures user interaction starts playback)
  const handleManualPlay = () => {
    const player = playerRef.current;
    if (!player) return;

    if (!isPlaying) {
      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Manual play blocked:", err);
        });
      }
    } else {
      player.pause();
    }
    onPlayPause(); // notify parent to toggle isPlaying state
  };

  // ✅ Format mm:ss
  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center w-full justify-center bg-white rounded-lg p-4 h-[60vh]">
      {/* Video Display */}
      <div className="relative w-full max-w-4xl h-[80%] rounded-lg overflow-hidden mb-2 flex items-center justify-center bg-black">
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `scale(${safeZoom})`,
            transformOrigin: "center",
          }}
        >
          <video
            ref={videoRef}
            className="video-js vjs-default-skin w-full h-full object-contain absolute inset-0"
            playsInline
            preload="auto"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 w-full max-w-4xl justify-center">
        <span className="text-black font-mono text-sm">
          {formatTime(localTime)}
        </span>

        <button
          onClick={handleManualPlay}
          className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-lg"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}
        </button>

        <span className="text-black font-mono text-sm">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
