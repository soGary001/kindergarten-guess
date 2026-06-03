import type { Animal } from "./types";

export const ANIMALS: Animal[] = [
  { id: "monkey",   name: "Monkey",   emoji: "🐵", hints: ["It likes banana.", "It has a long tail."] },
  { id: "kangaroo", name: "Kangaroo", emoji: "🦘", hints: ["It has a pouch.", "It hops."] },
  { id: "elephant", name: "Elephant", emoji: "🐘", hints: ["It's big.", "It has a trunk."] },
  { id: "turtle",   name: "Turtle",   emoji: "🐢", hints: ["It crawls.", "It has a shell."] },
  { id: "tiger",    name: "Tiger",    emoji: "🐯", hints: ["It eats meat.", "It has stripes on its body."] },
  { id: "crab",     name: "Crab",     emoji: "🦀", hints: ["It has claws.", "It lives in the sea."] },
  { id: "bird",     name: "Bird",     emoji: "🐦", hints: ["It has a beak.", "It likes to eat seeds."] },
  { id: "snake",    name: "Snake",    emoji: "🐍", hints: ["It slithers.", "It lives in the hole."] },
  { id: "spider",   name: "Spider",   emoji: "🕷️", hints: ["It has 8 legs.", "It makes a web."] },
];

export function animalByName(name: string): Animal | undefined {
  const n = name.trim().toLowerCase();
  return ANIMALS.find((a) => a.name.toLowerCase() === n);
}
