import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { type Point } from "@shared/schema";

interface GestureCanvasProps {
  onGestureComplete: (gesture: Point[]) => void;
  isDisabled?: boolean;
  className?: string;
}

export interface GestureCanvasRef {
  clearCanvas: () => void;
}

const GestureCanvas = forwardRef<GestureCanvasRef, GestureCanvasProps>(
  ({ onGestureComplete, isDisabled = false, className = "", ...props }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gesturePoints, setGesturePoints] = useState<Point[]>([]);
  const gesturePointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Play sparkle sound effect
  const playSparkleSound = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    // Create a short magical sparkle sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // High frequency for sparkle effect
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    
    // Quick fade out
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.type = "sine";
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setGesturePoints([]);
    gesturePointsRef.current = [];
    isDrawingRef.current = false;
  }, []);

  // Expose clearCanvas method to parent
  useImperativeHandle(ref, () => ({
    clearCanvas,
  }), [clearCanvas]);

  const getCanvasPoint = useCallback((e: { clientX: number; clientY: number }): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((point: Point) => {
    if (isDisabled) return;
    
    // Play sparkle sound when starting to draw
    playSparkleSound();
    
    setIsDrawing(true);
    isDrawingRef.current = true;
    setGesturePoints([point]);
    gesturePointsRef.current = [point];
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }, [isDisabled, playSparkleSound]);

  const draw = useCallback((point: Point) => {
    if (!isDrawingRef.current || isDisabled) return;
    
    const newPoints = [...gesturePointsRef.current, point];
    setGesturePoints(newPoints);
    gesturePointsRef.current = newPoints;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    ctx.strokeStyle = "hsl(259, 74%, 56%)";
    ctx.lineWidth = 1.5; // Thin magical line
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "hsl(259, 74%, 56%)";
    
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }, [isDisabled]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current || isDisabled) return;
    
    setIsDrawing(false);
    isDrawingRef.current = false;
    
    // Use ref to get the latest points
    const currentPoints = gesturePointsRef.current;
    
    // Trigger gesture complete if we have at least one point
    if (currentPoints.length >= 1) {
      onGestureComplete(currentPoints);
    }
  }, [isDisabled, onGestureComplete]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getCanvasPoint(e.nativeEvent);
    startDrawing(point);
  }, [getCanvasPoint, startDrawing]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getCanvasPoint(e.nativeEvent);
    draw(point);
  }, [getCanvasPoint, draw]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  }, [stopDrawing]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  }, [stopDrawing]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const point = getCanvasPoint(touch);
    startDrawing(point);
  }, [getCanvasPoint, startDrawing]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const point = getCanvasPoint(touch);
    draw(point);
  }, [getCanvasPoint, draw]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  }, [stopDrawing]);

  // Clear canvas on component update
  useEffect(() => {
    if (!isDrawing && gesturePoints.length === 0) {
      clearCanvas();
    }
  }, [isDrawing, gesturePoints.length, clearCanvas]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="max-w-full h-auto rounded-lg md:max-w-full max-w-[50vw]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: isDisabled ? "not-allowed" : "crosshair",
          opacity: isDisabled ? 0.5 : 1,
          touchAction: "none",
        }}
        {...props}
      />
    </div>
  );
});

GestureCanvas.displayName = "GestureCanvas";

export default GestureCanvas;
