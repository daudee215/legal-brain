import { importJudgments } from './high-court-import.mjs';

if (process.argv[1]?.endsWith('import-phc-judgments.mjs')) {
  importJudgments('phc', process.argv[2]).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
