import { evaluateDrawing } from "./shared/gesture-recognition";
import { type Point } from "./shared/schema";

// Test with real spell gestures to see what's happening
function testRealGestures() {
  console.log("Testing with real spell gestures...");
  
  // Example of a real spell gesture from the database (алАрте аскЕндаре)
  const alarteGesture: Point[] = [
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
  
  // Create a slightly different version (simulating user drawing)
  const userGesture: Point[] = [
    { x: 180, y: 360 },
    { x: 175, y: 320 },
    { x: 170, y: 290 },
    { x: 165, y: 260 },
    { x: 150, y: 215 },
    { x: 145, y: 165 },
    { x: 150, y: 120 },
    { x: 165, y: 85 },
    { x: 190, y: 70 },
    { x: 235, y: 70 },
    { x: 255, y: 85 },
    { x: 265, y: 110 },
    { x: 265, y: 140 },
    { x: 255, y: 165 },
    { x: 225, y: 165 }
  ];
  
  console.log("Alarte gesture:", alarteGesture);
  console.log("User gesture:", userGesture);
  
  // Test the evaluation
  const result = evaluateDrawing(userGesture, alarteGesture);
  console.log("Result:", result);
  
  // Test with a completely different gesture
  const differentGesture: Point[] = [
    { x: 50, y: 50 },
    { x: 100, y: 100 },
    { x: 150, y: 50 },
    { x: 200, y: 100 }
  ];
  
  console.log("\n--- Testing with completely different gesture ---");
  console.log("Different gesture:", differentGesture);
  const differentResult = evaluateDrawing(differentGesture, alarteGesture);
  console.log("Different result:", differentResult);
  
  // Test with a very small gesture (might be invalid)
  const smallGesture: Point[] = [
    { x: 100, y: 100 },
    { x: 101, y: 101 },
    { x: 102, y: 102 }
  ];
  
  console.log("\n--- Testing with small gesture ---");
  console.log("Small gesture:", smallGesture);
  const smallResult = evaluateDrawing(smallGesture, alarteGesture);
  console.log("Small result:", smallResult);
  
  // Test with a scribble (very small area)
  const scribbleGesture: Point[] = [
    { x: 100, y: 100 },
    { x: 100.1, y: 100.1 },
    { x: 100.2, y: 100.2 }
  ];
  
  console.log("\n--- Testing with scribble ---");
  console.log("Scribble gesture:", scribbleGesture);
  const scribbleResult = evaluateDrawing(scribbleGesture, alarteGesture);
  console.log("Scribble result:", scribbleResult);
}

testRealGestures();