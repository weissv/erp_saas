// src/services/examAiService.ts
// AI-powered exam answer checking service.
// Uses per-tenant Groq API credentials fetched at runtime (BYOK).
// Falls back to OpenAI BYOK key when Groq is not available.

import { config } from "../config";
import { getTenantIntegrations, DEFAULT_TENANT_ID } from "./TenantIntegrationsService";
import { createTenantOpenAiClient } from "./OpenAiClientFactory";
import { MissingOpenAiKeyError } from "../utils/errors";
import { logger } from "../utils/logger";

export interface AiCheckResult {
  score: number;
  feedback: string;
  confidence: number;
}

/**
 * Проверяет ответ студента с помощью AI
 */
export async function checkExamAnswerWithAI(
  questionContent: string,
  expectedAnswer: string,
  studentAnswer: string,
  keyPoints: string[],
  maxPoints: number,
  questionType?: string,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<AiCheckResult> {
  try {
    // Fetch per-tenant API credentials
    const creds = await getTenantIntegrations(tenantId);

    // Формируем промпт для AI
    const systemPrompt = `Ты - опытный преподаватель, проверяющий работу студента. 
Твоя задача - оценить ответ студента на вопрос или задачу.

КРИТЕРИИ ОЦЕНКИ:
1. Полнота ответа (охвачены ли все ключевые аспекты)
2. Правильность (корректны ли факты и вычисления)
3. Логичность изложения
4. Понимание материала

ФОРМАТ ОТВЕТА:
Ты ОБЯЗАТЕЛЬНО должен ответить в формате JSON:
{
  "score": <число от 0 до ${maxPoints}>,
  "feedback": "<конструктивная обратная связь для студента>",
  "confidence": <число от 0 до 1, насколько ты уверен в оценке>
}

ВАЖНО: 
- Будь объективен и справедлив
- Учитывай частичную правильность ответа
- Если ответ пустой или бессмысленный - ставь 0 баллов
- Feedback должен быть полезным для обучения`;

    const userPrompt = `ВОПРОС/ЗАДАЧА:
${questionContent}

${expectedAnswer ? `ПРАВИЛЬНЫЙ ОТВЕТ (для сравнения):
${expectedAnswer}` : ''}

${keyPoints.length > 0 ? `КЛЮЧЕВЫЕ МОМЕНТЫ, которые должны быть в ответе:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

МАКСИМАЛЬНЫЙ БАЛЛ: ${maxPoints}

ОТВЕТ СТУДЕНТА:
${studentAnswer || '(ответ не предоставлен)'}

Оцени ответ студента и верни результат в формате JSON.`;

    const normalizedType = (questionType || "").toUpperCase();
    let model = creds.groqModel || config.groqModel || 'llama-3.3-70b-versatile';
    if (normalizedType === 'TEXT_SHORT') {
      model = creds.groqBlitzModel || config.groqBlitzModel || model;
    }
    if (normalizedType === 'TEXT_LONG' || normalizedType === 'PROBLEM') {
      model = creds.groqHeavyModel || config.groqHeavyModel || model;
    }

    // Fetch Groq API key from tenant credentials at runtime
    const groqApiKey = creds.groqApiKey;
    if (groqApiKey) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error("Groq API error:", error);
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (content) {
        try {
          const jsonText = content.includes('{') ? content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1) : content;
          const result = JSON.parse(jsonText);
          return {
            score: Math.min(maxPoints, Math.max(0, Number(result.score) || 0)),
            feedback: result.feedback || 'Ответ проверен автоматически.',
            confidence: Number(result.confidence) || 0.5
          };
        } catch (e) {
          logger.error("Failed to parse AI response:", content);
        }
      }
    }

    // ── OpenAI BYOK fallback ──────────────────────────────────────────────
    // If Groq is not configured, try the tenant's own OpenAI key (BYOK).
    try {
      const openai = await createTenantOpenAiClient(tenantId);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          const jsonText = content.includes('{')
            ? content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)
            : content;
          const result = JSON.parse(jsonText);
          return {
            score: Math.min(maxPoints, Math.max(0, Number(result.score) || 0)),
            feedback: result.feedback || 'Ответ проверен автоматически.',
            confidence: Number(result.confidence) || 0.5,
          };
        } catch (e) {
          logger.error("Failed to parse OpenAI response:", content);
        }
      }
    } catch (err) {
      // If it's a MissingOpenAiKeyError, propagate it so the controller can
      // return a 428 to the client, prompting the admin to configure BYOK.
      if (err instanceof MissingOpenAiKeyError) throw err;
      logger.error("OpenAI BYOK fallback error:", err);
    }

    // Фолбэк на локальную эвристическую проверку
    return fallbackCheck(questionContent, expectedAnswer, studentAnswer, keyPoints, maxPoints);
    
  } catch (error) {
    // Propagate MISSING_OPENAI_KEY so controllers return 428 to the client
    if (error instanceof MissingOpenAiKeyError) throw error;
    logger.error("AI check error:", error);
    // При ошибке AI возвращаем результат для ручной проверки
    return {
      score: 0,
      feedback: 'Ответ требует ручной проверки преподавателем.',
      confidence: 0
    };
  }
}

/**
 * Эвристическая проверка без AI (фолбэк)
 */
function fallbackCheck(
  questionContent: string,
  expectedAnswer: string,
  studentAnswer: string,
  keyPoints: string[],
  maxPoints: number
): AiCheckResult {
  if (!studentAnswer || studentAnswer.trim().length < 3) {
    return {
      score: 0,
      feedback: 'Ответ не предоставлен или слишком короткий.',
      confidence: 1
    };
  }

  const normalizedStudent = studentAnswer.toLowerCase().trim();
  const normalizedExpected = expectedAnswer?.toLowerCase().trim() || '';

  // Проверяем точное совпадение
  if (normalizedExpected && normalizedStudent === normalizedExpected) {
    return {
      score: maxPoints,
      feedback: 'Ответ верный!',
      confidence: 0.9
    };
  }

  // Проверяем ключевые точки
  if (keyPoints.length > 0) {
    let matchedPoints = 0;
    const missedList: string[] = [];

    for (const point of keyPoints) {
      const normalizedPoint = point.toLowerCase();
      // Проверяем вхождение ключевой фразы или её частей
      const words = normalizedPoint.split(/\s+/);
      const matchedWords = words.filter(w => w.length > 3 && normalizedStudent.includes(w));
      
      if (matchedWords.length >= Math.ceil(words.length * 0.6)) {
        matchedPoints++;
      } else {
        missedList.push(point);
      }
    }

    const score = Math.round((matchedPoints / keyPoints.length) * maxPoints);
    
    let feedback = '';
    if (matchedPoints === keyPoints.length) {
      feedback = 'Отлично! Все ключевые аспекты раскрыты.';
    } else if (matchedPoints > 0) {
      feedback = `Частично правильно. Упомянуто ${matchedPoints} из ${keyPoints.length} ключевых аспектов. `;
      if (missedList.length > 0) {
        feedback += `Стоит также раскрыть: ${missedList.slice(0, 2).join(', ')}.`;
      }
    } else {
      feedback = 'Ответ не содержит ключевых аспектов. Требуется ручная проверка.';
    }

    return {
      score,
      feedback,
      confidence: 0.5
    };
  }

  // Если нет ни expectedAnswer ни keyPoints - требуется ручная проверка
  return {
    score: 0,
    feedback: 'Ответ требует ручной проверки преподавателем.',
    confidence: 0
  };
}

/**
 * Проверяет математическую задачу (расширенная логика)
 */
export async function checkMathProblem(
  problemContent: string,
  expectedAnswer: string,
  studentAnswer: string,
  maxPoints: number,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<AiCheckResult> {
  // Пытаемся извлечь числовой ответ
  const extractNumber = (text: string): number | null => {
    const matches = text.match(/-?\d+([.,]\d+)?/g);
    if (matches && matches.length > 0) {
      // Берём последнее число как финальный ответ
      return parseFloat(matches[matches.length - 1].replace(',', '.'));
    }
    return null;
  };

  const expectedNum = extractNumber(expectedAnswer);
  const studentNum = extractNumber(studentAnswer);

  if (expectedNum !== null && studentNum !== null) {
    // Проверяем с погрешностью 0.01
    if (Math.abs(expectedNum - studentNum) < 0.01) {
      return {
        score: maxPoints,
        feedback: 'Правильный ответ!',
        confidence: 0.95
      };
    } else {
      // Проверяем близость ответа
      const errorPercent = Math.abs((expectedNum - studentNum) / expectedNum) * 100;
      if (errorPercent < 10) {
        return {
          score: Math.round(maxPoints * 0.7),
          feedback: `Ответ близок к правильному, но содержит небольшую ошибку в вычислениях. Правильный ответ: ${expectedNum}`,
          confidence: 0.8
        };
      }
    }
  }

  // Если числовая проверка не дала результат, используем AI
  return checkExamAnswerWithAI(problemContent, expectedAnswer, studentAnswer, [], maxPoints, 'PROBLEM', tenantId);
}
