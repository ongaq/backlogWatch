import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import sass from 'rollup-plugin-sass';
import { chromeExtension, simpleReloader } from 'rollup-plugin-chrome-extension';

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
    chunkFileNames: path.join('chunks', '[name]-[hash].js'),
  },
  plugins: [
    typescript(),
    sass(),
    chromeExtension(),
    simpleReloader(),
    resolve(),
    commonjs(),
  ],
};
