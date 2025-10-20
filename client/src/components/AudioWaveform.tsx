import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  stream?: MediaStream | null;
  audioUrl?: string;
  isRecording?: boolean;
  isPlaying?: boolean;
  className?: string;
}

export function AudioWaveform({ 
  stream, 
  audioUrl, 
  isRecording = false, 
  isPlaying = false,
  className = "" 
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Setup for live recording
    if (stream && isRecording) {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      analyzerRef.current = analyzer;

      analyzer.fftSize = 256; // Reduced from 2048 for better performance
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);

      const draw = () => {
        animationRef.current = requestAnimationFrame(draw);
        analyzer.getByteTimeDomainData(dataArray);

        ctx.fillStyle = "hsl(var(--background))";
        ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        ctx.lineWidth = 2;
        ctx.strokeStyle = "hsl(var(--primary))";
        ctx.beginPath();

        // Downsample to 128 points for smoother rendering
        const downsampleRate = Math.floor(bufferLength / 128);
        const sliceWidth = canvas.offsetWidth / 128;
        let x = 0;

        for (let i = 0; i < bufferLength; i += downsampleRate) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.offsetHeight) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.offsetWidth, canvas.offsetHeight / 2);
        ctx.stroke();
      };

      draw();
    }
    // Setup for playback
    else if (audioUrl && isPlaying) {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      analyzerRef.current = analyzer;

      analyzer.fftSize = 256;
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Connect audio element to analyzer
      const audioElement = document.querySelector<HTMLAudioElement>(`audio[src="${audioUrl}"]`);
      if (audioElement) {
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyzer);
        analyzer.connect(audioContext.destination);

        const draw = () => {
          animationRef.current = requestAnimationFrame(draw);
          analyzer.getByteFrequencyData(dataArray);

          ctx.fillStyle = "hsl(var(--background))";
          ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

          const barWidth = (canvas.offsetWidth / bufferLength) * 2.5;
          let barHeight;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.offsetHeight;

            const hue = 200 + (i / bufferLength) * 60;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            ctx.fillRect(x, canvas.offsetHeight - barHeight, barWidth, barHeight);

            x += barWidth + 1;
          }
        };

        draw();
      }
    }
    // Static waveform (not recording or playing)
    else {
      ctx.fillStyle = "hsl(var(--muted))";
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      ctx.strokeStyle = "hsl(var(--muted-foreground) / 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Draw a simple static wave pattern
      const amplitude = canvas.offsetHeight / 4;
      const frequency = 0.02;

      for (let x = 0; x < canvas.offsetWidth; x++) {
        const y = canvas.offsetHeight / 2 + Math.sin(x * frequency) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, [stream, audioUrl, isRecording, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full rounded ${className}`}
      style={{ height: "60px" }}
    />
  );
}
