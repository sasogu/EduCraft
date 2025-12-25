#!/usr/bin/env node
/**
 * Converts ClassQuiz exports (.cqa or .csv) into EduMusic quiz entries.
 *
 * Usage:
 *   node tools/import-classquiz.js path/to/quiz.cqa > questions.json
 * Options:
 *   --level easy|medium|hard    Target quiz difficulty (default: easy)
 *   --lang xx                   ISO code used for prompt/answers (default: es)
 *   --fallback xx               Optional fallback language key (default: es)
 *   --no-fallback               Skip adding fallback translations
 *   --prefix text               Prefix for generated question IDs (default: classquiz)
 *   --out file                  Write output to file instead of stdout
 *   --include-meta              Include quiz metadata alongside questions
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const QUIZ_DELIMITER = Buffer.from([0xc7, 0xc7, 0xc7, 0x00]);
const SUPPORTED_LEVELS = new Set(['easy', 'medium', 'hard']);
const DEFAULT_OPTIONS = {
  level: 'easy',
  lang: 'es',
  fallback: 'es',
  prefix: 'classquiz',
  includeMeta: false,
};

main();

function main() {
  try {
    const { file, options, helpRequested } = parseArgs(process.argv.slice(2));
    if (helpRequested) {
      printHelp();
      return;
    }
    const resolvedPath = path.resolve(process.cwd(), file);
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      throw new Error(`Input path is not a file: ${file}`);
    }

    if (!SUPPORTED_LEVELS.has(options.level)) {
      throw new Error(`Unsupported level "${options.level}". Use one of: easy, medium, hard.`);
    }

    const raw = fs.readFileSync(resolvedPath);
    const format = detectFormat(resolvedPath, options.format);
    let quiz;
    if (format === 'cqa') {
      quiz = parseClassQuizArchive(raw);
    } else if (format === 'csv') {
      quiz = parseClassQuizCsv(raw);
    } else if (format === 'json') {
      quiz = parseClassQuizJson(raw);
    } else {
      throw new Error(`Unsupported file format for ${file}. Expected .cqa or .csv`);
    }

    const transformed = transformQuiz(quiz, options);
    const payload = options.includeMeta
      ? {
          meta: {
            title: quiz.title || null,
            description: quiz.description || null,
            totalQuestions: quiz.questions.length,
            convertedQuestions: transformed.questions.length,
            source: path.basename(resolvedPath),
          },
          questions: transformed.questions,
          skipped: transformed.skipped,
        }
      : transformed.questions;

    const output = `${JSON.stringify(payload, null, 2)}\n`;
    if (options.out) {
      fs.writeFileSync(options.out, output, 'utf8');
    } else {
      process.stdout.write(output);
    }

    if (transformed.skipped.length > 0) {
      console.error(`[warn] Skipped ${transformed.skipped.length} question(s):`);
      transformed.skipped.forEach((item) => {
        console.error(`  • ${item.reason}`);
      });
    }
    console.error(
      `[info] Converted ${transformed.questions.length} question(s) from "${quiz.title || 'untitled'}".`
    );
  } catch (error) {
    console.error(`[error] ${error.message}`);
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  const positional = [];
  let helpRequested = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    if (token === '-h' || token === '--help') {
      helpRequested = true;
      continue;
    }
    if (token.startsWith('--')) {
      const { key, value, hasExplicitValue } = extractOption(argv, token, i);
      switch (key) {
        case 'level':
        case 'lang':
        case 'fallback':
        case 'prefix':
        case 'out':
        case 'format':
          if (value === undefined) {
            throw new Error(`Option "--${key}" requires a value`);
          }
          options[key] = value;
          if (!hasExplicitValue) {
            i += 1;
          }
          break;
        case 'include-meta':
          options.includeMeta = value === undefined ? true : value !== 'false';
          if (!hasExplicitValue) {
            if (value !== undefined) {
              i += 1;
            }
          }
          break;
        case 'no-fallback':
          options.fallback = null;
          break;
        default:
          throw new Error(`Unknown option "${token}"`);
      }
      continue;
    }
    positional.push(token);
  }

  if (positional.length === 0 && !helpRequested) {
    throw new Error('Missing input file path. Use --help for usage information.');
  }

  return {
    file: positional[0],
    options,
    helpRequested,
  };
}

function extractOption(argv, token, index) {
  const trimmed = token.slice(2);
  const [key, explicit] = trimmed.split('=');
  if (explicit !== undefined) {
    return { key, value: explicit, hasExplicitValue: true };
  }
  const next = argv[index + 1];
  if (next !== undefined && !next.startsWith('-')) {
    return { key, value: next, hasExplicitValue: false };
  }
  return { key, value: undefined, hasExplicitValue: false };
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node tools/import-classquiz.js <file> [options]',
      '',
      'Options:',
      '  --level <easy|medium|hard>   Difficulty category for the converted questions',
      '  --lang <code>                Language key for prompts and answers (default: es)',
      '  --fallback <code>            Secondary language key with same text (default: es)',
      '  --no-fallback                Do not add a fallback translation entry',
      '  --prefix <text>              Prefix for generated IDs (default: classquiz)',
      '  --out <file>                 Write JSON output to file',
      '  --format <cqa|csv|json>      Force input type detection',
      '  --include-meta               Wrap result with metadata and skipped details',
      '  -h, --help                   Show this help message',
      '',
      'Example:',
      '  node tools/import-classquiz.js quiz.cqa --level=medium --lang=es > quiz.json',
    ].join('\n')
  );
}

function detectFormat(filePath, forced) {
  if (forced) return forced.toLowerCase();
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.cqa') return 'cqa';
  if (ext === '.csv') return 'csv';
  if (ext === '.json') return 'json';
  return null;
}

function parseClassQuizArchive(buffer) {
  const delimiterIndex = buffer.indexOf(QUIZ_DELIMITER);
  if (delimiterIndex === -1) {
    throw new Error('Invalid .cqa archive: quiz delimiter not found');
  }
  const quizSlice = buffer.subarray(0, delimiterIndex);
  const decompressed = zlib.gunzipSync(quizSlice).toString('utf8');
  const quiz = JSON.parse(decompressed);
  if (!quiz || typeof quiz !== 'object' || !Array.isArray(quiz.questions)) {
    throw new Error('Invalid .cqa archive: quiz payload malformed');
  }
  return {
    title: quiz.title || '',
    description: quiz.description || '',
    questions: quiz.questions,
  };
}

function parseClassQuizJson(buffer) {
  try {
    const data = JSON.parse(buffer.toString('utf8'));
    if (Array.isArray(data.questions)) {
      return {
        title: data.title || '',
        description: data.description || '',
        questions: data.questions,
      };
    }
    if (Array.isArray(data)) {
      return {
        title: '',
        description: '',
        questions: data,
      };
    }
    throw new Error('Unsupported JSON structure');
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

function parseClassQuizCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const rows = parseCsv(text, delimiter);
  const filteredRows = rows.filter((row) => row.some((cell) => cell.trim().length > 0));
  if (filteredRows.length === 0) {
    throw new Error('CSV file is empty');
  }

  let title = '';
  let description = '';
  for (const row of filteredRows) {
    for (let i = 0; i < row.length; i += 1) {
      const cell = row[i].trim().toLowerCase();
      if (cell === 'title' && i + 1 < row.length && !title) {
        title = row[i + 1].trim();
      }
      if (cell === 'description' && i + 1 < row.length && !description) {
        description = row[i + 1].trim();
      }
    }
    if (title && description) break;
  }

  const headerIndex = filteredRows.findIndex((row) =>
    row.some((cell) => cell.trim().toLowerCase() === 'question')
  );
  if (headerIndex === -1) {
    throw new Error('CSV header row with "Question" column not found');
  }
  const headerRow = filteredRows[headerIndex].map((cell) => cell.trim().toLowerCase());
  const columnMap = matchHeaderColumns(headerRow);

  const questions = [];
  for (let i = headerIndex + 1; i < filteredRows.length; i += 1) {
    const row = filteredRows[i];
    const questionText = (row[columnMap.question] || '').trim();
    if (!questionText) continue;

    const answers = [];
    columnMap.answers.forEach((colIndex) => {
      if (colIndex === null) return;
      const value = row[colIndex];
      if (value === undefined || value === null) return;
      const trimmed = String(value).trim();
      if (trimmed.length === 0) return;
      answers.push({
        answer: trimmed,
        right: false,
      });
    });

    if (answers.length < 2) {
      continue;
    }

    const correctRaw =
      columnMap.correct !== null && row[columnMap.correct] !== undefined
        ? String(row[columnMap.correct])
        : '';
    const correctSet = parseCorrectAnswers(correctRaw);
    answers.forEach((answer, idx) => {
      answer.right = correctSet.has(idx + 1);
    });

    if (!answers.some((answer) => answer.right)) {
      // Assume first answer is correct if none flagged, to keep question usable.
      answers[0].right = true;
    }

    questions.push({
      question: questionText,
      answers,
      type: 'ABCD',
      time: null,
    });
  }

  return {
    title,
    description,
    questions,
  };
}

function detectDelimiter(text) {
  const sampleLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) || '';
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const semicolonCount = (sampleLine.match(/;/g) || []).length;
  if (semicolonCount > commaCount) return ';';
  if (commaCount > 0) return ',';
  return ';';
}

function parseCsv(content, delimiter) {
  const rows = [];
  let currentField = '';
  let currentRow = [];
  let insideQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = '';
  };
  const pushRow = () => {
    rows.push(currentRow);
    currentRow = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (insideQuotes) {
      if (char === '"') {
        const isEscapedQuote = content[i + 1] === '"';
        if (isEscapedQuote) {
          currentField += '"';
          i += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
      continue;
    }

    if (char === delimiter) {
      pushField();
      continue;
    }

    if (char === '\r') {
      continue;
    }

    if (char === '\n') {
      pushField();
      pushRow();
      continue;
    }

    currentField += char;
  }

  pushField();
  if (currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

function matchHeaderColumns(headerRow) {
  const lookup = (target) => {
    const idx = headerRow.findIndex((cell) => cell === target);
    return idx === -1 ? null : idx;
  };
  const answers = [
    lookup('1st answer'),
    lookup('2nd answer'),
    lookup('3rd answer'),
    lookup('4th answer'),
  ];

  return {
    question: lookup('question'),
    answers,
    correct: lookup('correct answers'),
  };
}

function parseCorrectAnswers(value) {
  const cleaned = String(value || '')
    .replace(/\s+/g, '')
    .trim();
  if (cleaned.length === 0) return new Set();
  const parts = cleaned.split(/[^0-9]+/).filter(Boolean);
  return new Set(parts.map((item) => Number.parseInt(item, 10)).filter(Number.isFinite));
}

function transformQuiz(quiz, options) {
  const slugBase = slugify(quiz.title || 'quiz');
  const prefix = options.prefix || 'classquiz';
  const questions = [];
  const skipped = [];

  quiz.questions.forEach((question, index) => {
    if (!question) return;
    const type = (question.type || 'ABCD').toUpperCase();
    if (!Array.isArray(question.answers)) {
      skipped.push({ reason: `Question ${index + 1} has no answer list` });
      return;
    }
    if (!['ABCD', 'CHECK'].includes(type)) {
      skipped.push({ reason: `Question ${index + 1} uses unsupported type "${type}"` });
      return;
    }
    const trimmedAnswers = question.answers
      .map((answer, answerIndex) => {
        if (!answer) return null;
        const rawText = typeof answer === 'string' ? answer : answer.answer;
        if (!rawText || String(rawText).trim().length === 0) return null;
        return {
          text: String(rawText).trim(),
          correct: Boolean(
            typeof answer === 'object' && answer !== null ? answer.right : answer?.correct
          ),
          index: answerIndex,
        };
      })
      .filter(Boolean);

    if (trimmedAnswers.length < 2) {
      skipped.push({ reason: `Question ${index + 1} has fewer than 2 valid answers` });
      return;
    }

    if (!trimmedAnswers.some((item) => item.correct)) {
      trimmedAnswers[0].correct = true;
    }

    const entry = {
      id: `${prefix}_${slugBase}_${index + 1}`,
      level: options.level,
      prompt: buildTranslationPayload(question.question, options),
      explanation: null,
      answers: trimmedAnswers.map((answer, answerIndex) => ({
        id: `${prefix}_${slugBase}_${index + 1}_${answerIndex + 1}`,
        correct: Boolean(answer.correct),
        text: buildTranslationPayload(answer.text, options),
      })),
    };

    questions.push(entry);
  });

  return { questions, skipped };
}

function buildTranslationPayload(text, options) {
  const value = text !== undefined && text !== null ? String(text).trim() : '';
  const payload = {};
  const lang = options.lang || 'es';
  payload[lang] = value;
  const fallback = options.fallback;
  if (fallback && fallback !== lang) {
    payload[fallback] = value;
  }
  return payload;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 40) || 'quiz';
}
