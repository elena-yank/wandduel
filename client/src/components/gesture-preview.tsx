import { useEffect, useRef } from "react";
import type { Point } from "@shared/schema";

export default function GesturePreview({ gesture, className = "" }: { gesture: Point[]; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gesture || gesture.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minX = Math.min(...gesture.map(p => p.x));
    const maxX = Math.max(...gesture.map(p => p.x));
    const minY = Math.min(...gesture.map(p => p.y));
    const maxY = Math.max(...gesture.map(p => p.y));
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const scale = Math.min(canvas.width / width, canvas.height / height) * 0.95;
    const offsetX = (canvas.width - width * scale) / 2;
    const offsetY = (canvas.height - height * scale) / 2;

    ctx.strokeStyle = 'rgb(147, 51, 234)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    gesture.forEach((point, index) => {
      const x = (point.x - minX) * scale + offsetX;
      const y = (point.y - minY) * scale + offsetY;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }, [gesture]);

  return (
    <canvas 
      ref={canvasRef} 
      width={80} 
      height={80} 
      className={`bg-background/50 rounded border border-primary/20 ${className}`}
    />
  );
}
