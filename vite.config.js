import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'apps/web',plugins:[react()],build:{outDir:'dist',emptyOutDir:true,rollupOptions:{output:{manualChunks(id){if(id.includes('/node_modules/@xterm/'))return 'terminal';if(id.includes('/node_modules/@codemirror/')||id.includes('/node_modules/@lezer/')||id.includes('/node_modules/codemirror/'))return 'editor';}}}},server:{proxy:{'/api':'http://localhost:3000','/ws':{target:'ws://localhost:3000',ws:true}}}});
