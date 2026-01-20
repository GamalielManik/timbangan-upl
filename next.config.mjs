/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/timbangan-upl',
  assetPrefix: '/timbangan-upl/',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

export default nextConfig