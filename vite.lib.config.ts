import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/js/lib/index.ts'),
      name: 'FluidSimulation',
      fileName: (format) => `fluid-simulation.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'fluid-simulation.[ext]',
      },
    },
  },
})
