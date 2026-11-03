/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14 : nécessaire pour instrumentation.js (démarrage de la tâche de fond).
    instrumentationHook: true,
  },
  webpack(config, { isServer }) {
    // Le module SQLite intégré à Node n'est pas à empaqueter.
    if (isServer) config.externals.push({ "node:sqlite": "commonjs node:sqlite" });
    return config;
  },
};

export default nextConfig;
