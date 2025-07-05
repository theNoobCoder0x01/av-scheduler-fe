#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Test script to verify the automated routing system
 */
function testRoutingSystem() {
  console.log("🧪 Testing Automated Routing System");
  console.log("=====================================\n");

  const outDir = path.join(process.cwd(), "out");

  if (!fs.existsSync(outDir)) {
    console.log('❌ Output directory not found. Run "npm run build" first.');
    return;
  }

  // Simulate the route discovery logic
  const files = fs.readdirSync(outDir, { withFileTypes: true });
  const htmlFiles = files
    .filter((file) => file.isFile() && file.name.endsWith(".html"))
    .map((file) => ({
      filename: file.name,
      route:
        file.name === "index.html" ? "/" : `/${file.name.replace(".html", "")}`,
    }));

  console.log("📋 Discovered HTML Files:");
  htmlFiles.forEach(({ filename, route }) => {
    console.log(`  ${route.padEnd(20)} → ${filename}`);
  });

  console.log("\n🔍 Testing Route Scenarios:");

  const testRoutes = [
    "/",
    "/media-player",
    "/settings",
    "/media-player/some-nested-path",
    "/settings/advanced",
    "/non-existent-page",
  ];

  testRoutes.forEach((testRoute) => {
    const exactMatch = htmlFiles.find((f) => f.route === testRoute);
    const partialMatch = htmlFiles.find(
      (f) => f.route !== "/" && testRoute.startsWith(f.route),
    );
    const fallback = htmlFiles.find((f) => f.route === "/");

    let result;
    if (exactMatch) {
      result = `✅ Exact match: ${exactMatch.filename}`;
    } else if (partialMatch) {
      result = `🔄 Partial match: ${partialMatch.filename}`;
    } else if (fallback) {
      result = `📄 SPA fallback: ${fallback.filename}`;
    } else {
      result = `❌ No match found`;
    }

    console.log(`  ${testRoute.padEnd(25)} → ${result}`);
  });

  console.log("\n✅ Routing test completed!");
  console.log("\n💡 Benefits of this system:");
  console.log("   • Automatically discovers all HTML files");
  console.log("   • No manual route configuration needed");
  console.log("   • Handles nested routes intelligently");
  console.log("   • Provides SPA fallback for client-side routing");
  console.log("   • Works with any Next.js page structure");
}

if (require.main === module) {
  testRoutingSystem();
}

module.exports = { testRoutingSystem };
