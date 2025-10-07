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

  // Create counter spell: финИте инкантАтем (shield pattern - from user's vector image)
  const finiteIncantatem: InsertSpell = {
    name: "финИте инкантАтем",
    type: "counter",
    color: "#DC143C",
    colorName: "Красный",
    description: "Щит",
    gesturePattern: [
      { x: 75, y: 75 },    // Top left start
      { x: 155, y: 95 },   // First wave down
      { x: 235, y: 75 },   // First wave up
      { x: 315, y: 95 },   // Second wave down
      { x: 320, y: 100 },  // Top right corner
      { x: 320, y: 190 },  // Right side middle
      { x: 305, y: 270 },  // Right side bottom
      { x: 270, y: 315 },  // Bottom right curve
      { x: 200, y: 335 },  // Bottom center point
      { x: 130, y: 315 },  // Bottom left curve
      { x: 95, y: 270 },   // Left side bottom
      { x: 75, y: 120 },   // Left side top
      { x: 75, y: 75 }     // Close to start
    ],
    counters: [baubelliusSpell.id],
  };

  const finiteSpell = await storage.createSpell(finiteIncantatem);
  console.log("Created spell:", finiteSpell.name);

  console.log("Spells initialized successfully!");
}
