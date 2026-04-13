/**
 * Cross-platform asset copy script.
 *
 * Copies the resources/ directory to dist/resources/.
 * All bundled assets (docs, themes, permissions, tool-icons) now live in resources/
 * which electron-builder handles natively via directories.buildResources.
 *
 * At Electron startup, setBundledAssetsRoot(__dirname) is called, and then
 * getBundledAssetsDir('docs') resolves to <__dirname>/resources/docs/, etc.
 *
 * Run: bun scripts/copy-assets.ts
 */

import { cpSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Copy all resources (icons, themes, docs, permissions, tool-icons, etc.)
cpSync('resources', 'dist/resources', { recursive: true });

console.log('✓ Copied resources/ → dist/resources/');

// Ensure subprocess server bundles in dist/resources are always the freshly built
// artifacts from packages/*/dist, not stale copies from apps/electron/resources.
const subprocessArtifacts = [
  {
    name: 'session-mcp-server',
    source: join('..', '..', 'packages', 'session-mcp-server', 'dist', 'index.js'),
  },
  {
    name: 'pi-agent-server',
    source: join('..', '..', 'packages', 'pi-agent-server', 'dist', 'index.js'),
  },
] as const;

for (const artifact of subprocessArtifacts) {
  if (!existsSync(artifact.source)) {
    console.log(`⚠ ${artifact.name} artifact missing at ${artifact.source}; keeping existing bundled copy`);
    continue;
  }
  const targetDir = join('dist', 'resources', artifact.name);
  const targetFile = join(targetDir, 'index.js');
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(artifact.source, targetFile);
  console.log(`✓ Synced ${artifact.name} from packages/*/dist → dist/resources/${artifact.name}/index.js`);
}

// Copy PowerShell parser script (for Windows command validation in Explore mode)
// Source: packages/shared/src/agent/powershell-parser.ps1
// Destination: dist/resources/powershell-parser.ps1
const psParserSrc = join('..', '..', 'packages', 'shared', 'src', 'agent', 'powershell-parser.ps1');
const psParserDest = join('dist', 'resources', 'powershell-parser.ps1');
try {
  copyFileSync(psParserSrc, psParserDest);
  console.log('✓ Copied powershell-parser.ps1 → dist/resources/');
} catch (err) {
  // Only warn - PowerShell validation is optional on non-Windows platforms
  console.log('⚠ powershell-parser.ps1 copy skipped (not critical on non-Windows)');
}
