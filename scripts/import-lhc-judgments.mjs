import { importJudgments } from './high-court-import.mjs';

if (process.argv[1]?.endsWith('import-lhc-judgments.mjs')) {
  importJudgments('lhc', process.argv[2]).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
