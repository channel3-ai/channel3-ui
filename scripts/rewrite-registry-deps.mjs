// Rewrites `@channel3/<name>` registryDependencies in the built registry output
// to absolute URLs, so installs from a raw URL (e.g. `.../r/all.json`) resolve
// without the consumer first declaring the `@channel3` namespace in their
// components.json. Only `registryDependencies` entries are touched — npm
// `dependencies` (like `@channel3/sdk`) and file content are left intact.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "r");
const BASE_URL = process.env.REGISTRY_BASE_URL ?? "https://ui.trychannel3.com/r";
const NAMESPACE = "@channel3/";

function rewriteDep(dep) {
  if (typeof dep !== "string" || !dep.startsWith(NAMESPACE)) {
    return dep;
  }
  const name = dep.slice(NAMESPACE.length);
  return `${BASE_URL}/${name}.json`;
}

async function main() {
  const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".json"));
  let rewrittenFiles = 0;
  let rewrittenDeps = 0;

  for (const file of files) {
    const path = join(OUT_DIR, file);
    const raw = await readFile(path, "utf8");
    const json = JSON.parse(raw);

    const items = Array.isArray(json.items) ? json.items : [json];
    let changed = false;

    for (const item of items) {
      if (!Array.isArray(item.registryDependencies)) {
        continue;
      }
      const next = item.registryDependencies.map(rewriteDep);
      const delta = next.filter((d, i) => d !== item.registryDependencies[i]).length;
      if (delta > 0) {
        item.registryDependencies = next;
        rewrittenDeps += delta;
        changed = true;
      }
    }

    if (changed) {
      await writeFile(path, `${JSON.stringify(json, null, 2)}\n`);
      rewrittenFiles += 1;
    }
  }

  console.log(
    `rewrite-registry-deps: rewrote ${rewrittenDeps} dependency reference(s) across ${rewrittenFiles} file(s)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
