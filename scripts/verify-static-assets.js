import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const stage = process.argv[2] ?? "prebuild";
const requiredUrls = [
  "https://criandomusicas.com.br/",
  "https://criandomusicas.com.br/planos",
  "https://criandomusicas.com.br/privacidade",
  "https://criandomusicas.com.br/termos",
  "https://criandomusicas.com.br/regras",
  "https://criandomusicas.com.br/install",
];

const readRequiredFile = (path) => {
  const filePath = resolve(path);

  if (!existsSync(filePath)) {
    throw new Error(`${path} is missing`);
  }

  return readFileSync(filePath, "utf8");
};

const assertSitemap = (path) => {
  const sitemap = readRequiredFile(path);

  if (!sitemap.trimStart().startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    throw new Error(`${path} must start with a valid XML declaration`);
  }

  if (!sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
    throw new Error(`${path} must contain a sitemap urlset`);
  }

  for (const url of requiredUrls) {
    if (!sitemap.includes(`<loc>${url}</loc>`)) {
      throw new Error(`${path} is missing ${url}`);
    }
  }
};

const assertRobots = (path) => {
  const robots = readRequiredFile(path);

  if (!robots.includes("Sitemap: https://criandomusicas.com.br/sitemap.xml")) {
    throw new Error(`${path} must reference https://criandomusicas.com.br/sitemap.xml`);
  }
};

const assertPwaIcons = (root) => {
  for (const size of [192, 512]) {
    const path = resolve(root, `icons/icon-${size}x${size}.png`);
    const png = readFileSync(path);
    const signature = "89504e470d0a1a0a";
    if (png.length < 24 || png.subarray(0, 8).toString("hex") !== signature ||
        png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) {
      throw new Error(`${path} must be a real ${size}x${size} PNG for PWA installation`);
    }
  }
};

assertPwaIcons("public");
assertSitemap("public/sitemap.xml");
assertRobots("public/robots.txt");

if (stage === "postbuild") {
  assertPwaIcons("dist");
  assertSitemap("dist/sitemap.xml");
  assertRobots("dist/robots.txt");
}

console.log(`Static SEO and PWA assets verified for ${stage}`);