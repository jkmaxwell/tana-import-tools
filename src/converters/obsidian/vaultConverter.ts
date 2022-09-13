import { appendFile, appendFileSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path, { resolve } from 'path';
import { TanaIntermediateNode, TanaIntermediateSummary } from '../../types/types';
import { idgenerator } from '../../utils/utils';
import { convertObsidianFile, IdGenerator } from './fileConverter';

//source: https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
function* getFiles(dir: string): Generator<string> {
  const dirents = readdirSync(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

/**
 * Converts the vault to the Tana format and incrementally saves it, otherwise it would be to memory intensive on big vaults.
 * Due to the incremental approach the output-file will be valid JSON but not be formatted perfectly.
 */
export function convertVault(vaultPath: string, today: number = Date.now(), idGenerator: IdGenerator = idgenerator) {
  const iter = getFiles(vaultPath);

  const targetFileName = `${vaultPath}.tif.json`;
  try {
    unlinkSync(targetFileName);
  } catch (e) {}
  appendFileSync(targetFileName, '{\n  "version": "TanaIntermediateFile V0.1",\n  "nodes": [\n');

  let summary;
  let addComma = false;
  for (const filePath of iter) {
    if (!filePath.endsWith('.md')) continue;
    if (addComma) {
      appendFileSync(targetFileName, ',\n');
    }

    const [fileNode, updatedSummary] = convertObsidianFile(
      path.basename(filePath).replace('.md', ''),
      readFileSync(filePath, 'utf-8'),
      summary,
      today,
      idGenerator,
    ) as [TanaIntermediateNode, TanaIntermediateSummary];
    summary = updatedSummary;
    appendFileSync(targetFileName, JSON.stringify(fileNode, null, 2));
    addComma = true;
  }
  appendFileSync(targetFileName, '\n  ],\n  "summary": \n' + JSON.stringify(summary, null, 2) + '\n}');

  return summary;
}