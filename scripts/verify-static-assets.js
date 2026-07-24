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

assertSitemap("public/sitemap.xml");
assertRobots("public/robots.txt");

if (stage === "postbuild") {
  assertSitemap("dist/sitemap.xml");
  assertRobots("dist/robots.txt");
}

console.log(`Static SEO assets verified for ${stage}`);