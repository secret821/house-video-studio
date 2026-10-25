/** Express owns local media and long-running jobs; Next owns document routing. */
import process from 'node:process';

const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  reactStrictMode: true,
  devIndicators: false,
};

export default nextConfig;
