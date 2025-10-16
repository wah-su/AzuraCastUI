import fs from "node:fs";

fs.watch("./src", () => {
    console.log("rebuilding...");
    Bun.build({
        entrypoints: ["./src/index.html"],
        outdir: "./dist",
        env: "BUN_PUBLIC_*",
    });
});