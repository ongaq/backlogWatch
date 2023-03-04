import * as swc from '@swc/core';
import watcher from '@parcel/watcher';
import path from 'path';
import prettier from 'prettier';
import fs from 'fs-extra';
import chalk from 'chalk';
import dayjs from 'dayjs';

const src = path.resolve(process.cwd(), 'src');
const dist = path.resolve(process.cwd(), 'dist');
const prettierrc = path.resolve(process.cwd(), '.prettierrc');
const swcrc = path.resolve(process.cwd(), '.swcrc');
const prettierOptions = JSON.parse(fs.readFileSync(prettierrc, 'utf8'));
const swcOptions = JSON.parse(fs.readFileSync(swcrc, 'utf8'));

const JST = () => dayjs().format('HH:mm:ss');
const log = (...text: any[]) => console.log(`[${chalk.gray(JST())}]`, ...text);

const compileTs = async (filePath: string) => {
  log('Starting ts ...');

  try {
    console.time('ts');
    const tsFileData = await fs.readFile(filePath, { encoding: 'utf8' });
    const data = await swc.transform(tsFileData, swcOptions);
    const fileName = path.basename(filePath).replace('.ts', '.js');
    const distPath = path.resolve(`${dist}/js`, fileName);
    await fs.writeFile(
      distPath,
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

    if (/\.ts$/.test(filePath)) {
      nowProcessingFile.push(filePath);
      await compileTs(filePath);
      clearProcessingPath(filePath);
    }
  }
});
