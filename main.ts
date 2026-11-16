// Upstream's entry program (Node 22, standard library only). The game is the
// plain static files under game/ in this directory, plus the screenshots/
// that show it played, and this program hands both in: it copies them to
// /output and writes /output/dossier.json, the summary the judge reads,
// using the vendored make.fun library. It takes no arguments and installs
// nothing; outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally first with `node serve.ts`, then open
// http://localhost:8080 and play it. The screenshots in screenshots/ must
// be real renders of the game in a browser (see shots.json for the scenes
// that made them); the first by name is the cover the judge sees largest.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The gate's own caps: only text_max_bytes shapes the dossier's bytes; the
// rest refuse an entry the scorer would refuse anyway (more than 4
// screenshots or one over 256 KiB; game/ over 993 files or 48 MiB in all,
// or a path under game/ over 1000 bytes: game/ shares /output's own
// 1000-entry cap with screenshots/ and dossier.json).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
