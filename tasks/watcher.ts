import watcher from '@parcel/watcher';
import path from 'path';
import prettier from 'prettier';
import fs from 'fs-extra';
import chalk from 'chalk';
import dayjs from 'dayjs';
import sass from 'sass';

const src = path.resolve(process.cwd(), 'src');
const dist = path.resolve(process.cwd(), 'dist');
const prettierrc = path.resolve(process.cwd(), '.prettierrc');
const prettierOptions = JSON.parse(fs.readFileSync(prettierrc, 'utf8'));

const JST = () => dayjs().format('HH:mm:ss');
const log = (...text: any[]) => console.log(`[${chalk.gray(JST())}]`, ...text);

const compileScss = async (filePath: string) => {
  if (path.basename(filePath).startsWith('_')) return;

  log('Starting scss ...');

  try {
    console.time('scss');
    const result = sass.compile(filePath);
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
  } catch (e) {
    log(e);
  } finally {
    console.timeEnd('scss');
  }
}

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
