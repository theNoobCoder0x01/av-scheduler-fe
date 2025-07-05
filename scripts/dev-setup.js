#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("🚀 BAPS Music Scheduler - Development Setup");
console.log("==========================================\n");

// Check if .env.local exists
const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("📝 Creating .env.local file...");
  const examplePath = path.join(process.cwd(), ".env.local.example");
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log("✅ .env.local created from example\n");
  }
}

// Function to start a process with colored output
function startProcess(command, args, name, color) {
  const proc = spawn(command, args, {
    stdio: "pipe",
    shell: true,
    cwd: process.cwd(),
  });

  proc.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      console.log(`\x1b[${color}m[${name}]\x1b[0m ${line}`);
    });
  });

  proc.stderr.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      console.log(`\x1b[${color}m[${name}]\x1b[0m \x1b[31m${line}\x1b[0m`);
    });
  });

  proc.on("close", (code) => {
    console.log(
      `\x1b[${color}m[${name}]\x1b[0m Process exited with code ${code}`,
    );
  });

  return proc;
}

// Start API server
console.log("🔧 Starting API Server...");
const apiProcess = startProcess("npm", ["run", "api:dev"], "API", "34"); // Blue

// Wait a bit for API to start, then start frontend
setTimeout(() => {
  console.log("🌐 Starting Frontend...");
  const webProcess = startProcess("npm", ["run", "dev"], "WEB", "32"); // Green

  // Handle process cleanup
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...");
    apiProcess.kill();
    webProcess.kill();
    process.exit(0);
  });
}, 3000);

console.log("\n📋 Development servers starting...");
console.log("🔗 API Server: http://localhost:8082");
console.log("🔗 Frontend: http://localhost:3000");
console.log("📡 WebSocket: ws://localhost:8082");
console.log("\n💡 Press Ctrl+C to stop all servers\n");
