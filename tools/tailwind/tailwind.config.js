/** Same defaults as the Tailwind Play CDN (v3.4.17) the site used before. */
module.exports = {
  content: ["../../*.html", "../../js/**/*.js"],
  theme: {
    extend: {},
  },
  // Only give elements that actually use transforms/shadows/filters the --tw-* helper variables,
  // instead of setting ~50 variables on every element (noticeably faster style calculation on phones).
  experimental: {
    optimizeUniversalDefaults: true,
  },
  plugins: [],
};
