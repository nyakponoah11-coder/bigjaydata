"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const attemptPlay = () => {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // If browser blocked autoplay, play on first user interaction
          const unlock = () => {
            if (videoRef.current) {
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
            window.removeEventListener("touchstart", unlock);
            window.removeEventListener("click", unlock);
            window.removeEventListener("scroll", unlock);
          };
          window.addEventListener("touchstart", unlock, { once: true, passive: true });
          window.addEventListener("click", unlock, { once: true, passive: true });
          window.addEventListener("scroll", unlock, { once: true, passive: true });
        });
    };

    attemptPlay();
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover opacity-80 filter brightness-95 contrast-110"
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      {/* Elegant dark gradient overlay to guarantee text legibility while keeping video prominently visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/80 pointer-events-none" />
    </div>
  );
}

