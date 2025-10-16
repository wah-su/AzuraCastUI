import fs from "node:fs";

if (fs.existsSync("./dist")) {
  fs.rmSync("./dist", { recursive: true });
}

Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  env: "BUN_PUBLIC_*",
});
