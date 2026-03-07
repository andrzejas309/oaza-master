import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    server: {
        port: 5173,
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    base: '/oaza-master/',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'firebase-app':       ['firebase/app'],
                    'firebase-auth':      ['firebase/auth'],
                    'firebase-firestore': ['firebase/firestore'],
                    'vue-vendor':         ['vue', 'vue-router'],
                    'charts':             ['vue-chartjs', 'chart.js'],
                    'draggable':          ['vuedraggable', 'sortablejs'],
                },
            },
        },
        chunkSizeWarningLimit: 600,
    },
})
