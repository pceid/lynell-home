import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                    if (id.includes('/src/components/manager/') || id.includes('/src/components/ManagerPanel')) {
                        return 'manager';
                    }
                    if (id.includes('/src/components/RoomManagerPanel')) {
                        return 'room-manager';
                    }
                    if (id.includes('/src/components/trend/')) {
                        return 'trend-history';
                    }
                    return undefined;
                },
            },
        },
    },
});
