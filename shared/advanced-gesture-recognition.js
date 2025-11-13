"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.euclideanDistance = euclideanDistance;
exports.pointToLineDistance = pointToLineDistance;
exports.resampleGesture = resampleGesture;
exports.normalizeGesture = normalizeGesture;
exports.pathLength = pathLength;
exports.isValidDrawing = isValidDrawing;
exports.calculateGestureSimilarity = calculateGestureSimilarity;
exports.evaluateDrawing = evaluateDrawing;
/**
 * Calculate euclidean distance between two points
 */
function euclideanDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}
/**
 * Calculate the distance from a point to a line segment
 * This is used to measure how close a user's point is to the ideal line
 */
function pointToLineDistance(point, lineStart, lineEnd) {
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
function resampleGesture(gesture, targetLength) {
    if (gesture.length === 0 || targetLength <= 0)
        return [];
    if (gesture.length === 1)
        return Array(targetLength).fill(gesture[0]);
    if (gesture.length === targetLength)
        return [...gesture];
    // Calculate cumulative distance along the gesture
    const distances = [0];
    for (let i = 1; i < gesture.length; i++) {
        const dx = gesture[i].x - gesture[i - 1].x;
        const dy = gesture[i].y - gesture[i - 1].y;
        distances[i] = distances[i - 1] + Math.sqrt(dx * dx + dy * dy);
    }
    const totalDistance = distances[distances.length - 1];
    if (totalDistance === 0)
        return Array(targetLength).fill(gesture[0]);
    // Resample at equal intervals
    const resampled = [];
    const interval = totalDistance / (targetLength - 1);
    let currentIndex = 0;
    for (let i = 0; i < targetLength; i++) {
        const targetDistance = i * interval;
        // Find the segment that contains this distance
        while (currentIndex < distances.length - 1 && distances[currentIndex + 1] < targetDistance) {
            currentIndex++;
        }
        if (currentIndex >= distances.length - 1) {
            resampled.push({ ...gesture[gesture.length - 1] });
        }
        else {
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
function normalizeGesture(gesture) {
    if (gesture.length === 0)
        return [];
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
    if (width === 0 && height === 0)
        return centered;
    const scale = Math.max(width, height);
    if (scale === 0)
        return centered;
    const scaled = centered.map(p => ({
        x: p.x / scale,
        y: p.y / scale
    }));
    return scaled;
}
/**
 * Calculate path length of a gesture
 */
function pathLength(gesture) {
    let length = 0;
    for (let i = 1; i < gesture.length; i++) {
        length += euclideanDistance(gesture[i - 1], gesture[i]);
    }
    return length;
}
/**
 * Check if a gesture is valid (not scribbles)
 * Returns true if gesture is valid, false if it's scribbles
 */
function isValidDrawing(gesture) {
    if (gesture.length === 0)
        return false;
    // Check if bounding box area is too small
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of gesture) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }
    const width = maxX - minX;
    const height = maxY - minY;
    const area = width * height;
    // Threshold for bounding box area (0.005 of unit square)
    if (area < 0.005)
        return false;
    // Check if path length is too short
    const length = pathLength(gesture);
    // Threshold for path length (empirically determined)
    if (length < 0.05)
        return false;
    return true;
}
/**
 * Calculate a similarity score between two gestures considering both points and lines
 * Returns a score between 0 and 100
 */
function calculateGestureSimilarity(userGesture, referenceGesture) {
    // Handle edge cases
    if (userGesture.length === 0 || referenceGesture.length === 0)
        return 0;
    // Normalize both gestures
    const normalizedUser = normalizeGesture(userGesture);
    const normalizedReference = normalizeGesture(referenceGesture);
    // Calculate point-based similarity
    let pointSimilarity = 0;
    const minPoints = Math.min(normalizedUser.length, normalizedReference.length);
    for (let i = 0; i < minPoints; i++) {
        const distance = euclideanDistance(normalizedUser[i], normalizedReference[i]);
        // Convert distance to similarity (0-1), with 1.0 as threshold for maximum penalty
        // Using a gentler curve that still gives some score for imperfect drawings
        const similarity = Math.max(0, 1 - distance / 1.0);
        pointSimilarity += similarity;
    }
    pointSimilarity = pointSimilarity / minPoints * 100;
    // Calculate line-based similarity
    let lineSimilarity = 0;
    const lineSegments = Math.max(1, normalizedReference.length - 1);
    for (let i = 0; i < normalizedUser.length; i++) {
        // Find the closest line segment in the reference gesture
        let minDistance = Infinity;
        for (let j = 0; j < normalizedReference.length - 1; j++) {
            const distance = pointToLineDistance(normalizedUser[i], normalizedReference[j], normalizedReference[j + 1]);
            minDistance = Math.min(minDistance, distance);
        }
        // Convert distance to similarity (0-1), with 0.6 as threshold for maximum penalty
        // Using a gentler curve that still gives some score for imperfect drawings
        const similarity = Math.max(0, 1 - minDistance / 0.6);
        lineSimilarity += similarity;
    }
    lineSimilarity = lineSimilarity / normalizedUser.length * 100;
    // Combine point and line similarity (60% point, 40% line)
    const combinedSimilarity = pointSimilarity * 0.6 + lineSimilarity * 0.4;
    return Math.max(0, Math.min(100, combinedSimilarity));
}
/**
 * Evaluate drawing similarity with percentage accuracy
 * Returns object with score (0-100) and validity flag
 */
function evaluateDrawing(userPoints, referencePoints) {
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
