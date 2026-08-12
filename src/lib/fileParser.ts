import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source for pdf.js to local Vite-bundled worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ParsedFileResult {
  fileName: string;
  fileSize: number;
  text: string;
  candidateNameCandidate?: string;
  error?: string;
}

export async function parseResumeFile(file: File): Promise<ParsedFileResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase();

  try {
    let extractedText = '';

    if (ext === 'txt') {
      extractedText = await file.text();
    } else if (ext === 'docx' || ext === 'doc') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value || '';
    } else if (ext === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      
      const pageTexts: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageString = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        pageTexts.push(pageString);
      }
      extractedText = pageTexts.join('\n\n');
    } else {
      // Fallback text reader
      extractedText = await file.text();
    }

    // Clean up excessive whitespace or trailing junk while preserving paragraphs
    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleanedText) {
      throw new Error('Extracted text was empty or unreadable.');
    }

    // Enhanced candidate name extraction
    const candidateNameCandidate = extractCandidateName(cleanedText, fileName);

    return {
      fileName,
      fileSize,
      text: cleanedText,
      candidateNameCandidate
    };
  } catch (err: any) {
    console.error('File parsing error:', err);
    return {
      fileName,
      fileSize,
      text: '',
      error: err.message || 'Failed to parse resume file. Please copy & paste directly.'
    };
  }
}

export function extractCandidateName(text: string, fileName?: string): string | undefined {
  // 1. Try extracting candidate name from top text of resume
  if (text && text.trim().length > 0) {
    const topChunk = text.slice(0, 600);
    // Split into segments by pipe, bullet, newline, tab, comma, slashes
    const segments = topChunk
      .split(/[\n|\t•·—/,\\]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const titleKeywordsRegex = /\b(Senior|Junior|Lead|Principal|Staff|Engineer|Developer|Specialist|Architect|Manager|Director|Executive|Consultant|Analyst|Designer|Scientist|Intern|Student|Officer|Head|VP|Resume|Curriculum|Vitae|CV|Profile|Summary|Contact|Phone|Email|LinkedIn|GitHub|Portfolio)\b/i;

    for (let segment of segments) {
      // Clean out emails, phone numbers, URLs from segment
      segment = segment.replace(/[\w.-]+@[\w.-]+\.\w+/g, '');
      segment = segment.replace(/(https?:\/\/|www\.)\S+/g, '');
      segment = segment.replace(/\+?\d[\d\s-]{7,}\d/g, '');

      // If segment contains title keyword, extract substring before the title keyword
      const match = segment.match(titleKeywordsRegex);
      if (match && match.index !== undefined && match.index > 0) {
        segment = segment.slice(0, match.index).trim();
      } else if (match && match.index === 0) {
        continue;
      }

      // Clean non-alpha characters except space, dots, hyphens
      const cleaned = segment.replace(/[^a-zA-Z\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
      const words = cleaned.split(' ').filter(w => w.length > 0);

      // A name typically has 2 to 5 words
      if (words.length >= 2 && words.length <= 5) {
        const isNameLike = words.every(w => /^[a-zA-Z.-]+$/.test(w)) &&
          !/\b(Page|Section|Experience|Education|Skills|Projects|Certifications|Address|Summary|Objective)\b/i.test(cleaned);

        if (isNameLike) {
          return formatCandidateName(cleaned);
        }
      } else if (words.length === 1 && words[0].length >= 2) {
        if (!titleKeywordsRegex.test(words[0])) {
          return formatCandidateName(words[0]);
        }
      }
    }
  }

  // 2. Fallback: Extract candidate name from filename
  if (fileName) {
    const baseName = fileName.replace(/\.[^/.]+$/, ''); // Strip extension
    const cleanedFile = baseName
      .replace(/\b(Resume|CV|Curriculum|Vitae|Draft|Final|Copy|Updated|Version|v\d+|\d{4})\b/gi, '')
      .replace(/[^a-zA-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const fileWords = cleanedFile.split(' ').filter(w => w.length > 1);
    if (fileWords.length >= 2 && fileWords.length <= 5) {
      return formatCandidateName(cleanedFile);
    } else if (fileWords.length === 1) {
      return formatCandidateName(fileWords[0]);
    }
  }

  return undefined;
}

function formatCandidateName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w.length === 1 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
