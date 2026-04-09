// src/routes/public-exams.routes.ts
// Публичные роуты для студентов - без авторизации
import { Router } from "express";
import { prisma } from "../prisma";
import { checkExamAnswerWithAI } from "../services/examAiService";

const router = Router();

// Получить контрольную по публичному токену (для студентов)
router.get("/:token", async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { publicToken: req.params.token },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            type: true,
            content: true,
            imageUrl: true,
            options: true,
            points: true,
            // НЕ возвращаем correctAnswer, keyPoints, expectedAnswer!
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    // Проверяем статус
    if (exam.status !== 'PUBLISHED') {
      return res.status(403).json({ message: "Контрольная недоступна для прохождения" });
    }

    // Проверяем даты доступности
    const now = new Date();
    if (exam.startDate && now < exam.startDate) {
      return res.status(403).json({ 
        message: "Контрольная ещё не началась",
        startDate: exam.startDate 
      });
    }
    if (exam.endDate && now > exam.endDate) {
      return res.status(403).json({ message: "Время прохождения контрольной истекло" });
    }

    // Перемешиваем вопросы если нужно
    let questions = exam.questions;
    if (exam.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Перемешиваем варианты если нужно
    if (exam.shuffleOptions) {
      questions = questions.map(q => {
        if (q.options && Array.isArray(q.options)) {
          return {
            ...q,
            options: [...(q.options as any[])].sort(() => Math.random() - 0.5)
          };
        }
        return q;
      });
    }

    return res.json({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      subject: exam.subject,
      timeLimit: exam.timeLimit,
      totalQuestions: exam.questions.length,
      totalPoints: exam.questions.reduce((sum, q) => sum + q.points, 0),
      questions
    });
  } catch (error) {
    console.error("Error fetching public exam:", error);
    return res.status(500).json({ message: "Ошибка при получении контрольной" });
  }
});

// Начать прохождение контрольной
router.post("/:token/start", async (req, res) => {
  try {
    const { studentName, studentClass, studentEmail } = req.body;

    if (!studentName) {
      return res.status(400).json({ message: "Укажите ваше имя" });
    }

    const exam = await prisma.exam.findUnique({
      where: { publicToken: req.params.token },
      include: { questions: true }
    });

    if (!exam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    if (exam.status !== 'PUBLISHED') {
      return res.status(403).json({ message: "Контрольная недоступна для прохождения" });
    }

    // Проверяем даты
    const now = new Date();
    if (exam.startDate && now < exam.startDate) {
      return res.status(403).json({ message: "Контрольная ещё не началась" });
    }
    if (exam.endDate && now > exam.endDate) {
      return res.status(403).json({ message: "Время прохождения контрольной истекло" });
    }

    // Создаём submission
    const submission = await prisma.examSubmission.create({
      data: {
        examId: exam.id,
        studentName,
        studentClass: studentClass || null,
        studentEmail: studentEmail || null,
        maxScore: exam.questions.reduce((sum, q) => sum + q.points, 0)
      }
    });

    return res.status(201).json({
      submissionId: submission.id,
      startedAt: submission.startedAt,
      timeLimit: exam.timeLimit
    });
  } catch (error) {
    console.error("Error starting exam:", error);
    return res.status(500).json({ message: "Ошибка при начале контрольной" });
  }
});

// Отправить ответы на контрольную
router.post("/:token/submit", async (req, res) => {
  try {
    const { submissionId, answers } = req.body;

    if (!submissionId || !answers) {
      return res.status(400).json({ message: "Отсутствуют обязательные данные" });
    }

    const submission = await prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: { exam: { include: { questions: true } } }
    });

    if (!submission) {
      return res.status(404).json({ message: "Прохождение не найдено" });
    }

    if (submission.submittedAt) {
      return res.status(400).json({ message: "Контрольная уже сдана" });
    }

    // Проверяем время если есть лимит
    if (submission.exam.timeLimit) {
      const timeSpent = (Date.now() - new Date(submission.startedAt).getTime()) / 1000 / 60;
      if (timeSpent > submission.exam.timeLimit + 1) { // +1 минута на погрешность
        return res.status(400).json({ message: "Время истекло" });
      }
    }

    // Обрабатываем каждый ответ
    const examAnswers = [];
    let totalScore = 0;
    let maxScore = 0;
    const needsAiReview: string[] = [];

    for (const answer of answers) {
      const question = submission.exam.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      maxScore += question.points;

      let score = 0;
      let isCorrect: boolean | null = null;

      // Автоматическая проверка для выборочных вопросов
      if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(question.type)) {
        const correctAnswer = question.correctAnswer;
        const studentAnswer = answer.answer;

        if (question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE') {
          isCorrect = correctAnswer === studentAnswer;
          score = isCorrect ? question.points : 0;
        } else if (question.type === 'MULTIPLE_CHOICE') {
          // Для множественного выбора проверяем совпадение массивов
          const correct = Array.isArray(correctAnswer) ? correctAnswer.sort() : [correctAnswer];
          const student = Array.isArray(studentAnswer) ? studentAnswer.sort() : [studentAnswer];
          
          isCorrect = JSON.stringify(correct) === JSON.stringify(student);
          
          if (isCorrect) {
            score = question.points;
          } else if (question.partialCredit) {
            // Частичный зачёт
            const correctSet = new Set(correct);
            const correctCount = student.filter((a: string) => correctSet.has(a)).length;
            const wrongCount = student.filter((a: string) => !correctSet.has(a)).length;
            score = Math.max(0, ((correctCount - wrongCount) / correct.length) * question.points);
          }
        }
      } else if (['TEXT_SHORT'].includes(question.type)) {
        // Короткий текст - проверка на точное совпадение или ключевые слова
        const expectedAnswer = question.expectedAnswer?.toLowerCase().trim();
        const studentAnswer = answer.answer?.toLowerCase().trim();
        
        if (expectedAnswer && studentAnswer) {
          isCorrect = expectedAnswer === studentAnswer;
          score = isCorrect ? question.points : 0;
        }

        if ((!isCorrect || score === 0) && studentAnswer) {
          const aiResult = await checkExamAnswerWithAI(
            question.content,
            question.expectedAnswer || '',
            answer.answer || '',
            (question.keyPoints as string[]) || [],
            question.points,
            question.type
          );
          score = aiResult.score;
          isCorrect = aiResult.score >= (question.points * 0.6);
        }
      } else if (['TEXT_LONG', 'PROBLEM'].includes(question.type)) {
        // Открытые вопросы и задачи - нужна AI проверка
        needsAiReview.push(answer.questionId);
      }

      totalScore += score;

      examAnswers.push({
        submissionId: submission.id,
        questionId: question.id,
        answer: typeof answer.answer === 'object' ? JSON.stringify(answer.answer) : answer.answer,
        score,
        maxScore: question.points,
        isCorrect,
        aiChecked: false,
        manualChecked: false
      });
    }

    // Сохраняем ответы
    await prisma.examAnswer.createMany({
      data: examAnswers
    });

    // Обновляем submission
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    await prisma.examSubmission.update({
      where: { id: submission.id },
      data: {
        submittedAt: new Date(),
        totalScore,
        maxScore,
        percentage,
        passed: percentage >= submission.exam.passingScore,
        aiReviewCompleted: needsAiReview.length === 0
      }
    });

    // Запускаем AI проверку асинхронно для открытых вопросов
    if (needsAiReview.length > 0) {
      // Не ждём завершения - проверка идёт в фоне
      processAiReview(submission.id, needsAiReview).catch(err => {
        console.error("AI Review error:", err);
      });
    }

    // Возвращаем результат если настроено показывать
    if (submission.exam.showResults) {
      const finalSubmission = await prisma.examSubmission.findUnique({
        where: { id: submission.id },
        include: {
          answers: {
            include: { question: true }
          }
        }
      });

      return res.json({
        message: "Контрольная успешно сдана!",
        result: {
          totalScore,
          maxScore,
          percentage,
          passed: percentage >= submission.exam.passingScore,
          answers: finalSubmission?.answers.map(a => ({
            questionId: a.questionId,
            content: a.question.content,
            type: a.question.type,
            yourAnswer: a.answer,
            isCorrect: a.isCorrect,
            score: a.score,
            maxScore: a.maxScore,
            explanation: a.question.explanation,
            needsAiReview: ['TEXT_LONG', 'PROBLEM'].includes(a.question.type) && !a.aiChecked
          }))
        },
        pendingAiReview: needsAiReview.length > 0
      });
    }

    return res.json({
      message: "Контрольная успешно сдана!",
      submissionId: submission.id
    });
  } catch (error) {
    console.error("Error submitting exam:", error);
    return res.status(500).json({ message: "Ошибка при отправке ответов" });
  }
});

// Получить результат по ID прохождения
router.get("/result/:submissionId", async (req, res) => {
  try {
    const submission = await prisma.examSubmission.findUnique({
      where: { id: req.params.submissionId },
      include: {
        exam: {
          select: {
            title: true,
            subject: true,
            showResults: true,
            passingScore: true
          }
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                orderIndex: true,
                type: true,
                content: true,
                explanation: true,
                points: true
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ message: "Результат не найден" });
    }

    if (!submission.exam.showResults) {
      return res.json({
        title: submission.exam.title,
        subject: submission.exam.subject,
        studentName: submission.studentName,
        message: "Результаты будут доступны после проверки учителем"
      });
    }

    return res.json({
      title: submission.exam.title,
      subject: submission.exam.subject,
      studentName: submission.studentName,
      studentClass: submission.studentClass,
      submittedAt: submission.submittedAt,
      totalScore: submission.totalScore,
      maxScore: submission.maxScore,
      percentage: submission.percentage,
      passed: submission.passed,
      aiReviewCompleted: submission.aiReviewCompleted,
      answers: submission.answers.map(a => ({
        orderIndex: a.question.orderIndex,
        type: a.question.type,
        content: a.question.content,
        yourAnswer: a.answer,
        isCorrect: a.isCorrect,
        score: a.score,
        maxScore: a.maxScore,
        explanation: a.question.explanation,
        aiFeedback: a.aiFeedback,
        manualFeedback: a.manualFeedback
      }))
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    return res.status(500).json({ message: "Ошибка при получении результата" });
  }
});

// Вспомогательная функция для AI проверки
async function processAiReview(submissionId: string, questionIds: string[]) {
  const submission = await prisma.examSubmission.findUnique({
    where: { id: submissionId },
    include: {
      answers: {
        where: { questionId: { in: questionIds } },
        include: { question: true }
      },
      exam: true
    }
  });

  if (!submission) return;

  for (const answer of submission.answers) {
    try {
      const aiResult = await checkExamAnswerWithAI(
        answer.question.content,
        answer.question.expectedAnswer || '',
        answer.answer || '',
        answer.question.keyPoints as string[] || [],
        answer.question.points,
        answer.question.type
      );

      await prisma.examAnswer.update({
        where: { id: answer.id },
        data: {
          aiScore: aiResult.score,
          aiFeedback: aiResult.feedback,
          aiChecked: true,
          score: aiResult.score, // Устанавливаем балл от AI
          isCorrect: aiResult.score >= (answer.maxScore * 0.6) // 60%+ считаем правильным
        }
      });
    } catch (err) {
      console.error(`AI review failed for answer ${answer.id}:`, err);
    }
  }

  // Пересчитываем общий балл
  const updatedSubmission = await prisma.examSubmission.findUnique({
    where: { id: submissionId },
    include: { answers: true, exam: true }
  });

  if (updatedSubmission) {
    const totalScore = updatedSubmission.answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const maxScore = updatedSubmission.answers.reduce((sum, a) => sum + a.maxScore, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    await prisma.examSubmission.update({
      where: { id: submissionId },
      data: {
        totalScore,
        percentage,
        passed: percentage >= updatedSubmission.exam.passingScore,
        aiReviewCompleted: true
      }
    });
  }
}

export default router;
