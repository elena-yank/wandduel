import { evaluateDrawing, normalizeGesture } from "./shared/gesture-recognition";
import { type Point } from "./shared/schema";

// Test with canvas coordinates to see what might be happening
function testCanvasCoordinates() {
  console.log("Testing with canvas coordinates...");
  
  // Simulate actual canvas drawing - these would be pixel coordinates from a 400x400 canvas
  const canvasGesture: Point[] = [
    { x: 100, y: 100 },
    { x: 150, y: 150 },
    { x: 200, y: 100 },
    { x: 250, y: 150 },
    { x: 300, y: 100 }
  ];
  
  console.log("Canvas gesture (400x400 pixel coordinates):", canvasGesture);
  
  // Test against a spell pattern (using actual spell data)
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
  
  console.log("\n--- Test 1: Canvas gesture vs spell pattern ---");
  const result1 = evaluateDrawing(canvasGesture, spellPattern);
  console.log("Result:", result1);
  
  // Test what happens when we normalize both
  console.log("\n--- Test 2: Normalized canvas gesture vs normalized spell pattern ---");
  const normalizedCanvas = normalizeGesture(canvasGesture);
  const normalizedSpell = normalizeGesture(spellPattern);
  
  console.log("Normalized canvas gesture:", normalizedCanvas);
  console.log("Normalized spell pattern:", normalizedSpell.slice(0, 3), "..."); // Just show first 3 points
  
  const result2 = evaluateDrawing(normalizedCanvas, normalizedSpell);
  console.log("Result:", result2);
  
  // Test with a matching pattern
  console.log("\n--- Test 3: Perfect match ---");
  const matchingGesture: Point[] = [...spellPattern]; // Exact copy
  const result3 = evaluateDrawing(matchingGesture, spellPattern);
  console.log("Result:", result3);
  
  // Test with a slightly different pattern
  console.log("\n--- Test 4: Slightly modified pattern ---");
  const modifiedGesture: Point[] = spellPattern.map(point => ({
    x: point.x + Math.random() * 10 - 5, // Add some noise
    y: point.y + Math.random() * 10 - 5
  }));
  const result4 = evaluateDrawing(modifiedGesture, spellPattern);
  console.log("Result:", result4);
}

testCanvasCoordinates();