import fs from "node:fs";

fs.watch(
  "./src",
  {
    recursive: true,
  },
  () => {
    console.log("rebuilding...");
    Bun.build({
      entrypoints: ["./src/index.html"],
      outdir: "./dist",
      env: "BUN_PUBLIC_*",
    });
  }
);
