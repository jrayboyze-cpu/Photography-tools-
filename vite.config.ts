import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          // 'autoUpdate' silently updates the service worker in the background.
          // The user gets the latest version on next page load with no prompt needed.
          registerType: 'autoUpdate',

          // Tells the plugin to inject the service worker registration into your app automatically.
          injectRegister: 'auto',

          // Points to your manifest file in /public
          manifest: false, // We're using a standalone manifest.json in /public

          // Workbox controls what gets cached and how.
          workbox: {
            // Cache all built JS, CSS, HTML, and common asset types.
            globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],

            // Cache-first for static assets (fonts, images, icons):
            // serve from cache instantly, update in background.
            runtimeCaching: [
              {
                // Google Fonts stylesheets
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // Google Fonts files
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // Open-Meteo weather API - NetworkFirst so data is always fresh,
                // but falls back to cache if offline.
                urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'open-meteo-cache',
                  expiration: { maxEntries: 20, maxAgeSeconds: 60 * 30 }, // 30 min
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // Open-Meteo Air Quality API
                urlPattern: /^https:\/\/air-quality-api\.open-meteo\.com\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'aqi-cache',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 30 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // WeatherAPI.com (SkyLink)
                urlPattern: /^https:\/\/api\.weatherapi\.com\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'weatherapi-cache',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 30 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // Tomorrow.io (MeteoPlus)
                urlPattern: /^https:\/\/api\.tomorrow\.io\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'tomorrowio-cache',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 30 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // Open-Meteo Geocoding (location search)
                urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'geocoding-cache',
                  expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 24 hours
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
      },
    };
});
