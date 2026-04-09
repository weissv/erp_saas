// src/routes/exams.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { authMiddleware } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

const router = Router();

// =============================================================================
// ЗАЩИЩЁННЫЕ РОУТЫ (для учителей, завучей, директоров)
// =============================================================================

// Получить все контрольные созданные текущим пользователем
router.get("/", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const exams = await prisma.exam.findMany({
      where: { creatorId: user.employeeId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, orderIndex: true, type: true, points: true }
        },
        submissions: {
          select: { id: true, studentName: true, submittedAt: true, percentage: true, passed: true }
        },
        targetGroups: true,
        _count: { select: { questions: true, submissions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Добавляем статистику
    const examsWithStats = exams.map(exam => ({
      ...exam,
      totalQuestions: exam.questions.length,
      totalSubmissions: exam.submissions.length,
      averageScore: exam.submissions.length > 0 
        ? exam.submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / exam.submissions.length
        : null,
      publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/exam/${exam.publicToken}`
    }));

    return res.json(examsWithStats);
  } catch (error) {
    console.error("Error fetching exams:", error);
    return res.status(500).json({ message: "Ошибка при получении контрольных" });
  }
});

// Создать новую контрольную
router.post("/", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const { 
      title, 
      description, 
      subject,
      timeLimit,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      startDate,
      endDate,
      targetGroupIds,
      questions 
    } = req.body;

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        subject,
        creatorId: user.employeeId,
        timeLimit: timeLimit || null,
        passingScore: passingScore || 60,
        shuffleQuestions: shuffleQuestions || false,
        shuffleOptions: shuffleOptions || false,
        showResults: showResults !== false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'DRAFT',
        targetGroups: targetGroupIds ? {
          create: targetGroupIds.map((groupId: number) => ({ groupId }))
        } : undefined,
        questions: questions ? {
          create: questions.map((q: any, index: number) => ({
            orderIndex: index + 1,
            type: q.type,
            content: q.content,
            explanation: q.explanation || null,
            imageUrl: q.imageUrl || null,
            options: q.options || null,
            correctAnswer: q.correctAnswer || null,
            keyPoints: q.keyPoints || null,
            expectedAnswer: q.expectedAnswer || null,
            points: q.points || 1,
            partialCredit: q.partialCredit || false
          }))
        } : undefined
      },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        targetGroups: true
      }
    });

    return res.status(201).json({
      ...exam,
      publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/exam/${exam.publicToken}`
    });
  } catch (error) {
    console.error("Error creating exam:", error);
    return res.status(500).json({ message: "Ошибка при создании контрольной" });
  }
});

// Получить одну контрольную по ID
router.get("/:id", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        submissions: {
          include: {
            answers: true
          },
          orderBy: { submittedAt: 'desc' }
        },
        targetGroups: true
      }
    });

    if (!exam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    // Проверяем что это контрольная пользователя
    if (exam.creatorId !== user.employeeId && !['DIRECTOR', 'DEPUTY', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: "Нет доступа к этой контрольной" });
    }

    return res.json({
      ...exam,
      publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/exam/${exam.publicToken}`
    });
  } catch (error) {
    console.error("Error fetching exam:", error);
    return res.status(500).json({ message: "Ошибка при получении контрольной" });
  }
});

// Обновить контрольную
router.put("/:id", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const existingExam = await prisma.exam.findUnique({
      where: { id: req.params.id }
    });

    if (!existingExam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    // Проверяем доступ
    if (existingExam.creatorId !== user.employeeId && !['DIRECTOR', 'DEPUTY', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: "Нет доступа к этой контрольной" });
    }

    const { 
      title, 
      description, 
      subject,
      timeLimit,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      startDate,
      endDate,
      status,
      targetGroupIds,
      questions 
    } = req.body;

    // Если передан массив вопросов, обновляем их
    if (questions) {
      // Удаляем старые вопросы
      await prisma.examQuestion.deleteMany({
        where: { examId: req.params.id }
      });
    }

    // Если переданы группы, обновляем их
    if (targetGroupIds) {
      await prisma.examTargetGroup.deleteMany({
        where: { examId: req.params.id }
      });
    }

    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        subject,
        timeLimit: timeLimit !== undefined ? timeLimit : undefined,
        passingScore: passingScore !== undefined ? passingScore : undefined,
        shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : undefined,
        shuffleOptions: shuffleOptions !== undefined ? shuffleOptions : undefined,
        showResults: showResults !== undefined ? showResults : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        status: status || undefined,
        targetGroups: targetGroupIds ? {
          create: targetGroupIds.map((groupId: number) => ({ groupId }))
        } : undefined,
        questions: questions ? {
          create: questions.map((q: any, index: number) => ({
            orderIndex: index + 1,
            type: q.type,
            content: q.content,
            explanation: q.explanation || null,
            imageUrl: q.imageUrl || null,
            options: q.options || null,
            correctAnswer: q.correctAnswer || null,
            keyPoints: q.keyPoints || null,
            expectedAnswer: q.expectedAnswer || null,
            points: q.points || 1,
            partialCredit: q.partialCredit || false
          }))
        } : undefined
      },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        targetGroups: true
      }
    });

    return res.json({
      ...exam,
      publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/exam/${exam.publicToken}`
    });
  } catch (error) {
    console.error("Error updating exam:", error);
    return res.status(500).json({ message: "Ошибка при обновлении контрольной" });
  }
});

// Получить детали одного прохождения
router.get(
  "/:examId/submissions/:submissionId",
  authMiddleware,
  checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]),
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { employee: true }
      });

      if (!user || !user.employee) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      const submission = await prisma.examSubmission.findUnique({
        where: { id: req.params.submissionId },
        include: {
          answers: { include: { question: true } },
          exam: true
        }
      });

      if (!submission || submission.examId !== req.params.examId) {
        return res.status(404).json({ message: "Прохождение не найдено" });
      }

      if (submission.exam.creatorId !== user.employeeId && !['DIRECTOR', 'DEPUTY', 'DEVELOPER'].includes(user.role)) {
        return res.status(403).json({ message: "Нет доступа к этой контрольной" });
      }

      return res.json(submission);
    } catch (error) {
      console.error("Error fetching submission details:", error);
      return res.status(500).json({ message: "Ошибка при получении деталей" });
    }
  }
);

// Удалить контрольную
router.delete("/:id", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const existingExam = await prisma.exam.findUnique({
      where: { id: req.params.id }
    });

    if (!existingExam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    // Проверяем доступ
    if (existingExam.creatorId !== user.employeeId && !['DIRECTOR', 'DEPUTY', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: "Нет доступа к этой контрольной" });
    }

    await prisma.exam.delete({
      where: { id: req.params.id }
    });

    return res.json({ message: "Контрольная удалена" });
  } catch (error) {
    console.error("Error deleting exam:", error);
    return res.status(500).json({ message: "Ошибка при удалении контрольной" });
  }
});

// Опубликовать контрольную
router.post("/:id/publish", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const existingExam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: { questions: true }
    });

    if (!existingExam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    // Проверяем доступ
    if (existingExam.creatorId !== user.employeeId && !['DIRECTOR', 'DEPUTY', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: "Нет доступа к этой контрольной" });
    }

    // Проверяем что есть вопросы
    if (existingExam.questions.length === 0) {
      return res.status(400).json({ message: "Нельзя опубликовать контрольную без вопросов" });
    }

    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' }
    });

    return res.json({
      ...exam,
      publicUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/exam/${exam.publicToken}`
    });
  } catch (error) {
    console.error("Error publishing exam:", error);
    return res.status(500).json({ message: "Ошибка при публикации контрольной" });
  }
});

// Закрыть контрольную
router.post("/:id/close", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const existingExam = await prisma.exam.findUnique({
      where: { id: req.params.id }
    });

    if (!existingExam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    // Проверяем доступ
    if (existingExam.creatorId !== user.employeeId && !['DIRECTOR', 'DEPUTY', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: "Нет доступа к этой контрольной" });
    }

    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' }
    });

    return res.json(exam);
  } catch (error) {
    console.error("Error closing exam:", error);
    return res.status(500).json({ message: "Ошибка при закрытии контрольной" });
  }
});

// Получить результаты контрольной
router.get("/:id/results", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        submissions: {
          include: {
            answers: {
              include: { question: true }
            }
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    // Проверяем доступ
    if (exam.creatorId !== user.employeeId && !['DIRECTOR', 'DEPUTY', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: "Нет доступа к этой контрольной" });
    }

    const total = exam.submissions.length;
    const passed = exam.submissions.filter(s => s.passed).length;
    const avgScore = total > 0
      ? exam.submissions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / total
      : 0;
    const avgPercentage = total > 0
      ? exam.submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / total
      : 0;

    const questionStats = exam.questions.map(q => {
      const questionAnswers = exam.submissions.flatMap(s => s.answers.filter(a => a.questionId === q.id));
      const correctCount = questionAnswers.filter(a => a.isCorrect).length;
      return {
        questionId: q.id,
        orderIndex: q.orderIndex,
        type: q.type,
        totalAnswers: questionAnswers.length,
        correctAnswers: correctCount,
        correctRate: questionAnswers.length > 0 ? (correctCount / questionAnswers.length) * 100 : null,
        averageScore: questionAnswers.length > 0
          ? questionAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / questionAnswers.length
          : null
      };
    });

    return res.json({
      exam,
      submissions: exam.submissions,
      stats: {
        total,
        completed: total,
        passed,
        avgScore,
        avgPercentage,
        questionStats,
      },
    });
  } catch (error) {
    console.error("Error fetching exam results:", error);
    return res.status(500).json({ message: "Ошибка при получении результатов" });
  }
});

// Ручная оценка ответа
router.post("/answers/:answerId/grade", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const { score, feedback } = req.body;

    const answer = await prisma.examAnswer.update({
      where: { id: req.params.answerId },
      data: {
        manualScore: score,
        manualFeedback: feedback,
        manualChecked: true,
        score: score // Перезаписываем автоматический балл
      }
    });

    // Пересчитываем общий балл submission
    const submission = await prisma.examSubmission.findUnique({
      where: { id: answer.submissionId },
      include: { answers: true, exam: true }
    });

    if (submission) {
      const totalScore = submission.answers.reduce((sum, a) => sum + (a.score || 0), 0);
      const maxScore = submission.answers.reduce((sum, a) => sum + a.maxScore, 0);
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      await prisma.examSubmission.update({
        where: { id: submission.id },
        data: {
          totalScore,
          maxScore,
          percentage,
          passed: percentage >= submission.exam.passingScore
        }
      });
    }

    return res.json(answer);
  } catch (error) {
    console.error("Error grading answer:", error);
    return res.status(500).json({ message: "Ошибка при оценке ответа" });
  }
});

// Экспорт результатов в Excel (CSV)
router.get("/:id/export", authMiddleware, checkRole(["DIRECTOR", "DEPUTY", "TEACHER", "DEVELOPER"]), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        submissions: {
          include: {
            answers: {
              include: { question: true }
            }
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({ message: "Контрольная не найдена" });
    }

    // Проверяем доступ
    if (exam.creatorId !== user.employeeId && !['DIRECTOR', 'DEPUTY', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: "Нет доступа к этой контрольной" });
    }

    // Формируем CSV
    const BOM = '\uFEFF'; // Для корректного отображения кириллицы в Excel
    const delimiter = ';'; // Точка с запятой лучше работает в Excel
    
    // Заголовки
    const questionHeaders = exam.questions.map((q: { points: number }, i: number) => `Вопрос ${i + 1} (${q.points} б.)`);
    const headers = [
      'ФИО',
      'Группа/Класс',
      'Дата сдачи',
      'Время (мин)',
      ...questionHeaders,
      'Набрано баллов',
      'Максимум баллов',
      'Процент',
      'Результат'
    ];
    
    // Данные
    const rows = exam.submissions.map((sub: any) => {
      const duration = sub.startedAt && sub.submittedAt 
        ? Math.round((new Date(sub.submittedAt).getTime() - new Date(sub.startedAt).getTime()) / 60000)
        : '-';
      
      // Баллы за каждый вопрос
      const questionScores = exam.questions.map((q: { id: string }) => {
        const answer = sub.answers.find((a: any) => a.questionId === q.id);
        return answer ? `${answer.score || 0}` : '0';
      });
      
      return [
        sub.studentName || 'Аноним',
        sub.studentClass || '-',
        sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ru-RU') : '-',
        duration.toString(),
        ...questionScores,
        (sub.totalScore || 0).toString(),
        (sub.maxScore || 0).toString(),
        `${(sub.percentage || 0).toFixed(1)}%`,
        sub.passed ? 'Сдано' : 'Не сдано'
      ];
    });

    // Собираем CSV
    const csvContent = BOM + [
      headers.join(delimiter),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(delimiter))
    ].join('\n');

    // Отправляем файл
    const filename = `results_${exam.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    return res.send(csvContent);
  } catch (error) {
    console.error("Error exporting exam results:", error);
    return res.status(500).json({ message: "Ошибка при экспорте результатов" });
  }
});

export default router;
