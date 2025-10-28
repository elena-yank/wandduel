import { normalizeGesture, calculateDTWDistance } from "./shared/gesture-recognition";
import { type Point } from "./shared/schema";

// Test different scale factors to find the optimal one
function testScaleFactors() {
  console.log("Testing different scale factors to find optimal value...");
  
  // Test gestures representing different levels of similarity
  const template: Point[] = [
    { x: 0, y: 0 },
    { x: 25, y: 25 },
    { x: 50, y: 50 },
    { x: 75, y: 75 },
    { x: 100, y: 100 }
  ];
  
  // Perfect match
  const perfectMatch: Point[] = [
    { x: 0, y: 0 },
    { x: 25, y: 25 },
    { x: 50, y: 50 },
    { x: 75, y: 75 },
    { x: 100, y: 100 }
  ];
  
  // Slightly different - small variations
  const slightlyDifferent: Point[] = [
    { x: 2, y: 1 },
    { x: 27, y: 23 },
    { x: 52, y: 48 },
    { x: 77, y: 72 },
    { x: 102, y: 98 }
  ];
  
  // Moderately different - noticeable but similar pattern
  const moderatelyDifferent: Point[] = [
    { x: 0, y: 5 },
    { x: 30, y: 35 },
    { x: 60, y: 55 },
    { x: 80, y: 85 },
    { x: 100, y: 95 }
  ];
  
  // Very different - different pattern entirely
  const veryDifferent: Point[] = [
    { x: 0, y: 100 },
    { x: 50, y: 0 },
    { x: 100, y: 100 }
  ];
  
  const testCases = [
    { name: "Perfect match", gesture: perfectMatch, expected: "~100%" },
    { name: "Slightly different", gesture: slightlyDifferent, expected: "~85-95%" },
    { name: "Moderately different", gesture: moderatelyDifferent, expected: "~50-70%" },
    { name: "Very different", gesture: veryDifferent, expected: "~0-20%" }
  ];
  
  // Test a range of scale factors
  const scaleFactors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30];
  
  // Normalize template once
  const normalizedTemplate = normalizeGesture(template);
  
  console.log("Scale Factor | Perfect | Slight | Moderate | Very Different");
  console.log("-------------|---------|--------|----------|---------------");
  
  scaleFactors.forEach(scaleFactor => {
    const scores = testCases.map(testCase => {
      const normalizedGesture = normalizeGesture(testCase.gesture);
      const dtwDistance = calculateDTWDistance(normalizedTemplate, normalizedGesture);
      const score = Math.max(0, 100 - dtwDistance * scaleFactor);
      return Math.round(score);
    });
    
    console.log(
      `${scaleFactor.toString().padStart(11)} | ${scores[0].toString().padStart(7)} | ${scores[1].toString().padStart(6)} | ${scores[2].toString().padStart(8)} | ${scores[3].toString().padStart(13)}`
    );
  });
}

testScaleFactors();