import { useEffect, useRef } from 'react';

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.loop = true;
      video.muted = true;
      video.play().catch(console.error);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        autoPlay
        muted
        loop
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>
      {/* Stronger dark overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/70 to-black/80" />
      {/* Subtle star-like sparkle overlay */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `
          radial-gradient(1px circle at 20% 30%, rgba(255,255,255,0.8) 100%, transparent),
          radial-gradient(1px circle at 80% 20%, rgba(200,220,255,0.6) 100%, transparent),
          radial-gradient(1.5px circle at 40% 70%, rgba(255,255,255,0.7) 100%, transparent),
          radial-gradient(1px circle at 60% 50%, rgba(180,200,255,0.5) 100%, transparent),
          radial-gradient(1px circle at 10% 80%, rgba(255,255,255,0.6) 100%, transparent),
          radial-gradient(1.5px circle at 90% 60%, rgba(220,240,255,0.7) 100%, transparent)
        `,
        backgroundSize: '400px 400px',
      }} />
    </div>
  );
}
