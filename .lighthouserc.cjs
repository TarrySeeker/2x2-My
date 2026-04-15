/** @type {import('@lhci/cli').LHCIConfig} */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start",
      startServerReadyPattern: "started server",
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/services",
        "http://localhost:3000/portfolio",
        "http://localhost:3000/contacts",
      ],
      numberOfRuns: 2,
      settings: {
        preset: "desktop",
        throttling: { cpuSlowdownMultiplier: 2 },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 1.0 }],
        "categories:seo": ["error", { minScore: 1.0 }],
        "uses-http2": "off",
        "uses-long-cache-ttl": "off",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
