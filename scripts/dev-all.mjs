import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const MOBILE_DIR = process.cwd();
const clean = process.argv.includes("--clean");
const WEB_DIR = path.resolve(MOBILE_DIR, "..", "..", "WEB", "kitchen-landing");
const children = [];
let shuttingDown = false;

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(700);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function killTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    child.kill("SIGTERM");
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n[dev] Arrêt des serveurs démarrés par ce script…");
  for (const { child } of children) killTree(child);
  process.exit(code);
}

function run(name, command, args, cwd) {
  console.log(`[dev] Démarrage ${name}…`);
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  children.push({ name, child });
  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.log(`[dev] ${name} s'est arrêté (code ${code ?? "?"}).`);
    shutdown(1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const [webRunning, metroRunning] = await Promise.all([
  isPortOpen(3000),
  isPortOpen(8081),
]);

if (webRunning && metroRunning) {
  console.log("[dev] Le BFF (:3000) et Metro (:8081) tournent déjà.");
  if (clean) console.log("[dev] Arrêtez le BFF avant d’utiliser dev:clean.");
  process.exit(0);
}

if (!existsSync(path.join(WEB_DIR, "package.json"))) {
  console.error(`[dev] Projet web introuvable : ${WEB_DIR}`);
  process.exit(1);
}

if (webRunning) {
  console.log("[dev] BFF déjà en cours sur http://localhost:3000");
  if (clean) console.log("[dev] .next non vidé : le BFF tourne déjà.");
} else {
  if (clean) {
    rmSync(path.join(WEB_DIR, ".next"), { recursive: true, force: true });
    console.log("[dev] Cache web .next supprimé.");
  }
  run("le serveur web (kitchen-landing)", "pnpm", ["dev"], WEB_DIR);
}

if (metroRunning) {
  console.log("[dev] Metro déjà en cours sur http://localhost:8081");
} else {
  run("Expo / Metro", "pnpm", clean ? ["start", "--", "-c"] : ["start"], MOBILE_DIR);
}

console.log(
  "[dev] Gardez ce terminal ouvert. Ctrl+C arrête les serveurs lancés par ce script.",
);
