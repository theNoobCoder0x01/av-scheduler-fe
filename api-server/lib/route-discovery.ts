import fs from "fs";
import path from "path";

export interface DiscoveredRoute {
  route: string;
  filename: string;
  fullPath: string;
}

/**
 * Discovers all HTML files in the Next.js output directory and creates route mappings
 */
export function discoverStaticRoutes(outputDir: string): DiscoveredRoute[] {
  const routes: DiscoveredRoute[] = [];

  if (!fs.existsSync(outputDir)) {
    console.warn(`⚠️ Output directory does not exist: ${outputDir}`);
    return routes;
  }

  try {
    // Get all files in the output directory
    const files = fs.readdirSync(outputDir, { withFileTypes: true });

    // Process HTML files
    files
      .filter((file) => file.isFile() && file.name.endsWith(".html"))
      .forEach((file) => {
        const filename = file.name;
        const route =
          filename === "index.html" ? "/" : `/${filename.replace(".html", "")}`;
        const fullPath = path.join(outputDir, filename);

        routes.push({
          route,
          filename,
          fullPath,
        });
      });

    // Also check for nested directories (for more complex Next.js apps)
    files
      .filter((file) => file.isDirectory() && !file.name.startsWith("_"))
      .forEach((dir) => {
        const dirPath = path.join(outputDir, dir.name);
        const indexPath = path.join(dirPath, "index.html");

        if (fs.existsSync(indexPath)) {
          routes.push({
            route: `/${dir.name}`,
            filename: `${dir.name}/index.html`,
            fullPath: indexPath,
          });
        }
      });

    console.log(`🔍 Discovered ${routes.length} static routes:`);
    routes.forEach((route) => {
      console.log(`  ${route.route} → ${route.filename}`);
    });

    return routes;
  } catch (error) {
    console.error("❌ Error discovering static routes:", error);
    return routes;
  }
}

/**
 * Creates Express route handlers for discovered static routes
 */
export function createRouteHandlers(app: any, routes: DiscoveredRoute[]) {
  routes.forEach(({ route, filename, fullPath }) => {
    app.get(route, (req: any, res: any) => {
      console.log(`📄 Serving ${route} → ${filename}`);
      res.sendFile(fullPath);
    });
  });
}

/**
 * Smart fallback handler that tries to match routes intelligently
 */
export function createSmartFallbackHandler(
  outputDir: string,
  discoveredRoutes: DiscoveredRoute[],
) {
  return (req: any, res: any) => {
    const requestedPath = req.path;
    console.log(`🔍 Smart fallback for: ${requestedPath}`);

    try {
      // Extract path segments
      const segments = requestedPath.split("/").filter(Boolean);

      if (segments.length === 0) {
        // Root path - serve index.html
        const indexRoute = discoveredRoutes.find((r) => r.route === "/");
        if (indexRoute) {
          console.log(`🏠 Serving root: ${indexRoute.filename}`);
          res.sendFile(indexRoute.fullPath);
          return;
        }
      }

      // Try to find exact match first
      const exactMatch = discoveredRoutes.find(
        (r) => r.route === requestedPath,
      );
      if (exactMatch) {
        console.log(`✅ Exact match: ${exactMatch.filename}`);
        res.sendFile(exactMatch.fullPath);
        return;
      }

      // Try to find partial match (for nested routes)
      const partialMatch = discoveredRoutes.find(
        (r) => r.route !== "/" && requestedPath.startsWith(r.route),
      );
      if (partialMatch) {
        console.log(
          `✅ Partial match: ${partialMatch.route} → ${partialMatch.filename}`,
        );
        res.sendFile(partialMatch.fullPath);
        return;
      }

      // Check if there's a direct HTML file match
      const firstSegment = segments[0];
      if (firstSegment) {
        const directHtmlPath = path.join(outputDir, `${firstSegment}.html`);
        if (fs.existsSync(directHtmlPath)) {
          console.log(`✅ Direct HTML match: ${firstSegment}.html`);
          res.sendFile(directHtmlPath);
          return;
        }
      }

      // Ultimate fallback to index.html (SPA behavior)
      const indexRoute = discoveredRoutes.find((r) => r.route === "/");
      if (indexRoute) {
        console.log(`📄 SPA fallback: ${indexRoute.filename}`);
        res.sendFile(indexRoute.fullPath);
      } else {
        console.log(`❌ No fallback available`);
        res.status(404).send("Page not found");
      }
    } catch (error) {
      console.error("❌ Error in smart fallback handler:", error);
      res.status(500).send("Internal Server Error");
    }
  };
}
