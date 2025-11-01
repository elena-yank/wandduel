import { type Point } from "./schema";
import { DTW_SCALE_FACTOR } from "./config";

/**
 * Normalize gesture to a standard coordinate space
 * 1. Discretize path to 64 points
 * 2. Center by average position
 * 3. Scale to unit square (0-1 range)
 */
export function normalizeGesture(gesture: Point[]): Point[] {
  if (gesture.length === 0) return [];
  
  // Step 1: Discretize to 64 points
  const discretized = resampleGesture(gesture, 64);
  
  // Step 2: Center by average position
  const centroid = calculateCentroid(discretized);
  const centered = discretized.map(p => ({
    x: p.x - centroid.x,
    y: p.y - centroid.y
  }));
  
  // Step 3: Scale to unit square
  const bbox = calculateBoundingBox(centered);
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  
  // Handle edge cases
  if (width === 0 && height === 0) return centered;
  
  const scale = Math.max(width, height);
  if (scale === 0) return centered;
  
  const scaled = centered.map(p => ({
    x: p.x / scale,
    y: p.y / scale
  }));
  
  return scaled;
}

/**
 * Resample gesture to have a specific number of points using linear interpolation
 */
export function resampleGesture(gesture: Point[], targetLength: number): Point[] {
  if (gesture.length === 0 || targetLength <= 0) return [];
  if (gesture.length === 1) return Array(targetLength).fill(gesture[0]);
  if (gesture.length === targetLength) return [...gesture];
  
  // Calculate cumulative distance along the gesture
  const distances = [0];
  for (let i = 1; i < gesture.length; i++) {
    const dx = gesture[i].x - gesture[i-1].x;
    const dy = gesture[i].y - gesture[i-1].y;
    distances[i] = distances[i-1] + Math.sqrt(dx*dx + dy*dy);
  }
  
  const totalDistance = distances[distances.length - 1];
  if (totalDistance === 0) return Array(targetLength).fill(gesture[0]);
  
  // Resample at equal intervals
  const resampled: Point[] = [];
  const interval = totalDistance / (targetLength - 1);
  
  let currentIndex = 0;
  for (let i = 0; i < targetLength; i++) {
    const targetDistance = i * interval;
    
    // Find the segment that contains this distance
    while (currentIndex < distances.length - 1 && distances[currentIndex + 1] < targetDistance) {
      currentIndex++;
    }
    
    if (currentIndex >= distances.length - 1) {
      resampled.push({...gesture[gesture.length - 1]});
    } else {
      const segmentStart = distances[currentIndex];
      const segmentEnd = distances[currentIndex + 1];
      const t = (targetDistance - segmentStart) / (segmentEnd - segmentStart);
      
      const p1 = gesture[currentIndex];
      const p2 = gesture[currentIndex + 1];
      
      resampled.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
      });
    }
  }
  
  return resampled;
}

/**
 * Calculate centroid of a gesture
 */
export function calculateCentroid(gesture: Point[]): Point {
  if (gesture.length === 0) return { x: 0, y: 0 };
  
  const sumX = gesture.reduce((sum, point) => sum + point.x, 0);
  const sumY = gesture.reduce((sum, point) => sum + point.y, 0);
  
  return {
    x: sumX / gesture.length,
    y: sumY / gesture.length
  };
}

/**
 * Calculate bounding box of a gesture
 */
export function calculateBoundingBox(gesture: Point[]): { minX: number, minY: number, maxX: number, maxY: number } {
  if (gesture.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  const minX = Math.min(...gesture.map(p => p.x));
  const maxX = Math.max(...gesture.map(p => p.x));
  const minY = Math.min(...gesture.map(p => p.y));
  const maxY = Math.max(...gesture.map(p => p.y));
  
  return { minX, minY, maxX, maxY };
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
 * Calculate path length of a gesture
 */
export function pathLength(gesture: Point[]): number {
  let length = 0;
  for (let i = 1; i < gesture.length; i++) {
    length += euclideanDistance(gesture[i-1], gesture[i]);
  }
  return length;
}

/**
 * Check if a gesture is valid (not scribbles)
 * Returns true if gesture is valid, false if it's scribbles
 */
export function isValidDrawing(gesture: Point[]): boolean {
  if (gesture.length === 0) return false;
  
  // Check if bounding box area is too small
  const bbox = calculateBoundingBox(gesture);
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const area = width * height;
  
  // Threshold for bounding box area (0.01 of unit square)
  if (area < 0.01) return false;
  
  // Check if path length is too short
  const length = pathLength(gesture);
  
  // Threshold for path length (empirically determined)
  if (length < 0.1) return false;
  
  return true;
}

/**
 * Implement Dynamic Time Warping algorithm for gesture comparison
 */
export function calculateDTWDistance(gesture1: Point[], gesture2: Point[]): number {
  const n = gesture1.length;
  const m = gesture2.length;
  
  // Handle edge cases
  if (n === 0 || m === 0) return Infinity;
  
  // Create DTW matrix
  const dtw: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;
  
  // Fill the matrix
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = euclideanDistance(gesture1[i-1], gesture2[j-1]);
      dtw[i][j] = cost + Math.min(
        dtw[i-1][j],    // insertion
        dtw[i][j-1],    // deletion
        dtw[i-1][j-1]   // match
      );
    }
  }
  
  return dtw[n][m];
}

/**
 * Evaluate drawing similarity with percentage accuracy
 * Returns object with score (0-100) and validity flag
 */
export function evaluateDrawing(userPoints: Point[], referencePoints: Point[]): { 
  score: number; 
  valid: boolean 
} {
  // Step 1: Check validity of user drawing
  const valid = isValidDrawing(userPoints);
  
  // If invalid, return 0%
  if (!valid) {
    return { score: 0, valid: false };
  }
  
  // Step 2: Normalize both gestures
  const normalizedUser = normalizeGesture(userPoints);
  const normalizedReference = normalizeGesture(referencePoints);
  
  // Step 3: Calculate DTW distance
  const dtwDistance = calculateDTWDistance(normalizedUser, normalizedReference);
  
  // Step 4: Convert distance to score (0-100)
  // Empirically determined scaleFactor for human-friendly scoring
  // Centralized in shared/config to avoid magic numbers and enable tuning
  const score = Math.max(0, 100 - dtwDistance * DTW_SCALE_FACTOR);
  
  return { score: Math.round(score), valid: true };
}