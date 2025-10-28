import { evaluateDrawing, normalizeGesture, isValidDrawing } from "./gesture-recognition";
import { type Point } from "./schema";

// Test function to verify the new gesture recognition system
export function testGestureRecognition() {
  console.log("Testing new gesture recognition system...");
  
  // Test 1: Perfect match
  const template1: Point[] = [
    { x: 0, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 100 }
  ];
  
  const user1: Point[] = [
    { x: 0, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 100 }
  ];
  
  const result1 = evaluateDrawing(user1, template1);
  console.log(`Test 1 - Perfect match: ${result1.score}% (valid: ${result1.valid}) (expected: ~100%)`);
  
  // Test 2: Slightly different gesture
  const user2: Point[] = [
    { x: 5, y: 5 },
    { x: 55, y: 55 },
    { x: 105, y: 105 }
  ];
  
  const result2 = evaluateDrawing(user2, template1);
  console.log(`Test 2 - Slightly different: ${result2.score}% (valid: ${result2.valid}) (expected: ~70-95%)`);
  
  // Test 3: Completely different gesture
  const user3: Point[] = [
    { x: 0, y: 100 },
    { x: 50, y: 50 },
    { x: 100, y: 0 }
  ];
  
  const result3 = evaluateDrawing(user3, template1);
  console.log(`Test 3 - Completely different: ${result3.score}% (valid: ${result3.valid}) (expected: ~0-30%)`);
  
  // Test 4: Scribbles (should be invalid)
  const scribble: Point[] = [
    { x: 10, y: 10 },
    { x: 12, y: 12 },
    { x: 11, y: 11 }
  ];
  
  const result4 = evaluateDrawing(scribble, template1);
  console.log(`Test 4 - Scribbles: ${result4.score}% (valid: ${result4.valid}) (expected: 0%, valid: false)`);
  
  // Test 5: Valid drawing with different number of points
  const user5: Point[] = [
    { x: 0, y: 0 },
    { x: 25, y: 25 },
    { x: 50, y: 50 },
    { x: 75, y: 75 },
    { x: 100, y: 100 }
  ];
  
  const result5 = evaluateDrawing(user5, template1);
  console.log(`Test 5 - Different point count: ${result5.score}% (valid: ${result5.valid}) (expected: ~70-95%)`);
  
  // Test normalization
  console.log("\nTesting normalization...");
  const normalized1 = normalizeGesture(template1);
  console.log("Normalized template1:", normalized1);
  
  // Test validity check
  console.log("\nTesting validity check...");
  console.log("Template1 valid:", isValidDrawing(template1));
  console.log("Scribble valid:", isValidDrawing(scribble));
  
  console.log("\nGesture recognition tests completed!");
}

// Run the tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testGestureRecognition();
}