import { storage } from "./storage";
import { type InsertSpell } from "@shared/schema";

export async function initializeSpells() {
  // Create first attack spell: алАрте аскЕндаре
  const alarte: InsertSpell = {
    name: "алАрте аскЕндаре",
    type: "attack",
    color: "#FFD700",
    colorName: "Золотой",
    description: "Направить на оппонента",
    gesturePattern: [{ x: 200, y: 200 }], // Center of 400x400 canvas
  };

  const alarteSpell = await storage.createSpell(alarte);
  console.log("Created spell:", alarteSpell.name);

  // Create second attack spell: баубИллиус
  const baubellius: InsertSpell = {
    name: "баубИллиус",
    type: "attack",
    color: "#FFFACD",
    colorName: "Бело-жёлтый",
    description: "Направить на оппонента",
    gesturePattern: [{ x: 200, y: 200 }], // Same as алАрте аскЕндаре - point at opponent
  };

  const baubelliusSpell = await storage.createSpell(baubellius);
  console.log("Created spell:", baubelliusSpell.name);

  // Create counter spell: протЕго
  const protego: InsertSpell = {
    name: "протЕго",
    type: "counter",
    color: "#E5E5E5",
    colorName: "Бесцветный",
    description: "Направить на объект",
    gesturePattern: [{ x: 200, y: 200 }], // Center of 400x400 canvas
    counters: [alarteSpell.id],
  };

  const protegoSpell = await storage.createSpell(protego);
  console.log("Created spell:", protegoSpell.name);

  // Create counter spell: финИте инкантАтем (shield pattern from user's image)
  const finiteIncantatem: InsertSpell = {
    name: "финИте инкантАтем",
    type: "counter",
    color: "#DC143C",
    colorName: "Красный",
    description: "Щит",
    gesturePattern: [
      // Wavy top line - left to right
      { x: 80, y: 90 },    // Start left
      { x: 130, y: 110 },  // First dip
      { x: 180, y: 90 },   // First peak
      { x: 230, y: 110 },  // Second dip
      { x: 280, y: 90 },   // End right
      // Right side straight down
      { x: 280, y: 140 },
      { x: 280, y: 190 },
      { x: 280, y: 240 },
      // Bottom curve - right to left
      { x: 260, y: 290 },
      { x: 230, y: 320 },
      { x: 200, y: 335 },  // Bottom center
      { x: 170, y: 320 },
      { x: 140, y: 290 },
      // Left side straight up
      { x: 80, y: 240 },
      { x: 80, y: 190 },
      { x: 80, y: 140 },
      { x: 80, y: 90 }     // Back to start
    ],
    counters: [baubelliusSpell.id],
  };

  const finiteSpell = await storage.createSpell(finiteIncantatem);
  console.log("Created spell:", finiteSpell.name);

  console.log("Spells initialized successfully!");
}
