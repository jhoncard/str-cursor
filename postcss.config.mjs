/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Resolve @import from node_modules before Tailwind; avoids bundler-specific
    // quirks with package.json "exports" / Turbopack vs Webpack.
    "postcss-import": {},
    tailwindcss: {},
  },
};

export default config;
