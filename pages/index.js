import { useState, useEffect, useCallback, useRef } from "react";
import VideoPlayer from "../components/VideoPlayer";
import Timeline from "../components/Timeline";
import MediaUploader from "../components/MediaUploader";
import { Toolbar } from "../components/Toolbar";
import {
  extractThumbnailFromVideo,
  getImageThumbnail,
} from "../utils/thumbnailExtractor";

export default function Home() {
  // ✅ Default first clip
  const [clips, setClips] = useState([
    {
      id: "default-clip",
      type: "video",
      url: "/parameters_example.mp4", // default demo video in /public
      fileName: "parameters_example.mp4",
      mimeType: "video/mp4",
      duration: 10,
      startTime: 0,
      endTime: 10,
      trimStart: 0,
      trimEnd: 0,
      hasAudio: true,
      thumbnail: null, // will be generated
      track: 0,
    },
  ]);

  const [selectedClipId, setSelectedClipId] = useState("default-clip");
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(10);
  const [videoZoom, setVideoZoom] = useState(1);

  const clipsRef = useRef(clips);
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  // ✅ Load default video metadata + thumbnail
  useEffect(() => {
    const defaultClip = clips.find((c) => c.id === "default-clip");
    if (!defaultClip) return;

    const loadDefaultMetadata = async () => {
      try {
        const video = document.createElement("video");
        video.src = defaultClip.url;
        video.crossOrigin = "anonymous";

        video.onloadedmetadata = async () => {
          const durationSec = video.duration;

          let thumbnail = null;
          try {
            const response = await fetch(defaultClip.url);
            const blob = await response.blob();
            thumbnail = await extractThumbnailFromVideo(blob, 1);
            if (thumbnail) new Image().src = thumbnail;
          } catch (err) {
            console.warn("⚠️ Failed to extract default video thumbnail:", err);
          }

          setClips((prev) =>
            prev.map((c) =>
              c.id === "default-clip"
                ? {
                    ...c,
                    duration: durationSec,
                    endTime: durationSec,
                    thumbnail,
                  }
                : c
            )
          );
          setTotalDuration(durationSec);
        };
      } catch (err) {
        console.error("Failed to load default video metadata:", err);
      }
    };

    loadDefaultMetadata();
  }, []);

  // ✅ Auto-calculate total timeline duration
  useEffect(() => {
    if (!clips.length) return;

    const videoClips = clips.filter(
      (c) => c.type === "video" || c.type === "image"
    );
    const audioClips = clips.filter((c) => c.type === "audio");

    const maxVideoEnd =
      videoClips.length > 0 ? Math.max(...videoClips.map((c) => c.endTime)) : 0;
    const maxAudioEnd =
      audioClips.length > 0 ? Math.max(...audioClips.map((c) => c.endTime)) : 0;

    setTotalDuration(Math.max(maxVideoEnd, maxAudioEnd));
  }, [clips]);

  console.log("--------------> 🥿🥿🤷‍♂️🤷‍♂️🤷‍♂️", clips);

  const handleClipEnd = useCallback(() => {
    const currentIndex = clipsRef.current.findIndex(
      (c) => c.id === selectedClipId
    );

    if (currentIndex !== -1 && currentIndex < clipsRef.current.length - 1) {
      const nextClip = clipsRef.current[currentIndex + 1];
      setSelectedClipId(nextClip.id);
      setCurrentTime(nextClip.startTime);
      setIsPlaying(true);
    } else {
      setIsPlaying(false); 
    }
  }, [selectedClipId]);

  // ✅ Smooth sequential playback
  // const handleClipEnd = useCallback(() => {
  //   if (!clips.length || !selectedClipId) return;

  //   const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
  //   console.log(
  //     "-----------------> 🥿🥿🥿🥿",
  //     currentIndex,
  //     clips,
  //     clips.length - 1,
  //     currentIndex !== -1 && currentIndex < clips.length - 1
  //   );

  //   if (currentIndex !== -1 && currentIndex < clips.length - 1) {
  //     const nextClip = clips[currentIndex + 1];

  //     console.log("🤷‍♂️🥿❤️", nextClip);
  //     // 🧠 Important: update BOTH clip and time
  //     setSelectedClipId(nextClip.id);
  //     setCurrentTime(nextClip.startTime);
  //     setIsPlaying(true); // auto-play next clip
  //   } else {
  //     // 🛑 No more clips — stop playback
  //     setIsPlaying(false);
  //   }
  // }, [clips, selectedClipId, isPlaying, currentTime]);

  // ✅ Upload handler (fixed)
  const handleMediaUpload = async (file, type) => {
    const url = URL.createObjectURL(file);

    // get media duration in seconds
    const getDuration = () =>
      new Promise((resolve) => {
        if (type === "image") return resolve(5); // default 5 seconds
        const media =
          type === "video"
            ? document.createElement("video")
            : document.createElement("audio");
        media.src = url;
        media.onloadedmetadata = () => resolve(media.duration || 0);
      });

    const duration = await getDuration();

    let startTime = 0;
    let track = 0;
    if (type === "video" || type === "image") {
      const videoClips = clips.filter(
        (c) => c.type === "video" || c.type === "image"
      );
      startTime =
        videoClips.length > 0
          ? Math.max(...videoClips.map((c) => c.endTime))
          : 0;
      track = 0;
    } else if (type === "audio") {
      const audioClips = clips.filter((c) => c.type === "audio");
      startTime =
        audioClips.length > 0
          ? Math.max(...audioClips.map((c) => c.endTime))
          : 0;
      track = 1;
    }

    let thumbnail = null;
    try {
      if (type === "video") {
        thumbnail = await extractThumbnailFromVideo(file, 1);
      } else if (type === "image") {
        thumbnail = await getImageThumbnail(file);
      }
      if (thumbnail) new Image().src = thumbnail; // preload instantly
    } catch (error) {
      console.error("Thumbnail extraction failed:", error);
    }

    const newClip = {
      id: `clip-${Date.now()}`,
      type,
      url,
      fileName: file.name,
      mimeType: file.type || "video/mp4",
      duration,
      startTime,
      endTime: startTime + duration,
      trimStart: 0,
      trimEnd: 0,
      hasAudio: type === "video" || type === "audio",
      thumbnail,
      track,
    };

    setClips((prev) => [...prev, newClip]);

    // only select the first uploaded clip automatically
    if (!selectedClipId) {
      setSelectedClipId(newClip.id);
    }
  };

  // ✅ Timeline & Player handlers
  const handleClipUpdate = (clipId, updates) =>
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
    );

  const handleClipSelect = (clip) => {
    setSelectedClipId(clip.id);
    setCurrentTime(clip.startTime);
    setIsPlaying(false);
  };

  const handleSeek = (time) => {
    setCurrentTime(time);
    setIsPlaying(false);
  };

  const handlePlayPause = () => setIsPlaying((prev) => !prev);
  const handleTimeUpdate = (timeSec) => {
    const currentClip = getCurrentClip();
    if (!currentClip) return;

    // Map local clip time → global timeline
    const globalTime = (currentClip.startTime || 0) + timeSec;
    setCurrentTime(globalTime);
  };

  // ✅ Determine which clip to play
  const getCurrentClip = useCallback(() => {
    const selected = clips.find((c) => c.id === selectedClipId);
    if (!selected) return null;
    return {
      id: selected.id,
      url: selected.url,
      type: selected.type,
      // relativeTime: Math.max(
      //   0,
      //   currentTime - selected.startTime + selected.trimStart
      // ),
      startTime: selected.startTime,

      // keep relativeTime simple — always start from clip’s trim start
      relativeTime:
        currentTime >= selected.startTime && currentTime < selected.endTime
          ? currentTime - selected.startTime + selected.trimStart
          : 0,
    };
  }, [selectedClipId, currentTime, clips]);

  // ✅ Ensure at least one clip selected
  useEffect(() => {
    if (clips.length && !selectedClipId) {
      setSelectedClipId(clips[0].id);
    }
  }, [clips, selectedClipId]);

  // ✅ Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space bar - play/pause
      if (e.code === "Space" && e.target.tagName !== "INPUT") {
        e.preventDefault();
        handlePlayPause();
      }
      // Left arrow - seek backward
      else if (e.code === "ArrowLeft" && e.target.tagName !== "INPUT") {
        e.preventDefault();
        const newTime = Math.max(0, currentTime - 1);
        handleSeek(newTime);
      }
      // Right arrow - seek forward
      else if (e.code === "ArrowRight" && e.target.tagName !== "INPUT") {
        e.preventDefault();
        const newTime = Math.min(totalDuration, currentTime + 1);
        handleSeek(newTime);
      }
      // Delete key - delete selected clip
      else if (
        e.code === "Delete" &&
        selectedClipId &&
        e.target.tagName !== "INPUT"
      ) {
        e.preventDefault();
        setClips((prev) => prev.filter((clip) => clip.id !== selectedClipId));
        setSelectedClipId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, totalDuration, selectedClipId, clips]);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col items-center justify-center">
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-indigo-600">Video Editor</h1>
          <MediaUploader onMediaUpload={handleMediaUpload} />
        </div>

        {/* Player */}
        <div className="p-4">
          {console.log(
            "getCurrentClip()",
            getCurrentClip(),
            selectedClipId,
            clips
          )}
          <VideoPlayer
            currentClip={getCurrentClip()}
            currentTime={currentTime}
            isPlaying={isPlaying}
            clips={clips}
            onPlayPause={handlePlayPause}
            onClipEnd={() => {
              handleClipEnd();
            }}
            onTimeUpdate={handleTimeUpdate}
            duration={totalDuration}
            zoom={videoZoom}
          />
        </div>

        {/* Timeline */}
        <div className="p-4">
          <Timeline
            clips={clips}
            currentTime={currentTime}
            totalDuration={totalDuration}
            onClipUpdate={handleClipUpdate}
            onClipSelect={handleClipSelect}
            onSeek={handleSeek}
            selectedClipId={selectedClipId}
          />
        </div>

        {/* Toolbar */}
        <div className="rounded-xl bg-white p-4 shadow-md border border-gray-200 flex justify-between items-center">
          <Toolbar
            currentTime={currentTime}
            totalDuration={totalDuration}
            videoZoom={videoZoom}
            setVideoZoom={setVideoZoom}
          />
        </div>
      </div>
    </div>
  );
}
