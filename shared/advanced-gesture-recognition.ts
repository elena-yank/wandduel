import { type Point } from "./schema";

/**
 * Calculate euclidean distance between two points
 */
export function euclideanDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the distance from a point to a line segment
 * This is used to measure how close a user's point is to the ideal line
 */
export function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line start and end are the same point
    return euclideanDistance(point, lineStart);
  }
  
  let param = dot / lenSq;
  
  // Clamp parameter to segment
  param = Math.max(0, Math.min(1, param));
  
  const xx = lineStart.x + param * C;
  const yy = lineStart.y + param * D;
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
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
  let sumX = 0;
  let sumY = 0;
  for (const point of discretized) {
    sumX += point.x;
    sumY += point.y;
  }
  const centroid = {
    x: sumX / discretized.length,
    y: sumY / discretized.length
  };
  
  const centered = discretized.map(p => ({
    x: p.x - centroid.x,
    y: p.y - centroid.y
  }));
  
  // Step 3: Scale to unit square
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const point of centered) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  
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

  // Work in normalized space so thresholds are consistent across canvases
  const norm = normalizeGesture(gesture);
  if (norm.length === 0) return false;

  // Bounding box in normalized space
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of norm) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;

  // Special-case nearly straight lines: accept if long enough
  const area = width * height;
  const isLineLike = width < 0.02 || height < 0.02;
  if (isLineLike) {
    const len = pathLength(norm);
    if (len < 0.25) return false; // normalized length must be meaningful
  } else {
    // For non-linear gestures, require a larger footprint
    if (area < 0.02) return false; // was 0.005; tighten to reduce tiny scribbles
  }

  // Path length threshold in normalized space
  const length = pathLength(norm);
  if (length < 0.25) return false;

  return true;
}

/**
 * Calculate a similarity score between two gestures considering both points and lines
 * Returns a score between 0 and 100
 */
export function calculateGestureSimilarity(userGesture: Point[], referenceGesture: Point[]): number {
  // Handle edge cases
  if (userGesture.length === 0 || referenceGesture.length === 0) return 0;
  
  // Normalize both gestures
  const normalizedUser = normalizeGesture(userGesture);
  const normalizedReference = normalizeGesture(referenceGesture);
  
  // Calculate point-based similarity with cyclic alignment and reverse-path consideration
  const N = Math.min(normalizedUser.length, normalizedReference.length);
  const ref = normalizedReference.slice(0, N);
  const user = normalizedUser.slice(0, N);

  // Helper to compute average per-point similarity for a given alignment
  const avgSimilarityForOffset = (offset: number, useReversed: boolean): number => {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const refIdx = (i + offset) % N;
      const refPoint = useReversed ? ref[N - 1 - refIdx] : ref[refIdx];
      const distance = euclideanDistance(user[i], refPoint);
      // Convert distance to similarity (0-1), penalize more aggressively for deviations
      const similarity = Math.max(0, 1 - distance / 0.9);
      sum += similarity;
    }
    return (sum / N) * 100;
  };

  let bestPointSimilarity = 0;
  for (let offset = 0; offset < N; offset++) {
    // Forward direction
    const forwardSim = avgSimilarityForOffset(offset, false);
    if (forwardSim > bestPointSimilarity) bestPointSimilarity = forwardSim;
    // Reverse direction (user drew in opposite path direction)
    const reverseSim = avgSimilarityForOffset(offset, true);
    if (reverseSim > bestPointSimilarity) bestPointSimilarity = reverseSim;
  }
  const pointSimilarity = bestPointSimilarity;
  
  // Calculate line-based similarity (tighter tolerance to reduce false matches)
  let lineSimilarity = 0;
  const lineSegments = Math.max(1, normalizedReference.length - 1);
  
  for (let i = 0; i < normalizedUser.length; i++) {
    // Find the closest line segment in the reference gesture
    let minDistance = Infinity;
    
    for (let j = 0; j < normalizedReference.length - 1; j++) {
      const distance = pointToLineDistance(
        normalizedUser[i], 
        normalizedReference[j], 
        normalizedReference[j + 1]
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    // Convert distance to similarity (0-1), with a stricter penalty threshold
    const similarity = Math.max(0, 1 - minDistance / 0.35);
    lineSimilarity += similarity;
  }
  
  lineSimilarity = lineSimilarity / normalizedUser.length * 100;
  
  // Angle-based similarity: compare turning angles to distinguish shapes
  const angles = (pts: Point[]): number[] => {
    const result: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      result.push(Math.atan2(dy, dx));
    }
    return result;
  };
  const userAngles = angles(normalizedUser);
  const refAngles = angles(normalizedReference);
  const M = Math.min(userAngles.length, refAngles.length);
  const bestAngleSimForOffset = (offset: number, useReversed: boolean): number => {
    let sum = 0;
    for (let i = 0; i < M; i++) {
      const refIdx = (i + offset) % M;
      const refAng = useReversed ? refAngles[M - 1 - refIdx] : refAngles[refIdx];
      const diff = Math.abs(userAngles[i] - refAng);
      // Normalize angle difference to [0, pi]
      const wrapped = Math.min(diff, Math.abs(Math.PI * 2 - diff));
      const sim = 1 - wrapped / Math.PI; // 1 when angles match, 0 when opposite
      sum += sim;
    }
    return (sum / M) * 100;
  };
  let angleSimilarity = 0;
  for (let offset = 0; offset < M; offset++) {
    angleSimilarity = Math.max(angleSimilarity, bestAngleSimForOffset(offset, false));
    angleSimilarity = Math.max(angleSimilarity, bestAngleSimForOffset(offset, true));
  }
  
  // Combine similarities: 50% points, 30% lines, 20% angles
  const combinedSimilarity = pointSimilarity * 0.5 + lineSimilarity * 0.3 + angleSimilarity * 0.2;
  
  return Math.max(0, Math.min(100, combinedSimilarity));
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
  
  // Step 2: Calculate similarity score
  const score = calculateGestureSimilarity(userPoints, referencePoints);
  
  return { score: Math.round(score), valid: true };
}