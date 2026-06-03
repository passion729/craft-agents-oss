/**
 * Cross-platform resources copy script
 */

import { existsSync, cpSync, copyFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  type Arch,
  type BuildConfig,
  type Platform,
  copyRipgrep,
  copySDK,
  verifySDKCopy,
} from "./build/common";

const ROOT_DIR = join(import.meta.dir, "..");
const ELECTRON_DIR = join(ROOT_DIR, "apps/electron");

const srcDir = join(ELECTRON_DIR, "resources");
const destDir = join(ELECTRON_DIR, "dist/resources");

function currentPlatform(): Platform {
  if (process.platform === "darwin" || process.platform === "win32" || process.platform === "linux") {
    return process.platform;
  }
  throw new Error(`Unsupported Electron packaging platform: ${process.platform}`);
}

function currentArch(): Arch {
  if (process.arch === "arm64" || process.arch === "x64") {
    return process.arch;
  }
  throw new Error(`Unsupported Electron packaging arch: ${process.arch}`);
}

function stageExternalRuntimeDependencies(): void {
  const config: BuildConfig = {
    platform: currentPlatform(),
    arch: currentArch(),
    upload: false,
    uploadLatest: false,
    uploadScript: false,
    rootDir: ROOT_DIR,
    electronDir: ELECTRON_DIR,
  };

  // main.cjs externalizes @anthropic-ai/claude-agent-sdk so Node can load the
  // SDK's ESM entry with a real import.meta.url. electron-builder copies these
  // staged node_modules entries via extraResources.
  copySDK(config);
  verifySDKCopy(config);
  copyRipgrep(config);
}

if (existsSync(srcDir)) {
  cpSync(srcDir, destDir, { recursive: true, force: true });
  console.log("📦 Copied resources to dist");
} else {
  console.log("⚠️ No resources directory found");
}

// Ensure subprocess servers are available in packaged builds.
// runtime-resolver checks dist/resources/<server>/index.js under app root.
const subprocessArtifacts = [
  {
    name: "session-mcp-server",
    source: join(ROOT_DIR, "packages/session-mcp-server/dist/index.js"),
  },
  {
    name: "pi-agent-server",
    source: join(ROOT_DIR, "packages/pi-agent-server/dist/index.js"),
  },
] as const;

for (const artifact of subprocessArtifacts) {
  if (!existsSync(artifact.source)) {
    throw new Error(
      `Missing ${artifact.name} artifact at ${artifact.source}. Run 'bun run electron:build:main' first.`,
    );
  }

  const targetDir = join(destDir, artifact.name);
  const targetFile = join(targetDir, "index.js");
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(artifact.source, targetFile);
  console.log(`📦 Bundled ${artifact.name} → dist/resources/${artifact.name}/index.js`);
}

stageExternalRuntimeDependencies();
