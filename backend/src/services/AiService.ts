// src/services/AiService.ts
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import { EventEmitter } from "events";
import { SystemSettingsService } from "./SystemSettingsService";
import { config } from "../config";

const prisma = new PrismaClient();

// Event emitter для синхронизации
export const syncEvents = new EventEmitter();

// Статус текущей синхронизации
interface SyncStatus {
  isRunning: boolean;
  startedAt: Date | null;
  progress: number;
  total: number;
  current: number;
  currentFile: string;
  synced: number;
  updated: number;
  skipped: number;
  errors: number;
  completedAt: Date | null;
  error: string | null;
}

let syncStatus: SyncStatus = {
  isRunning: false,
  startedAt: null,
  progress: 0,
  total: 0,
  current: 0,
  currentFile: "",
  synced: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  completedAt: null,
  error: null,
};

// Ленивая инициализация клиентов
let geminiClient: GoogleGenerativeAI | null = null;
let groqClient: OpenAI | null = null;

// AI API ключи (обязательные)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY не установлен. Embeddings и семантический поиск не будут работать.");
}

const GROQ_API_KEY = config.groqApiKey;
if (!GROQ_API_KEY) {
  console.warn("⚠️  GROQ_API_KEY не установлен. AI-ассистент не будет работать.");
}

// Google Drive (опционально - для синхронизации документов)
const GOOGLE_DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

function getGeminiClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY не установлен в переменных окружения");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return geminiClient;
}

function getGroqClient(): OpenAI {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY не установлен в переменных окружения");
  }
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groqClient;
}

// Модель для embeddings (Gemini) - возвращает 768 размерность
const EMBEDDING_MODEL = "text-embedding-004";
// Модель для chat (Groq)
const CHAT_MODEL = "qwen/qwen3-32b";

/**
 * Получает текущий системный промт из БД (персистентное хранение)
 * Использует кэширование для оптимизации производительности
 */
async function getSystemPrompt(): Promise<string> {
  return await SystemSettingsService.getAiSystemPrompt();
}

/**
 * Устанавливает новый системный промт (сохраняет в БД)
 * @param prompt - новый системный промт
 * @param updatedBy - ID пользователя, изменившего настройку
 */
async function setSystemPrompt(prompt: string, updatedBy?: number): Promise<void> {
  await SystemSettingsService.setAiSystemPrompt(prompt, updatedBy);
}

/**
 * Сбрасывает системный промт к дефолтному (сохраняет в БД)
 * @param updatedBy - ID пользователя, сбросившего настройку
 */
async function resetSystemPrompt(updatedBy?: number): Promise<string> {
  return await SystemSettingsService.resetAiSystemPrompt(updatedBy);
}

interface DocumentMetadata {
  title?: string;
  subject?: string;
  grade?: string;
  tags?: string[];
  source?: string;
  googleDriveFileId?: string;
  lastSyncedAt?: string;
  chunkIndex?: number;
  totalChunks?: number;
  [key: string]: unknown;
}

interface KnowledgeDocument {
  id: number;
  content: string;
  metadata: DocumentMetadata | null;
  similarity?: number;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

/**
 * Получает список файлов из Google Drive папки (публичной)
 * Примечание: требуется включить Google Drive API в Google Console
 */
async function getGoogleDriveFiles(): Promise<GoogleDriveFile[]> {
  if (!GOOGLE_DRIVE_API_KEY || !GOOGLE_DRIVE_FOLDER_ID) {
    console.log("ℹ️  Google Drive не настроен (GOOGLE_DRIVE_API_KEY или GOOGLE_DRIVE_FOLDER_ID отсутствуют)");
    return [];
  }
  
  try {
    // Используем Google Drive API v3 для получения файлов из публичной папки
    const url = `https://www.googleapis.com/drive/v3/files?q='${GOOGLE_DRIVE_FOLDER_ID}'+in+parents&key=${GOOGLE_DRIVE_API_KEY}&fields=files(id,name,mimeType,webViewLink)`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Google Drive API response:", errorText);
      
      // Если Drive API недоступен, пробуем альтернативный метод
      if (errorText.includes("accessNotConfigured") || errorText.includes("SERVICE_DISABLED")) {
        console.log("⚠️ Google Drive API не включен. Используйте ручную загрузку документов.");
        console.log("Для включения API перейдите: https://console.developers.google.com/apis/api/drive.googleapis.com/overview");
      }
      return [];
    }
    
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error fetching Google Drive files:", error);
    return [];
  }
}

// Поддерживаемые типы файлов для синхронизации
const SUPPORTED_MIME_TYPES = [
  "application/vnd.google-apps.document",  // Google Docs
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",                             // .txt файлы
  "text/markdown",                          // .md файлы
];

/**
 * Проверяет, поддерживается ли тип файла для синхронизации
 */
function isSupportedFileType(mimeType: string, fileName: string): boolean {
  // Google Docs всегда поддерживаются
  if (mimeType === "application/vnd.google-apps.document") {
    return true;
  }
  // DOCX файлы
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return true;
  }
  // Текстовые файлы
  if (SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return true;
  }
  // Проверяем расширение файла
  const supportedExtensions = [".txt", ".md", ".markdown", ".docx"];
  return supportedExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

/**
 * Очищает текст от нулевых байтов и невалидных UTF-8 символов
 */
function sanitizeText(text: string): string {
  // Удаляем нулевые байты
  let cleaned = text.replace(/\x00/g, "");
  // Удаляем другие управляющие символы кроме переносов строк и табуляции
  cleaned = cleaned.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return cleaned;
}

/**
 * Парсит DOCX файл и извлекает текст
 */
async function parseDocxContent(buffer: Buffer): Promise<string | null> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return sanitizeText(result.value);
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    return null;
  }
}

/**
 * Получает содержимое текстового файла из Google Drive
 */
async function getGoogleDriveFileContent(fileId: string, mimeType: string): Promise<string | null> {
  try {
    // Для Google Docs используем export в текстовый формат
    if (mimeType === "application/vnd.google-apps.document") {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&key=${GOOGLE_DRIVE_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        return sanitizeText(text);
      }
    }
    
    // Для DOCX файлов скачиваем как бинарный и парсим через mammoth
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return await parseDocxContent(buffer);
      }
    }
    
    // Для текстовых файлов используем get с alt=media
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`;
    const response = await fetch(url);
    if (response.ok) {
      const text = await response.text();
      return sanitizeText(text);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching file ${fileId}:`, error);
    return null;
  }
}

/**
 * Добавляет документ напрямую из текста (для ручной загрузки)
 */
async function addDocumentFromText(
  text: string,
  title: string,
  subject?: string,
  grade?: string
): Promise<{ id: number; success: boolean; chunksCreated: number }> {
  try {
    const metadata: DocumentMetadata = {
      title,
      subject,
      grade,
      source: "Manual Upload",
      lastSyncedAt: new Date().toISOString(),
    };
    
    // Разбиваем большие документы на чанки
    const chunks = splitIntoChunks(text, 3000, 300);
    let firstId = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkMetadata: DocumentMetadata = {
        ...metadata,
        chunkIndex: i,
        totalChunks: chunks.length,
        title: chunks.length > 1 ? `${title} (часть ${i + 1}/${chunks.length})` : title,
      };
      
      const result = await addDocument(chunks[i], chunkMetadata);
      if (i === 0) firstId = result.id;
    }
    
    return { id: firstId, success: true, chunksCreated: chunks.length };
  } catch (error) {
    console.error("Error adding document from text:", error);
    throw error;
  }
}

/**
 * Разбивает большой текст на чанки с использованием семантического подхода
 * Учитывает структуру документа: заголовки, абзацы, предложения
 */
function splitIntoChunks(text: string, maxChunkSize: number = 2000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  
  // Определяем паттерны для разделения
  const headingPattern = /^#{1,6}\s+.+$/gm;  // Markdown заголовки
  const numberedHeadingPattern = /^\d+\.\s+[А-ЯA-Z].+$/gm; // Нумерованные заголовки
  const paragraphSeparator = /\n\s*\n/; // Двойные переносы
  const sentenceEnd = /[.!?]\s+(?=[А-ЯA-Z])/g; // Конец предложения
  
  // Разбиваем на логические секции сначала по заголовкам
  const sections = splitByHeadings(text);
  
  for (const section of sections) {
    if (section.length <= maxChunkSize) {
      // Секция помещается целиком
      if (section.trim().length >= 50) {
        chunks.push(section.trim());
      }
    } else {
      // Секция слишком большая - разбиваем по абзацам
      const paragraphs = section.split(paragraphSeparator);
      let currentChunk = "";
      
      for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) continue;
        
        if (currentChunk.length + trimmedParagraph.length + 2 <= maxChunkSize) {
          // Добавляем абзац к текущему чанку
          currentChunk += (currentChunk ? "\n\n" : "") + trimmedParagraph;
        } else {
          // Сохраняем текущий чанк и начинаем новый
          if (currentChunk.trim().length >= 50) {
            chunks.push(currentChunk.trim());
          }
          
          // Если абзац сам по себе слишком большой
          if (trimmedParagraph.length > maxChunkSize) {
            const sentenceChunks = splitBySentences(trimmedParagraph, maxChunkSize, overlap);
            chunks.push(...sentenceChunks);
            currentChunk = "";
          } else {
            // Добавляем overlap из предыдущего чанка для сохранения контекста
            const overlapText = getOverlapText(currentChunk, overlap);
            currentChunk = overlapText + (overlapText ? "\n\n" : "") + trimmedParagraph;
          }
        }
      }
      
      // Не забываем последний чанк
      if (currentChunk.trim().length >= 50) {
        chunks.push(currentChunk.trim());
      }
    }
  }
  
  return chunks.filter(chunk => chunk.length >= 50);
}

/**
 * Разбивает текст по заголовкам, сохраняя их в секциях
 */
function splitByHeadings(text: string): string[] {
  // Паттерны для заголовков
  const headingPatterns = [
    /^(#{1,6}\s+.+)$/gm,                           // Markdown заголовки
    /^(\d+\.\d*\s+[А-ЯA-Z].+)$/gm,                // Нумерованные (1.1 Заголовок)
    /^([А-ЯA-Z][А-Яа-яA-Za-z\s]{5,50}:)$/gm,      // Заголовки с двоеточием
    /^(Тема\s*\d*[:.]\s*.+)$/gim,                 // "Тема 1: ..."
    /^(Урок\s*\d*[:.]\s*.+)$/gim,                 // "Урок 1: ..."
    /^(Раздел\s*\d*[:.]\s*.+)$/gim,               // "Раздел 1: ..."
    /^(Глава\s*\d*[:.]\s*.+)$/gim,                // "Глава 1: ..."
  ];
  
  // Находим все позиции заголовков
  const headingPositions: number[] = [0];
  
  for (const pattern of headingPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      if (!headingPositions.includes(match.index)) {
        headingPositions.push(match.index);
      }
    }
  }
  
  // Сортируем позиции
  headingPositions.sort((a, b) => a - b);
  
  // Если заголовков нет или мало - возвращаем как есть
  if (headingPositions.length <= 1) {
    return [text];
  }
  
  // Разбиваем на секции
  const sections: string[] = [];
  for (let i = 0; i < headingPositions.length; i++) {
    const start = headingPositions[i];
    const end = headingPositions[i + 1] || text.length;
    const section = text.slice(start, end).trim();
    if (section) {
      sections.push(section);
    }
  }
  
  return sections;
}

/**
 * Разбивает текст по предложениям для очень больших абзацев
 */
function splitBySentences(text: string, maxSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  
  // Разбиваем на предложения, учитывая разные знаки препинания
  const sentencePattern = /[^.!?]*[.!?]+\s*/g;
  const sentences: string[] = [];
  let match;
  
  while ((match = sentencePattern.exec(text)) !== null) {
    sentences.push(match[0]);
  }
  
  // Если не удалось разбить на предложения - используем простое разбиение
  if (sentences.length === 0) {
    return splitSimple(text, maxSize, overlap);
  }
  
  let currentChunk = "";
  let overlapSentences: string[] = [];
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk.trim().length >= 50) {
        chunks.push(currentChunk.trim());
      }
      
      // Берём последние предложения для overlap
      overlapSentences = getLastSentences(currentChunk, overlap);
      currentChunk = overlapSentences.join("") + sentence;
    }
  }
  
  if (currentChunk.trim().length >= 50) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Простое разбиение текста (fallback)
 */
function splitSimple(text: string, maxSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxSize;
    
    // Пытаемся найти хорошую точку разрыва
    if (end < text.length) {
      // Ищем последний пробел
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start + maxSize / 2) {
        end = lastSpace + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length >= 50) {
      chunks.push(chunk);
    }
    
    start = end - overlap;
  }
  
  return chunks;
}

/**
 * Получает текст для overlap из конца чанка
 */
function getOverlapText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return "";
  
  // Ищем начало последнего предложения в пределах overlap
  const lastPart = text.slice(-maxLength);
  const sentenceStart = lastPart.search(/[.!?]\s+[А-ЯA-Z]/);
  
  if (sentenceStart > 0) {
    return lastPart.slice(sentenceStart + 2);
  }
  
  // Если не нашли предложение - берём от последнего пробела
  const lastSpace = lastPart.lastIndexOf(" ");
  if (lastSpace > 0) {
    return lastPart.slice(lastSpace + 1);
  }
  
  return lastPart;
}

/**
 * Получает последние предложения для overlap
 */
function getLastSentences(text: string, maxLength: number): string[] {
  const sentences: string[] = [];
  const pattern = /[^.!?]*[.!?]+\s*/g;
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    sentences.push(match[0]);
  }
  
  if (sentences.length === 0) return [];
  
  const result: string[] = [];
  let totalLength = 0;
  
  for (let i = sentences.length - 1; i >= 0 && totalLength < maxLength; i--) {
    result.unshift(sentences[i]);
    totalLength += sentences[i].length;
  }
  
  return result;
}

/**
 * Получает текущий статус синхронизации
 */
function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * Сбрасывает статус синхронизации
 */
function resetSyncStatus(): void {
  syncStatus = {
    isRunning: false,
    startedAt: null,
    progress: 0,
    total: 0,
    current: 0,
    currentFile: "",
    synced: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    completedAt: null,
    error: null,
  };
}

/**
 * Обновляет статус синхронизации и эмитит событие
 */
function updateSyncStatus(updates: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...updates };
  if (syncStatus.total > 0) {
    syncStatus.progress = Math.round((syncStatus.current / syncStatus.total) * 100);
  }
  syncEvents.emit("sync-progress", syncStatus);
}

/**
 * Синхронизирует документы из Google Drive в локальную базу знаний
 * Асинхронная версия с прогрессом
 */
async function syncGoogleDriveDocuments(): Promise<{ synced: number; updated: number; errors: number; skipped: number }> {
  // Проверяем, не запущена ли уже синхронизация
  if (syncStatus.isRunning) {
    throw new Error("Синхронизация уже выполняется");
  }
  
  // Инициализируем статус
  resetSyncStatus();
  updateSyncStatus({
    isRunning: true,
    startedAt: new Date(),
  });
  
  try {
    const files = await getGoogleDriveFiles();
    console.log(`📂 Found ${files.length} files in Google Drive folder`);
    
    updateSyncStatus({ total: files.length });
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updateSyncStatus({
        current: i + 1,
        currentFile: file.name,
      });
      
      try {
        // Проверяем поддерживается ли тип файла
        if (!isSupportedFileType(file.mimeType, file.name)) {
          console.log(`⏭️ Skipping unsupported file type: ${file.name} (${file.mimeType})`);
          updateSyncStatus({ skipped: syncStatus.skipped + 1 });
          continue;
        }
        
        // Получаем содержимое файла
        const content = await getGoogleDriveFileContent(file.id, file.mimeType);
        if (!content || content.trim().length < 10) {
          console.log(`⏭️ File ${file.name} has no content or is too short`);
          updateSyncStatus({ skipped: syncStatus.skipped + 1 });
          continue;
        }
        
        // Проверяем, есть ли уже этот документ в базе
        const existing = await prisma.$queryRaw<{ id: number; content: string }[]>`
          SELECT id, content FROM "KnowledgeBaseDocument" 
          WHERE metadata->>'googleDriveFileId' = ${file.id}
          LIMIT 1
        `;
        
        // Если документ уже есть и содержимое не изменилось - пропускаем
        if (existing.length > 0) {
          const existingContent = existing[0].content;
          // Сравниваем хеш содержимого (первые 500 символов)
          if (existingContent.substring(0, 500) === content.substring(0, 500)) {
            continue; // Содержимое не изменилось
          }
          
          // Удаляем старые версии документа для обновления
          await prisma.$executeRaw`
            DELETE FROM "KnowledgeBaseDocument" 
            WHERE metadata->>'googleDriveFileId' = ${file.id}
          `;
          console.log(`🔄 Updating: ${file.name}`);
          updateSyncStatus({ updated: syncStatus.updated + 1 });
        }
        
        // Извлекаем метаданные из имени файла
        // Формат: "Предмет - Класс - Тема.txt" или просто название
        const nameParts = file.name.replace(/\.(txt|doc|docx|pdf|gdoc)$/i, "").split(" - ");
        const metadata: DocumentMetadata = {
          title: nameParts[nameParts.length - 1] || file.name,
          subject: nameParts.length > 1 ? nameParts[0] : undefined,
          grade: nameParts.length > 2 ? nameParts[1] : undefined,
          source: "Google Drive",
          googleDriveFileId: file.id,
          lastSyncedAt: new Date().toISOString(),
        };
        
        // Разбиваем большие документы на чанки (используем улучшенный алгоритм)
        const chunks = splitIntoChunks(content, 3000, 300);
        
        for (let j = 0; j < chunks.length; j++) {
          const chunkMetadata: DocumentMetadata = {
            ...metadata,
            chunkIndex: j,
            totalChunks: chunks.length,
            title: chunks.length > 1 ? `${metadata.title} (часть ${j + 1}/${chunks.length})` : metadata.title,
          };
          
          await addDocument(chunks[j], chunkMetadata);
          
          // Небольшая пауза между запросами к API эмбеддингов
          if (j < chunks.length - 1) {
            await sleep(100);
          }
        }
        
        if (existing.length === 0) {
          updateSyncStatus({ synced: syncStatus.synced + 1 });
          console.log(`✅ Synced: ${file.name} (${chunks.length} chunks)`);
        }
        
        // Пауза между файлами чтобы не перегружать API
        await sleep(200);
        
      } catch (fileError) {
        console.error(`❌ Error processing file ${file.name}:`, fileError);
        updateSyncStatus({ errors: syncStatus.errors + 1 });
      }
    }
    
    // Завершаем синхронизацию
    updateSyncStatus({
      isRunning: false,
      completedAt: new Date(),
      currentFile: "",
    });
    
    syncEvents.emit("sync-complete", syncStatus);
    
  } catch (error) {
    console.error("❌ Error syncing Google Drive documents:", error);
    updateSyncStatus({
      isRunning: false,
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
      completedAt: new Date(),
    });
    syncEvents.emit("sync-error", syncStatus);
    throw error;
  }
  
  return {
    synced: syncStatus.synced,
    updated: syncStatus.updated,
    errors: syncStatus.errors,
    skipped: syncStatus.skipped,
  };
}

/**
 * Запускает синхронизацию в фоновом режиме (не блокирует запрос)
 */
function startBackgroundSync(): { started: boolean; message: string } {
  if (syncStatus.isRunning) {
    return { started: false, message: "Синхронизация уже выполняется" };
  }
  
  // Запускаем синхронизацию асинхронно
  syncGoogleDriveDocuments().catch((error) => {
    console.error("Background sync error:", error);
  });
  
  return { started: true, message: "Синхронизация запущена в фоновом режиме" };
}

/**
 * Вспомогательная функция для паузы
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Генерирует эмбеддинг для текста через Gemini API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
    
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    
    // Gemini text-embedding-004 возвращает 768 размерность
    // Нам нужно привести к 1536 для совместимости с БД
    // Или можно изменить размерность в БД на 768
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Не удалось сгенерировать эмбеддинг");
  }
}

/**
 * Добавляет документ в базу знаний с генерацией эмбеддинга
 */
async function addDocument(
  text: string,
  metadata: DocumentMetadata = {}
): Promise<{ id: number; success: boolean }> {
  try {
    // Генерируем эмбеддинг
    const embedding = await generateEmbedding(text);
    const embeddingString = `[${embedding.join(",")}]`;

    // Используем raw query для вставки вектора, т.к. Prisma плохо типизирует векторы
    const result = await prisma.$executeRaw`
      INSERT INTO "KnowledgeBaseDocument" (content, metadata, embedding, "createdAt", "updatedAt")
      VALUES (
        ${text},
        ${JSON.stringify(metadata)}::jsonb,
        ${embeddingString}::vector,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    // Получаем ID вставленной записи
    const inserted = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "KnowledgeBaseDocument" ORDER BY id DESC LIMIT 1
    `;

    return { id: inserted[0].id, success: true };
  } catch (error) {
    console.error("Error adding document:", error);
    throw new Error("Не удалось добавить документ в базу знаний");
  }
}

/**
 * Поиск похожих документов по косинусному сходству
 */
async function findSimilarDocuments(
  queryEmbedding: number[],
  limit: number = 5
): Promise<KnowledgeDocument[]> {
  try {
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // Поиск с использованием оператора <=> для косинусного расстояния
    const results = await prisma.$queryRaw<KnowledgeDocument[]>`
      SELECT 
        id,
        content,
        metadata,
        1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM "KnowledgeBaseDocument"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingString}::vector
      LIMIT ${limit}
    `;

    return results;
  } catch (error) {
    console.error("Error finding similar documents:", error);
    return [];
  }
}

/**
 * Формирует контекст из найденных документов
 */
function buildContext(documents: KnowledgeDocument[]): string {
  if (documents.length === 0) {
    return "Контекст из базы знаний не найден.";
  }

  return documents
    .map((doc, index) => {
      const meta = doc.metadata;
      const metaInfo = meta
        ? `[${meta.subject || "Без предмета"}${meta.grade ? `, ${meta.grade}` : ""}]`
        : "";
      return `--- Документ ${index + 1} ${metaInfo} ---\n${doc.content}`;
    })
    .join("\n\n");
}

/**
 * Основная функция чата с AI-ассистентом (RAG)
 */
async function chatWithAssistant(
  userQuery: string,
  conversationHistory: ChatMessage[] = []
): Promise<{ response: string; sources: KnowledgeDocument[] }> {
  try {
    // 1. Генерируем эмбеддинг для запроса пользователя
    const queryEmbedding = await generateEmbedding(userQuery);

    // 2. Поиск похожих документов в базе знаний
    const relevantDocs = await findSimilarDocuments(queryEmbedding, 5);

    // 3. Формируем контекст
    const context = buildContext(relevantDocs);

    // 4. Получаем системный промт из БД
    const systemPrompt = await getSystemPrompt();

    // 5. Собираем сообщения для LLM
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      {
        role: "system",
        content: `КОНТЕКСТ из базы знаний учебных программ:\n\n${context}`,
      },
      // Добавляем историю разговора
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: userQuery },
    ];

    // 5. Отправляем запрос в LLM (Groq)
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0].message.content || "Не удалось получить ответ";

    return {
      response,
      sources: relevantDocs,
    };
  } catch (error) {
    console.error("Error in chatWithAssistant:", error);
    throw new Error("Ошибка при обработке запроса к AI-ассистенту");
  }
}

/**
 * Получает все документы из базы знаний (без эмбеддингов)
 */
async function getAllDocuments(): Promise<
  { id: number; content: string; metadata: DocumentMetadata | null; createdAt: Date }[]
> {
  try {
    const documents = await prisma.$queryRaw<
      { id: number; content: string; metadata: DocumentMetadata | null; createdAt: Date }[]
    >`
      SELECT id, content, metadata, "createdAt"
      FROM "KnowledgeBaseDocument"
      ORDER BY "createdAt" DESC
    `;
    return documents;
  } catch (error) {
    console.error("Error getting documents:", error);
    throw new Error("Не удалось получить документы");
  }
}

/**
 * Удаляет документ из базы знаний
 */
async function deleteDocument(id: number): Promise<boolean> {
  try {
    await prisma.$executeRaw`
      DELETE FROM "KnowledgeBaseDocument" WHERE id = ${id}
    `;
    return true;
  } catch (error) {
    console.error("Error deleting document:", error);
    throw new Error("Не удалось удалить документ");
  }
}

export const AiService = {
  addDocument,
  addDocumentFromText,
  chatWithAssistant,
  getAllDocuments,
  deleteDocument,
  generateEmbedding,
  syncGoogleDriveDocuments,
  startBackgroundSync,
  getSyncStatus,
  resetSyncStatus,
  getGoogleDriveFiles,
  getSystemPrompt,
  setSystemPrompt,
  resetSystemPrompt,
};
