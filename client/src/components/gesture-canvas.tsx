import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useIsPhone } from "@/hooks/use-phone";
import { type Point } from "@shared/schema";
import windChimeSound from "@assets/wind-chimes-daydream-transition-soundroll-variation-8-8-00-15_1760111140370.mp3";

interface GestureCanvasProps {
  onGestureComplete: (gesture: Point[]) => void;
  isDisabled?: boolean;
  className?: string;
  drawColor?: string; // Hex color for drawing the gesture
  showFeedback?: (correctGesture: Point[]) => void; // Function to show correct gesture feedback
  restrictToSquare?: boolean; // If true, only allow drawing inside a centered square and render its border
  onDrawStart?: (point: Point) => void;
  onDrawProgress?: (point: Point) => void;
  onDrawEnd?: (points: Point[]) => void;
}

export interface GestureCanvasRef {
  clearCanvas: () => void;
  showCorrectGesture: (gesture: Point[]) => void; // Method to show correct gesture
  showReferencePattern: (gesture: Point[], onClear?: () => void) => void; // Method to show reference pattern overlay with optional callback
  drawExternalSegment: (from: Point, to: Point, color?: string) => void;
}

const GestureCanvas = forwardRef<GestureCanvasRef, GestureCanvasProps>(
  ({ onGestureComplete, isDisabled = false, className = "", drawColor = "hsl(259, 74%, 56%)", showFeedback, restrictToSquare = false, onDrawStart, onDrawProgress, onDrawEnd, ...props }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gesturePoints, setGesturePoints] = useState<Point[]>([]);
  const gesturePointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paddingRef = useRef<number>(40); // padding for square bounds from each edge
  const externalDrawingRef = useRef<boolean>(false);
  const isPhone = useIsPhone();

  // Update square padding: 0 on phones to match CardContent offsets; 40 on desktop
  useEffect(() => {
    paddingRef.current = isPhone ? 0 : 40;
  }, [isPhone]);

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
    // Redraw bounds if restricted
    if (restrictToSquare) {
      // draw centered square area
      const pad = paddingRef.current;
      ctx.save();
      ctx.strokeStyle = "rgba(147, 51, 234, 0.6)"; // purple border
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
      ctx.restore();
    }
    setGesturePoints([]);
    gesturePointsRef.current = [];
    isDrawingRef.current = false;
    externalDrawingRef.current = false;
  }, [restrictToSquare]);

  // Show the correct gesture with purple highlighting for 1 second
  const showCorrectGesture = useCallback((gesture: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas || gesture.length === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear any existing feedback timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    
    // Clear canvas and draw the correct gesture in purple
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(gesture[0].x, gesture[0].y);
    
    // Draw the gesture with purple color and glow effect
    ctx.strokeStyle = "#a855f7"; // Purple color
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#a855f7";
    
    for (let i = 1; i < gesture.length; i++) {
      ctx.lineTo(gesture[i].x, gesture[i].y);
    }
    
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Set timeout to clear the canvas after 1 second
    feedbackTimeoutRef.current = setTimeout(() => {
      clearCanvas();
    }, 1000);
  }, [clearCanvas, showFeedback]);

  // Show the reference pattern overlay on top of existing drawing for 1.5 seconds
  const showReferencePattern = useCallback((gesture: Point[], onClear?: () => void) => {
    const canvas = canvasRef.current;
    if (!canvas || gesture.length === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear any existing feedback timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    
    // Save the current context state
    ctx.save();
    
    // Reset any transformations to ensure we're drawing in the correct coordinate space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Calculate bounding box of the gesture
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of gesture) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    // Calculate center of the gesture bounding box
    const gestureCenterX = (minX + maxX) / 2;
    const gestureCenterY = (minY + maxY) / 2;
    
    // Calculate center of the canvas
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    // Calculate offset to center the gesture
    const offsetX = canvasCenterX - gestureCenterX;
    const offsetY = canvasCenterY - gestureCenterY;
    
    // Draw the reference pattern on top of existing drawing with purple color and glow effect
    ctx.beginPath();
    ctx.moveTo(gesture[0].x + offsetX, gesture[0].y + offsetY);
    
    // Draw the gesture with purple color and glow effect
    ctx.strokeStyle = "#a855f7"; // Purple color
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#a855f7";
    
    for (let i = 1; i < gesture.length; i++) {
      ctx.lineTo(gesture[i].x + offsetX, gesture[i].y + offsetY);
    }
    
    ctx.stroke();
    
    // Restore the context state to prevent any transformations from affecting other drawings
    ctx.restore();
    
    // Set timeout to clear the canvas after 1.5 seconds
    feedbackTimeoutRef.current = setTimeout(() => {
      clearCanvas();
      // Call the callback if provided
      if (onClear) {
        onClear();
      }
    }, 1500);
  }, [clearCanvas]);

  // Expose clearCanvas and showCorrectGesture methods to parent
  const drawExternalSegment = useCallback((from: Point, to: Point, color?: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = color || drawColor;
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 8;
    ctx.shadowColor = color || drawColor;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    externalDrawingRef.current = true;
  }, [drawColor]);

  useImperativeHandle(ref, () => ({
    clearCanvas,
    showCorrectGesture,
    showReferencePattern,
    drawExternalSegment,
  }), [clearCanvas, showCorrectGesture, showReferencePattern, drawExternalSegment]);

  // Helper: check if a point is within the allowed square bounds
  const isInBounds = useCallback((point: Point) => {
    if (!restrictToSquare) return true;
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const pad = paddingRef.current;
    const minX = pad;
    const minY = pad;
    const maxX = canvas.width - pad;
    const maxY = canvas.height - pad;
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }, [restrictToSquare]);

  // Draw bounds initially on mount and when restriction flag or padding changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (restrictToSquare) {
      const pad = paddingRef.current;
      ctx.save();
      ctx.strokeStyle = "rgba(147, 51, 234, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
      ctx.restore();
    }
  }, [restrictToSquare, isPhone]);

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

    // Only start if inside bounds when restricted
    if (!isInBounds(point)) return;

    // Cancel any pending feedback/auto-clear timeout from previous gesture
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }

    // Ensure previous drawing is cleared before starting a new one
    clearCanvas();

    setIsDrawing(true);
    isDrawingRef.current = true;
    setGesturePoints([point]);
    gesturePointsRef.current = [point];
    if (onDrawStart) onDrawStart(point);

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
  }, [isDisabled, clearCanvas, isInBounds, onDrawStart]);

  const stopDrawing = useCallback(() => {
    if (isDisabled) return;
    if (!isDrawingRef.current) return;

    setIsDrawing(false);
    isDrawingRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const currentPoints = gesturePointsRef.current;

    if (currentPoints.length >= 5) {
      onGestureComplete(currentPoints);
    }
    if (onDrawEnd) onDrawEnd(currentPoints);

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      clearCanvas();
    }, 2000);
  }, [isDisabled, onGestureComplete, clearCanvas, onDrawEnd]);

  const draw = useCallback((point: Point) => {
    if (!isDrawingRef.current || isDisabled) return;
    // Stop drawing if pointer leaves bounds when restricted
    if (!isInBounds(point)) {
      stopDrawing();
      return;
    }
    
    const newPoints = [...gesturePointsRef.current, point];
    setGesturePoints(newPoints);
    gesturePointsRef.current = newPoints;
    if (onDrawProgress) onDrawProgress(point);
    
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
  }, [isDisabled, drawColor, isInBounds, stopDrawing, onDrawProgress]);

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
    if (!isDrawing && gesturePoints.length === 0 && !externalDrawingRef.current) {
      clearCanvas();
    }
  }, [isDrawing, gesturePoints.length, clearCanvas]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        className="rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          // Заполняем контейнер целиком, квадрат обеспечивается родителем
          width: "100%",
          height: "100%",
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
