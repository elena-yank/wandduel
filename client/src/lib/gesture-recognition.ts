import { type Point } from "@shared/schema";

/**
 * Normalize gesture to a standard coordinate space (0-100)
 */
export function normalizeGesture(gesture: Point[]): Point[] {
  if (gesture.length === 0) return [];

  const minX = Math.min(...gesture.map(p => p.x));
  const maxX = Math.max(...gesture.map(p => p.x));
  const minY = Math.min(...gesture.map(p => p.y));
  const maxY = Math.max(...gesture.map(p => p.y));
  
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  
  return gesture.map(p => ({
    x: ((p.x - minX) / width) * 100,
    y: ((p.y - minY) / height) * 100
  }));
}

/**
 * Resample gesture to have a specific number of points
 */
export function resampleGesture(gesture: Point[], targetLength: number): Point[] {
  if (gesture.length === 0 || targetLength <= 0) return [];
  if (gesture.length === targetLength) return gesture;
  
  const resampled: Point[] = [];
  const step = (gesture.length - 1) / (targetLength - 1);
  
  for (let i = 0; i < targetLength; i++) {
    const index = i * step;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    
    if (lowerIndex === upperIndex || upperIndex >= gesture.length) {
      resampled.push(gesture[lowerIndex]);
    } else {
      const t = index - lowerIndex;
      const p1 = gesture[lowerIndex];
      const p2 = gesture[upperIndex];
      
      resampled.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
      });
    }
  }
  
  return resampled;
}

/**
 * Calculate euclidean distance between two points
 */
export function euclideanDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate gesture similarity using Dynamic Time Warping (DTW) algorithm
 */
export function calculateGestureSimilarity(gesture1: Point[], gesture2: Point[]): number {
  const normalized1 = normalizeGesture(gesture1);
  const normalized2 = normalizeGesture(gesture2);
  
  if (normalized1.length === 0 || normalized2.length === 0) return 0;

  // Simple approach: resample both to same length and calculate point-wise distance
  const sampleCount = Math.max(normalized1.length, normalized2.length, 20);
  const resampled1 = resampleGesture(normalized1, sampleCount);
  const resampled2 = resampleGesture(normalized2, sampleCount);

  let totalDistance = 0;
  for (let i = 0; i < sampleCount; i++) {
    totalDistance += euclideanDistance(resampled1[i], resampled2[i]);
  }

  // Convert to similarity percentage
  const maxPossibleDistance = sampleCount * Math.sqrt(100 * 100 + 100 * 100);
  const similarity = Math.max(0, 1 - (totalDistance / maxPossibleDistance));
  
  return Math.round(similarity * 100);
}

/**
 * Simple gesture classifier - identifies basic geometric shapes
 */
export function classifyGestureShape(gesture: Point[]): string {
  const normalized = normalizeGesture(gesture);
  if (normalized.length < 3) return "unknown";

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  
  // Check if it's a closed shape (circle, square)
  const isClosedShape = euclideanDistance(first, last) < 15;
  
  if (isClosedShape) {
    // Analyze curvature to distinguish circle from square
    let totalAngleChange = 0;
    for (let i = 1; i < normalized.length - 1; i++) {
      const p1 = normalized[i - 1];
      const p2 = normalized[i];
      const p3 = normalized[i + 1];
      
      const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
      
      let angleDiff = angle2 - angle1;
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      totalAngleChange += Math.abs(angleDiff);
    }
    
    return totalAngleChange > 8 ? "circle" : "square";
  }
  
  // Analyze straight lines vs curves
  const deltaX = Math.abs(last.x - first.x);
  const deltaY = Math.abs(last.y - first.y);
  
  if (deltaY < 15 && deltaX > 40) return "horizontal_line";
  if (deltaX < 15 && deltaY > 40) return "vertical_line";
  if (deltaX > 20 && deltaY > 20) return "diagonal_line";
  
  // Check for V or inverted V shapes
  const midIndex = Math.floor(normalized.length / 2);
  const mid = normalized[midIndex];
  
  if (mid.y < first.y && mid.y < last.y) return "v_shape";
  if (mid.y > first.y && mid.y > last.y) return "inverted_v";
  
  return "curve";
}
