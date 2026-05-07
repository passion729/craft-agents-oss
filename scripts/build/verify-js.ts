import { spawn } from "bun";
import { existsSync, statSync } from "fs";

const NODE_BINARY_CANDIDATES = [
  process.env.NODE_BINARY,
  process.env.npm_node_execpath,
  process.platform === "darwin" ? "/opt/homebrew/bin/node" : undefined,
  process.platform === "darwin" ? "/usr/local/bin/node" : undefined,
  process.platform === "win32" ? "node.exe" : "/usr/bin/node",
].filter((candidate): candidate is string => !!candidate);

/**
 * Verify a JavaScript file is syntactically valid with real Node.js.
 *
 * Bun can add a `node` compatibility shim to PATH during `bun run`. That shim
 * may execute Electron bundles during `--check`, which breaks syntax-only
 * verification for preload/main code that expects Electron globals.
 */
export async function verifyJsFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
  if (!existsSync(filePath)) {
    return { valid: false, error: "File does not exist" };
  }

  const stats = statSync(filePath);
  if (stats.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  const checked = new Set<string>();
  const errors: string[] = [];

  for (const nodeBinary of NODE_BINARY_CANDIDATES) {
    if (checked.has(nodeBinary)) {
      continue;
    }
    checked.add(nodeBinary);

    if (nodeBinary.includes("/") && !existsSync(nodeBinary)) {
      continue;
    }

    try {
      const proc = spawn({
        cmd: [nodeBinary, "--check", filePath],
        stdout: "pipe",
        stderr: "pipe",
      });
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;
      if (exitCode === 0) {
        return { valid: true };
      }
      errors.push(`${nodeBinary}: ${stderr.trim() || `node --check exited ${exitCode}`}`);
    } catch (err) {
      errors.push(`${nodeBinary}: ${String(err)}`);
    }
  }

  return {
    valid: false,
    error: errors.length
      ? errors.join("\n")
      : "Unable to find a real Node.js binary for syntax verification",
  };
}
