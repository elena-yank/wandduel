import { useRef, useEffect, useState, useCallback } from "react";
import { type Point } from "@shared/schema";

interface GestureCanvasProps {
  onGestureComplete: (gesture: Point[]) => void;
  isDisabled?: boolean;
  className?: string;
}

export default function GestureCanvas({ 
  onGestureComplete, 
  isDisabled = false, 
  className = "",
  ...props 
}: GestureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gesturePoints, setGesturePoints] = useState<Point[]>([]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setGesturePoints([]);
  }, []);

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
    setGesturePoints([point]);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }, [isDisabled]);

  const draw = useCallback((point: Point) => {
    if (!isDrawing || isDisabled) return;
    
    setGesturePoints(prev => [...prev, point]);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    ctx.strokeStyle = "hsl(259, 74%, 56%)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "hsl(259, 74%, 56%)";
    
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }, [isDrawing, isDisabled]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || isDisabled) return;
    
    setIsDrawing(false);
    
    // Only trigger gesture complete if we have enough points
    if (gesturePoints.length >= 3) {
      onGestureComplete(gesturePoints);
    }
  }, [isDrawing, isDisabled, gesturePoints, onGestureComplete]);

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
        className="max-w-full h-auto rounded-lg"
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
        }}
        {...props}
      />
    </div>
  );
}
