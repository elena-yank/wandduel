import { normalizeGesture, calculateDTWDistance } from "./shared/gesture-recognition";
import { type Point } from "./shared/schema";

// Test the original cases from the test file with different scale factors
function testOriginalCases() {
  console.log("Testing original cases with different scale factors...");
  
  // Test 1: Perfect match - a simple line gesture
  const template1: Point[] = [
    { x: 0, y: 0 },
    { x: 25, y: 25 },
    { x: 50, y: 50 },
    { x: 75, y: 75 },
    { x: 100, y: 100 }
  ];
  
  const user1: Point[] = [
    { x: 0, y: 0 },
    { x: 25, y: 25 },
    { x: 50, y: 50 },
    { x: 75, y: 75 },
    { x: 100, y: 100 }
  ];
  
  // Test 2: Slightly different gesture - same pattern but with small variations
  const user2: Point[] = [
    { x: 2, y: 1 },
    { x: 27, y: 23 },
    { x: 52, y: 48 },
    { x: 77, y: 72 },
    { x: 102, y: 98 }
  ];
  
  // Test 3: Completely different gesture - a V shape instead of a line
  const user3: Point[] = [
    { x: 0, y: 0 },
    { x: 50, y: 100 },
    { x: 100, y: 0 }
  ];
  
  const testCases = [
    { name: "Perfect match", template: template1, user: user1, expected: "~100%" },
    { name: "Slightly different", template: template1, user: user2, expected: "~70-95%" },
    { name: "Completely different", template: template1, user: user3, expected: "~0-30%" }
  ];
  
  // Test different scale factors
  const scaleFactors = [1, 3, 5, 10, 20, 30, 50, 70];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- ${testCase.name} (expected: ${testCase.expected}) ---`);
    
    // Normalize both gestures
    const normalizedTemplate = normalizeGesture(testCase.template);
    const normalizedUser = normalizeGesture(testCase.user);
    
    // Calculate DTW distance
    const dtwDistance = calculateDTWDistance(normalizedTemplate, normalizedUser);
    console.log(`DTW distance: ${dtwDistance.toFixed(4)}`);
    
    // Test with different scale factors
    scaleFactors.forEach(scaleFactor => {
      const score = Math.max(0, 100 - dtwDistance * scaleFactor);
      console.log(`Scale factor ${scaleFactor}: Score = ${Math.round(score)}%`);
    });
  });
  
  // Let's also check what the current implementation gives
  console.log("\n--- Current implementation (scale factor 70) ---");
  testCases.forEach(testCase => {
    const normalizedTemplate = normalizeGesture(testCase.template);
    const normalizedUser = normalizeGesture(testCase.user);
    const dtwDistance = calculateDTWDistance(normalizedTemplate, normalizedUser);
    const score = Math.max(0, 100 - dtwDistance * 70);
    console.log(`${testCase.name}: ${Math.round(score)}% (expected: ${testCase.expected})`);
  });
}

testOriginalCases();