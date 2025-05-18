const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const isWindows = os.platform() === "win32";
const pythonCmd = "python";
const venvPython = isWindows ? "venv\\Scripts\\python.exe" : "venv/bin/python";
const venvPip = isWindows ? "venv\\Scripts\\pip.exe" : "venv/bin/pip";

const requirementsFile = "requirements.txt";
const mainScript = "main.py";

// Step 1: Create venv if needed
if (!fs.existsSync(venvPython)) {
  console.log("Creating virtual environment...");
  const result = spawnSync(pythonCmd, ["-m", "venv", "venv"], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status);
}

// Step 2: Compare requirements.txt hash to last known
let installNeeded = false;
const hashFile = ".reqhash";

if (fs.existsSync(requirementsFile)) {
  const content = fs.readFileSync(requirementsFile, "utf8");
  const hash = crypto.createHash("sha256").update(content).digest("hex");

  if (!fs.existsSync(hashFile) || fs.readFileSync(hashFile, "utf8") !== hash) {
    installNeeded = true;
    fs.writeFileSync(hashFile, hash); // update hash
  }
}

if (installNeeded) {
  console.log("Installing updated dependencies...");
  const pipInstall = spawnSync(venvPip, ["install", "-r", requirementsFile], {
    stdio: "inherit",
  });
  if (pipInstall.status !== 0) process.exit(pipInstall.status);
} else {
  console.log("Dependencies already up-to-date.");
}

// Step 3: Run your app
console.log("Starting app...");
const app = spawn(
  venvPython,
  [
    "-m",
    "uvicorn",
    "main:app",
    "--host",
    "0.0.0.0",
    "--port",
    "8000",
    // "--reload", // enable if you want uvicorn to watch instead
  ],
  {
    stdio: "inherit",
  }
);

app.on("close", (code) => {
  console.log(`App exited with code ${code}`);
});
