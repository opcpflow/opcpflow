import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@opcpflow/core': path.resolve(__dirname, '../core/dist'),
      '@opcpflow/nodes': path.resolve(__dirname, '../nodes/dist'),
      '@xyflow/react': path.resolve(__dirname, 'node_modules/@xyflow/react'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
