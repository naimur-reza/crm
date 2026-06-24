import sharp from "sharp";
import { join } from "path";
import { cwd } from "process";

const root = cwd();
const inputFile = join(root, "assets", "logo.png");
const outputDir = join(root, "public");

const sizes = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "apple-icon-180x180.png", size: 180 },
];

async function main() {
  for (const { name, size } of sizes) {
    await sharp(inputFile)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(join(outputDir, name));
    console.log(`Generated ${name} (${size}x${size})`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
