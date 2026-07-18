import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
    integrations: [
        react(),
        tailwind({
            applyBaseStyles: false,
        }),
    ],
    site: process.env.PUBLIC_SITE_URL || 'http://localhost:3003',
    trailingSlash: 'always',
    base: '/',
    output: 'static',
    build: {
        inlineStylesheets: 'auto',
    },
});
