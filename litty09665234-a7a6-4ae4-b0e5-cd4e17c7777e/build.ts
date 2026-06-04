// Bun Build Script
// JS bundling with Bun, CSS with Tailwind CLI

import { $ } from "bun";

const VITE_ENV = process.env.VITE_ENV || "PREVIEW";
const BUILD_PROFILE = process.env.BUILD_PROFILE;
const isProduction = BUILD_PROFILE === "production";

// Deployment tier controls build optimization level:
// - 'preview' (draft): unminified, with source maps — easiest to debug
// - 'mainnet-preview': unminified, with source maps — debuggable on real chain
// - 'production' (live): minified, no source maps — optimized for end users
const DEPLOYMENT_TIER = process.env.VITE_DEPLOYMENT_TIER || "preview";
const isProductionTier = DEPLOYMENT_TIER === "production";

// Production config (passed via environment variables during mainnet deploy)
const PROD_TITLE = process.env.VITE_PROD_TITLE || "";
const PROD_FAVICON = process.env.VITE_PROD_FAVICON || "";
const PROD_THEME_COLOR = process.env.VITE_PROD_THEME_COLOR || ""; // Persisted from mobile publish

// Theme color for meta tag and manifest — uses default unless explicitly set via mobile publish
const themeColorHex = PROD_THEME_COLOR || '#0a0a0a';

// Build profiling — logs memory/timing per phase when POOF_BUILD_PROFILE=1
const BUILD_PROFILE_ENABLED = process.env.POOF_BUILD_PROFILE === '1';
function logBuildPhase(phase: string) {
  if (!BUILD_PROFILE_ENABLED) return;
  const mem = process.memoryUsage();
  console.log(`[build-profile] ${phase} | rss=${Math.round(mem.rss / 1024 / 1024)}MB heap=${Math.round(mem.heapUsed / 1024 / 1024)}MB ext=${Math.round(mem.external / 1024 / 1024)}MB | ${new Date().toISOString()}`);
}

logBuildPhase('start');
console.log(`Building for ${VITE_ENV} (production: ${isProduction}, tier: ${DEPLOYMENT_TIER}), theme-color: ${themeColorHex}`);

// Step 0.5: Download favicon/OG images to public/ if not already present
// These are saved as local static files so they work across all environments
// (draft, preview, live) without depending on environment-specific S3 URLs.
const FAVICON_S3_URL = "https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69d8919d43a63d6a7927dfc9";
const OG_IMAGE_S3_URL = "https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69d734be21f73302c16fe66b";

async function downloadIfMissing(url: string, dest: string) {
  const file = Bun.file(dest);
  if (await file.exists()) {
    console.log(`  ${dest} already exists, skipping download`);
    return;
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`  Warning: Failed to download ${url} (${resp.status}), skipping`);
      return;
    }
    const buf = await resp.arrayBuffer();
    await Bun.write(dest, buf);
    console.log(`  Downloaded ${dest} (${buf.byteLength} bytes)`);
  } catch (e) {
    console.warn(`  Warning: Could not download ${url}:`, e);
  }
}

console.log("Ensuring favicon/OG images are available locally...");
await Promise.all([
  downloadIfMissing(FAVICON_S3_URL, "./public/favicon.png"),
  downloadIfMissing(OG_IMAGE_S3_URL, "./public/og-image.png"),
]);
logBuildPhase('after-favicon-download');

// Step 1: Clean
await $`rm -rf ./dist && mkdir -p ./dist`.quiet();
logBuildPhase('after-clean');

// Step 2: Copy static assets first (so generated files take precedence)
// Preserve source mtimes so unchanged static files are not re-uploaded by sync.
await $`cp -pR ./public/* ./dist/ 2>/dev/null || true`.quiet();
await $`cp -p ./component-inspector.js ./dist/`.quiet();
await $`cp -p ./console-shim.js ./dist/`.quiet();
logBuildPhase('after-copy-assets');

// Step 3: Build CSS with Tailwind CLI (only minify for production tier)
console.log("Building CSS...");
const cssGlobals = isProductionTier
  ? $`bunx tailwindcss -i ./src/globals.css -o ./dist/globals.css --minify`.quiet()
  : $`bunx tailwindcss -i ./src/globals.css -o ./dist/globals.css`.quiet();
const cssBase = isProductionTier
  ? $`bunx tailwindcss -i ./src/styles/base.css -o ./dist/base.css --minify`.quiet()
  : $`bunx tailwindcss -i ./src/styles/base.css -o ./dist/base.css`.quiet();
await Promise.all([cssGlobals, cssBase]);
logBuildPhase('after-tailwind');

// Step 4: Bundle JS with Bun
console.log("Bundling JS...");
const result = await Bun.build({
  entrypoints: ["./src/main.tsx"],
  outdir: "./dist",
  target: "browser",
  conditions: ["browser", "import"],  // Force ESM resolution to avoid CJS conversion bugs
  minify: isProductionTier,
  splitting: false,
  sourcemap: isProductionTier ? "none" : "linked",
  // Ignore CSS imports - CSS is handled separately by Tailwind CLI
  plugins: [{
    name: "ignore-css",
    setup(build) {
      build.onLoad({ filter: /\.css$/ }, () => ({
        contents: "",
        loader: "js",
      }));
    },
  }],
  define: {
    "import.meta.env": JSON.stringify({
      VITE_ENV: VITE_ENV,
      MODE: isProduction ? "production" : "development",
      DEV: !isProduction,
      PROD: isProduction,
      VITE_TAROBASE_APP_ID: process.env.VITE_TAROBASE_APP_ID || "",
      VITE_PARTYSERVER_URL: process.env.VITE_PARTYSERVER_URL || "",
      // Default to mainnet for LIVE environment if not explicitly set
      VITE_CHAIN: process.env.VITE_CHAIN || (VITE_ENV === 'LIVE' ? 'mainnet' : ''),
      VITE_RPC_URL: process.env.VITE_RPC_URL || (VITE_ENV === 'LIVE' ? 'https://api.mainnet-beta.solana.com' : ''),
      VITE_AUTH_METHOD: process.env.VITE_AUTH_METHOD || "",
      VITE_WS_API_URL: process.env.VITE_WS_API_URL || "",
      VITE_API_URL: process.env.VITE_API_URL || "",
      VITE_AUTH_API_URL: process.env.VITE_AUTH_API_URL || "",
      VITE_STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
      // Deployment tier: 'preview', 'mainnet-preview', or 'production'
      // Used to distinguish mainnet preview from production (both have VITE_ENV='LIVE')
      VITE_DEPLOYMENT_TIER: process.env.VITE_DEPLOYMENT_TIER || "preview",
    }),
    "process.env.NODE_ENV": JSON.stringify(isProduction ? "production" : "development"),
  },
  naming: {
    entry: "[name]-[hash].js",
    chunk: "chunk-[hash].js",
    asset: "assets/[name]-[hash].[ext]",
  },
  loader: {
    ".png": "file",
    ".jpg": "file",
    ".svg": "file",
    ".gif": "file",
    ".webp": "file",
    ".woff": "file",
    ".woff2": "file",
  },
});

logBuildPhase('after-bun-build');

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    // Properly extract error message from BuildMessage object
    const message = log.text || log.message || JSON.stringify(log);
    console.error(`  ${message}`);
    if (log.location) {
      console.error(`    at ${log.location.file}:${log.location.line}:${log.location.column}`);
    }
  }
  process.exit(1);
}

// Step 4.5: Fix asset paths - convert relative to absolute
// This ensures images load correctly on nested routes (e.g., /profile/xyz)
// Without this fix, "./assets/..." resolves to "/profile/xyz/assets/..." which 404s
console.log("Fixing asset paths...");
const jsFiles = result.outputs.filter((o: { kind: string }) => o.kind === "entry-point" || o.kind === "chunk");
for (const jsOutput of jsFiles) {
  const jsPath = jsOutput.path;
  let content = await Bun.file(jsPath).text();
  // Replace relative asset paths with absolute paths
  // Matches: "./assets/filename.ext" or './assets/filename.ext'
  content = content.replace(/(['"])\.\/assets\//g, '$1/assets/');
  await Bun.write(jsPath, content);
}

// Step 5: Generate index.html
const entryFile = result.outputs.find((o: { kind: string }) => o.kind === "entry-point")?.path.split("/").pop();

// Use production config if provided, otherwise use local static files
const faviconUrl = PROD_FAVICON || "/favicon.png";
const pageTitle = PROD_TITLE || "Lit Studio";
// OG image: use local static file (relative path — modern social crawlers resolve against deployed domain)
const ogImageUrl = "/og-image.png";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
  <meta name="theme-color" content="${themeColorHex}" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${pageTitle}" />

  <!-- Favicon: standard browsers -->
  <link rel="icon" type="image/png" href="${faviconUrl}" />
  <link rel="icon" type="image/png" sizes="32x32" href="${faviconUrl}" />
  <link rel="icon" type="image/png" sizes="16x16" href="${faviconUrl}" />

  <!-- Apple Touch Icon: iOS / macOS Safari -->
  <link rel="apple-touch-icon" sizes="180x180" href="${faviconUrl}" />

  <!-- Windows Tile -->
  <meta name="msapplication-TileImage" content="${faviconUrl}" />
  <meta name="msapplication-TileColor" content="${themeColorHex}" />

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />

  <title>${pageTitle}</title>

  <!-- Open Graph -->
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="Artists launch songs as tradable tokens. Fans buy in early. Music meets crypto on Solana." />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:type" content="website" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="Artists launch songs as tradable tokens. Fans buy in early. Music meets crypto on Solana." />
  <meta name="twitter:image" content="${ogImageUrl}" />

  <link rel="stylesheet" href="/globals.css" />
  <link rel="stylesheet" href="/base.css" />
  <script>window.__VITE_ENV__ = '${VITE_ENV}';</script>
  <script src="/console-shim.js"></script>
  <script src="/component-inspector.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/${entryFile}"></script>
</body>
</html>`;
await Bun.write("./dist/index.html", html);

// Step 5.5: Generate manifest.json with production values
const manifest = {
  name: pageTitle,
  short_name: pageTitle.length > 12 ? pageTitle.substring(0, 12) : pageTitle,
  start_url: "/",
  display: "standalone",
  background_color: themeColorHex,
  theme_color: themeColorHex,
  icons: [
    {
      src: faviconUrl,
      sizes: "any",
      type: faviconUrl.endsWith(".svg") ? "image/svg+xml"
        : faviconUrl.endsWith(".png") ? "image/png"
        : "image/x-icon",
    },
  ],
};
await Bun.write("./dist/manifest.json", JSON.stringify(manifest, null, 2));

logBuildPhase('after-html-manifest');
console.log("Build succeeded!");
for (const o of result.outputs) console.log(`  - ${(o as { path: string }).path.split("/").pop()}`);
logBuildPhase('done');
