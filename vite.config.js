import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-mathpre',
      closeBundle() {
        if (fs.existsSync('mathpre')) {
          fs.cpSync('mathpre', 'dist/mathpre', {
            recursive: true,
            filter: (src) => !src.includes('scratch')
          })
        }
      }
    }
  ],
  base: '/',
})
