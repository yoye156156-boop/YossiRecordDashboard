#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { runYossi } from "../core/apiClient.mjs";

const ROOT = process.env.YOSSI_RECORDINGS_DIR || "./recordings";
const extsRe = /\.(wav|mp3|m4a|ogg|oga|opus|flac|aac|m4b|aif|aiff|wma|alac)$/i;

function humanBytes(n) {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0,
    x = n;
  while (x >= 1024 && i < u.length - 1) {
    x /= 1024;
    i++;
  }
  return x.toFixed(1) + " " + u[i];
}

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, base, out);
    } else if (extsRe.test(entry.name)) {
      const st = fs.statSync(full);
      out.push({
        name: entry.name,
        rel: path.relative(base, full) || entry.name,
        full,
        size: st.size,
        mtime: st.mtime,
      });
    }
  }
  return out;
}

function parseSelection(input, max) {
  const set = new Set();
  for (const part of String(input)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((v) => parseInt(v, 10));
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
      const from = Math.max(1, Math.min(a, b));
      const to = Math.min(max, Math.max(a, b));
      for (let i = from; i <= to; i++) set.add(i);
    } else {
      const n = parseInt(part, 10);
      if (Number.isInteger(n) && n >= 1 && n <= max) set.add(n);
    }
  }
  return [...set].sort((a, b) => a - b);
}

async function main() {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });

  const rl = readline.createInterface({ input, output, terminal: true });
  process.on("SIGINT", async () => {
    output.write("\nCancelled.\n");
    await rl.close();
    process.exit(1);
  });

  try {
    const files = walk(ROOT).sort((a, b) => b.mtime - a.mtime);
    if (!files.length) {
      output.write("\nNo audio files found under " + ROOT + "\n");
      output.write(
        "Supported: .wav .mp3 .m4a .ogg .oga .opus .flac .aac .m4b .aif .aiff .wma .alac\n",
      );
      output.write(
        "Tip: set YOSSI_RECORDINGS_DIR=/path/to/dir to scan another folder.\n\n",
      );
      process.exit(1);
    }

    output.write(
      "\nSelect files to process (single or multiple: 3 or 1,3-5):\n",
    );
    files.forEach((f, i) => {
      output.write(
        String(i + 1).padStart(3, " ") +
          ". " +
          f.rel +
          "  (" +
          humanBytes(f.size) +
          ", " +
          f.mtime.toLocaleString() +
          ")\n",
      );
    });

    const ans = await rl.question("\nFile number(s) [e.g., 2 or 1,3-5]: ");
    const picks = parseSelection(ans, files.length);
    if (!picks.length) throw new Error("No valid selection.");

    let ok = 0,
      fail = 0;
    for (const idx of picks) {
      const f = files[idx - 1];
      const suggested = f.rel.replace(extsRe, "").replaceAll("_", " ");
      const patient =
        (await rl.question(
          `Patient name for "${f.rel}" (default: "${suggested}"): `,
        )) || suggested;

      output.write(`\n→ Processing: ${f.rel}  as "${patient}"\n`);
      try {
        const res = await runYossi({ file: f.full, patient });
        output.write("   ✅ Success");
        if (res.id) output.write(" | Job ID: " + res.id);
        if (res.status) output.write(" | Status: " + res.status);
        if (res.url) output.write(" | Output: " + res.url);
        output.write("\n");
        ok++;
      } catch (e) {
        output.write("   ❌ Error: " + (e?.message || e) + "\n");
        fail++;
      }
    }

    output.write(`\nDone. Success: ${ok}, Failed: ${fail}\n`);
  } catch (err) {
    console.error("\n❌ Error: " + (err?.message || err));
    process.exitCode = 1;
  } finally {
    await rl.close();
  }
}

main();
