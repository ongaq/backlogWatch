import * as swc from '@swc/core';
import watcher from '@parcel/watcher';
import path from 'path';
import prettier from 'prettier';
import fs from 'fs-extra';
import chalk from 'chalk';
import dayjs from 'dayjs';
import sass from 'sass';

const src = path.resolve(process.cwd(), 'src');
const dist = path.resolve(process.cwd(), 'dist');
const pub = path.resolve(process.cwd(), 'public');
const prettierrc = path.resolve(process.cwd(), '.prettierrc');
const prettierOptions = JSON.parse(fs.readFileSync(prettierrc, 'utf8'));
const swcrc = path.resolve(process.cwd(), '.swcrc');
const swcOptions = JSON.parse(fs.readFileSync(swcrc, 'utf8'));

const JST = () => dayjs().format('HH:mm:ss');
const log = (...text: any[]) => console.log(`[${chalk.gray(JST())}]`, ...text);

const compileScss = async (filePath: string) => {
  if (path.basename(filePath).startsWith('_')) return;

  log('Starting scss ...');

  try {
    console.time('scss');
    while (true) {
      const result = await sass.compileAsync(filePath);
      if (result.css.length === 0) continue;
      const fileName = path.basename(filePath).replace('.scss', '.css');
      const distPath = path.resolve(`${dist}/css`, fileName);
      const srcPath = path.resolve(`${src}/css`, fileName);

      await fs.writeFile(
        distPath,
        prettier.format(result.css, { ...prettierOptions, parser: 'css' }),
        'utf8'
      );
      // rollupの都合上srcにも吐き出す必要がある
      await fs.writeFile(
        srcPath,
        prettier.format(result.css, { ...prettierOptions, parser: 'css' }),
        'utf8'
      );
      break;
    }
  } catch (e) {
    log(e);
  } finally {
    console.timeEnd('scss');
  }
};
const compileTs = async (filePath: string) => {
  log('Starting ts ...');

  try {
    console.time('ts');
    const tsFileData = await fs.readFile(filePath, { encoding: 'utf8' });
    const data = await swc.transform(tsFileData, swcOptions);
    const fileName = path.basename(filePath).replace('.ts', '.js');
    const publicPath = path.resolve(`${pub}/js`, fileName);
    await fs.writeFile(
      publicPath,
      prettier.format(data.code, { ...prettierOptions, parser: 'babel' }),
      'utf8'
    );
  } catch (e) {
    log(e);
  } finally {
    console.timeEnd('ts');
  }
};

console.log('Starting watch ...');
let nowProcessingFile: string[] = [];

const clearProcessingPath = (filePath: string) => {
  setTimeout(() => {
    nowProcessingFile = nowProcessingFile.filter((key) => key !== filePath);
  }, 500);
};
watcher.subscribe(src, async (err, events) => {
  if (err) return;

  for (const event of events) {
    const filePath = event.path;

    if (nowProcessingFile.includes(filePath)) continue;

    if (/\.scss$/.test(filePath)) {
      nowProcessingFile.push(filePath);
      await compileScss(filePath);
      clearProcessingPath(filePath);
    }
  }
});
watcher.subscribe(pub, async (err, events) => {
  if (err) return;

  for (const event of events) {
    const filePath = event.path;

    if (nowProcessingFile.includes(filePath)) continue;

    if (/\.ts$/.test(filePath)) {
      nowProcessingFile.push(filePath);
      await compileTs(filePath);
      clearProcessingPath(filePath);
    }
  }
});
