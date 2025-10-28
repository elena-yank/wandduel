import { evaluateDrawing, normalizeGesture, calculateDTWDistance, euclideanDistance } from "./shared/gesture-recognition";
import { type Point } from "./shared/schema";

// Deep dive into the normalization issue
function testNormalizationIssue() {
  console.log("Deep dive into normalization issue...");
  
  // Canvas gesture (pixel coordinates)
  const canvasGesture: Point[] = [
    { x: 100, y: 100 },
    { x: 150, y: 150 },
    { x: 200, y: 100 },
    { x: 250, y: 150 },
    { x: 300, y: 100 }
  ];
  
  // Spell pattern (from database)
  const spellPattern: Point[] = [
    { x: 178.57, y: 357.14 },
    { x: 174.86, y: 321.65 },
    { x: 170.09, y: 289.33 },
    { x: 164.79, y: 259.64 },
    { x: 152.60, y: 215.15 },
    { x: 145.18, y: 164.29 },
    { x: 149.42, y: 119.27 },
    { x: 164.77, y: 87.51 },
    { x: 190.20, y: 71.08 },
    { x: 233.94, y: 69.53 },
    { x: 256.70, y: 86.90 },
    { x: 264.12, y: 111.88 },
    { x: 264.65, y: 139.45 },
    { x: 255.12, y: 163.22 },
    { x: 224.67, y: 163.22 }
  ];
  
  console.log("Canvas gesture points:", canvasGesture.length);
  console.log("Spell pattern points:", spellPattern.length);
  
  // Normalize both gestures
  const normalizedCanvas = normalizeGesture(canvasGesture);
  const normalizedSpell = normalizeGesture(spellPattern);
  
  console.log("\nNormalized canvas gesture:");
  console.log("First 3 points:", normalizedCanvas.slice(0, 3));
  console.log("Last 3 points:", normalizedCanvas.slice(-3));
  
  console.log("\nNormalized spell pattern:");
  console.log("First 3 points:", normalizedSpell.slice(0, 3));
  console.log("Last 3 points:", normalizedSpell.slice(-3));
  
  // Check if they have the same number of points (they should after normalization)
  console.log("\nPoint counts after normalization:");
  console.log("Canvas:", normalizedCanvas.length);
  console.log("Spell:", normalizedSpell.length);
  
  // Calculate DTW distance manually to see what's happening
  console.log("\n--- Manual DTW calculation ---");
  const dtwDistance = calculateDTWDistance(normalizedCanvas, normalizedSpell);
  console.log("DTW distance:", dtwDistance);
  
  // Check a few euclidean distances
  console.log("\nSample euclidean distances:");
  for (let i = 0; i < Math.min(5, normalizedCanvas.length, normalizedSpell.length); i++) {
    const dist = euclideanDistance(normalizedCanvas[i], normalizedSpell[i]);
    console.log(`Point ${i}: ${dist.toFixed(4)}`);
  }
  
  // Check the score calculation
  console.log("\n--- Score calculation ---");
  const scaleFactor = 70; // From the evaluateDrawing function
  const score = Math.max(0, 100 - dtwDistance * scaleFactor);
  console.log("Scale factor:", scaleFactor);
  console.log("Raw score:", 100 - dtwDistance * scaleFactor);
  console.log("Final score:", Math.round(score));
  
  // Let's also test what happens with evaluateDrawing
  console.log("\n--- Using evaluateDrawing function ---");
  const result = evaluateDrawing(canvasGesture, spellPattern);
  console.log("Result:", result);
  
  // Let's test with a more similar pattern
  console.log("\n--- Testing with a more similar pattern ---");
  const similarPattern: Point[] = [
    { x: 100, y: 100 },
    { x: 120, y: 120 },
    { x: 140, y: 140 },
    { x: 160, y: 120 },
    { x: 180, y: 100 },
    { x: 200, y: 80 },
    { x: 220, y: 100 },
    { x: 240, y: 120 },
    { x: 260, y: 140 },
    { x: 280, y: 120 },
    { x: 300, y: 100 }
  ];
  
  const similarResult = evaluateDrawing(similarPattern, spellPattern);
  console.log("Similar pattern result:", similarResult);
  
  // Normalize and compare the similar pattern
  const normalizedSimilar = normalizeGesture(similarPattern);
  console.log("\nNormalized similar pattern first 3 points:", normalizedSimilar.slice(0, 3));
  console.log("Normalized similar pattern last 3 points:", normalizedSimilar.slice(-3));
  
  const dtwDistanceSimilar = calculateDTWDistance(normalizedSimilar, normalizedSpell);
  console.log("DTW distance (similar vs spell):", dtwDistanceSimilar);
  
  const scoreSimilar = Math.max(0, 100 - dtwDistanceSimilar * scaleFactor);
  console.log("Score (similar vs spell):", Math.round(scoreSimilar));
}

testNormalizationIssue();