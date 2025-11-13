import { evaluateDrawing, isValidDrawing, calculateBoundingBox, pathLength, normalizeGesture } from "./shared/gesture-recognition";
import { type Point } from "./shared/schema";

// Test the thresholds that might be causing the 0% issue
function testThresholds() {
  console.log("Testing thresholds that might cause 0% recognition...");
  
  // Test 1: Very small gesture (might fail validity check)
  const smallGesture: Point[] = [
    { x: 100, y: 100 },
    { x: 105, y: 105 },
    { x: 110, y: 110 }
  ];
  
  console.log("\n--- Test 1: Small gesture ---");
  console.log("Gesture:", smallGesture);
  
  // Check validity
  const valid = isValidDrawing(smallGesture);
  console.log("Is valid:", valid);
  
  if (!valid) {
    // Check why it's invalid
    const bbox = calculateBoundingBox(smallGesture);
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;
    const area = width * height;
    const length = pathLength(smallGesture);
    
    console.log("Bounding box:", bbox);
    console.log("Width:", width);
    console.log("Height:", height);
    console.log("Area:", area);
    console.log("Path length:", length);
    console.log("Area threshold (0.01):", area < 0.01);
    console.log("Length threshold (0.1):", length < 0.1);
  }
  
  // Test 2: Normal sized gesture
  const normalGesture: Point[] = [
    { x: 50, y: 50 },
    { x: 100, y: 100 },
    { x: 150, y: 150 },
    { x: 200, y: 100 },
    { x: 250, y: 50 }
  ];
  
  console.log("\n--- Test 2: Normal gesture ---");
  console.log("Gesture:", normalGesture);
  
  // Check validity
  const normalValid = isValidDrawing(normalGesture);
  console.log("Is valid:", normalValid);
  
  if (!normalValid) {
    // Check why it's invalid
    const bbox = calculateBoundingBox(normalGesture);
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;
    const area = width * height;
    const length = pathLength(normalGesture);
    
    console.log("Bounding box:", bbox);
    console.log("Width:", width);
    console.log("Height:", height);
    console.log("Area:", area);
    console.log("Path length:", length);
    console.log("Area threshold (0.01):", area < 0.01);
    console.log("Length threshold (0.1):", length < 0.1);
  }
  
  // Test 3: Test with a real spell pattern
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
  
  console.log("\n--- Test 3: Real spell pattern ---");
  console.log("Gesture points:", spellPattern.length);
  
  // Check validity
  const spellValid = isValidDrawing(spellPattern);
  console.log("Is valid:", spellValid);
  
  if (!spellValid) {
    // Check why it's invalid
    const bbox = calculateBoundingBox(spellPattern);
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;
    const area = width * height;
    const length = pathLength(spellPattern);
    
    console.log("Bounding box:", bbox);
    console.log("Width:", width);
    console.log("Height:", height);
    console.log("Area:", area);
    console.log("Path length:", length);
    console.log("Area threshold (0.01):", area < 0.01);
    console.log("Length threshold (0.1):", length < 0.1);
  }
  
  // Test 4: What happens when we normalize the spell pattern?
  console.log("\n--- Test 4: Normalized spell pattern ---");
  const normalizedSpell = normalizeGesture(spellPattern);
  console.log("Normalized points:", normalizedSpell.length);
  console.log("Sample normalized points:", normalizedSpell.slice(0, 3));
  
  const normalizedValid = isValidDrawing(normalizedSpell);
  console.log("Normalized is valid:", normalizedValid);
  
  if (!normalizedValid) {
    // Check why it's invalid
    const bbox = calculateBoundingBox(normalizedSpell);
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;
    const area = width * height;
    const length = pathLength(normalizedSpell);
    
    console.log("Normalized bounding box:", bbox);
    console.log("Normalized width:", width);
    console.log("Normalized height:", height);
    console.log("Normalized area:", area);
    console.log("Normalized path length:", length);
    console.log("Area threshold (0.01):", area < 0.01);
    console.log("Length threshold (0.1):", length < 0.1);
  }
}

testThresholds();