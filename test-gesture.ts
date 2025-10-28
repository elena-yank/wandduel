import { evaluateDrawing, isValidDrawing, normalizeGesture, calculateDTWDistance } from "./shared/gesture-recognition";
import { type Point } from "./shared/schema";

// Test the issue with gesture recognition
function testGestureIssue() {
  console.log("Testing gesture recognition issue...");
  
  // Create a simple test gesture - a straight line
  const userGesture: Point[] = [
    { x: 0, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 100 }
  ];
  
  // Create a matching reference gesture
  const referenceGesture: Point[] = [
    { x: 0, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 100 }
  ];
  
  console.log("User gesture:", userGesture);
  console.log("Reference gesture:", referenceGesture);
  
  // Test the evaluation
  const result = evaluateDrawing(userGesture, referenceGesture);
  console.log("Result:", result);
  
  // Let's also test the individual functions
  console.log("\n--- Individual function tests ---");
  
  // Test validity
  const valid = isValidDrawing(userGesture);
  console.log("Is valid drawing:", valid);
  
  // Test normalization
  const normalizedUser = normalizeGesture(userGesture);
  const normalizedReference = normalizeGesture(referenceGesture);
  console.log("Normalized user:", normalizedUser);
  console.log("Normalized reference:", normalizedReference);
  
  // Test DTW distance
  const dtwDistance = calculateDTWDistance(normalizedUser, normalizedReference);
  console.log("DTW distance:", dtwDistance);
}

testGestureIssue();