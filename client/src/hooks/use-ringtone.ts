import { useRef, useCallback } from 'react';

export function useRingtone() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const play = useCallback(() => {
    if (isPlayingRef.current) return;

    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio('/audio/djembe-ringtone.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.7; // 70% volume for pleasant sound
    }

    audioRef.current.play().catch((error) => {
      console.error('Failed to play ringtone:', error);
    });
    isPlayingRef.current = true;
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current && isPlayingRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset to start
      isPlayingRef.current = false;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      isPlayingRef.current = false;
    }
  }, []);

  return { play, stop, cleanup };
}
