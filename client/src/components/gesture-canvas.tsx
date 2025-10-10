import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { type Point } from "@shared/schema";
import windChimeSound from "@assets/wind-chimes-daydream-transition-soundroll-variation-8-8-00-15_1760111140370.mp3";

interface GestureCanvasProps {
  onGestureComplete: (gesture: Point[]) => void;
  isDisabled?: boolean;
  className?: string;
  drawColor?: string; // Hex color for drawing the gesture
}

export interface GestureCanvasRef {
  clearCanvas: () => void;
}

const GestureCanvas = forwardRef<GestureCanvasRef, GestureCanvasProps>(
  ({ onGestureComplete, isDisabled = false, className = "", drawColor = "hsl(259, 74%, 56%)", ...props }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gesturePoints, setGesturePoints] = useState<Point[]>([]);
  const gesturePointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    audioRef.current = new Audio(windChimeSound);
    audioRef.current.loop = true; // Loop while drawing
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
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
    
    setIsDrawing(true);
    isDrawingRef.current = true;
    setGesturePoints([point]);
    gesturePointsRef.current = [point];
    
    // Play wind chime sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log("Audio play failed:", err));
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }, [isDisabled]);

  const draw = useCallback((point: Point) => {
    if (!isDrawingRef.current || isDisabled) return;
    
    const newPoints = [...gesturePointsRef.current, point];
    setGesturePoints(newPoints);
    gesturePointsRef.current = newPoints;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 1; // Very thin magical line
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 8;
    ctx.shadowColor = drawColor;
    
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }, [isDisabled, drawColor]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current || isDisabled) return;
    
    setIsDrawing(false);
    isDrawingRef.current = false;
    
    // Stop wind chime sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
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
