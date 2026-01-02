import { file, write } from "bun";
import { parseArgs } from "util";
import { join } from "path";

// Parse arguments
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    type: {
      type: "string",
      default: "patch", // 'patch', 'minor', 'major'
    },
  },
  strict: true,
  allowPositionals: true,
});

const packagePath = join(import.meta.dir, "../package.json");
const versionFilePath = join(import.meta.dir, "../VERSION");

async function run() {
  // 1. Read package.json
  const pkgFile = file(packagePath);
  const pkg = await pkgFile.json();
  const currentVersion = pkg.version;

  // 2. Bump Logic
  const parts = currentVersion.split(".").map(Number);
  const type = values.type;

  if (type === "major") {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === "minor") {
    parts[1]++;
    parts[2] = 0;
  } else {
    parts[2]++;
  }

  const newVersion = parts.join(".");
  console.log(`Bumping ${currentVersion} -> ${newVersion}`);

  // 3. Update package.json object
  pkg.version = newVersion;

  // 4. Write package.json
  await write(packagePath, JSON.stringify(pkg, null, 2) + "\n");

  // 5. Write VERSION file
  await write(versionFilePath, newVersion);
}

run();
