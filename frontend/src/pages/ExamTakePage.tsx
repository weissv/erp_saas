// src/pages/ExamTakePage.tsx
// Публичная страница прохождения контрольной для студентов
import { useState, useEffect, useCallback} from"react";
import { useParams} from"react-router-dom";
import {
 Clock,
 CheckCircle,
 XCircle,
 AlertTriangle,
 Send,
 ChevronLeft,
 ChevronRight,
 FileText,
 Award,
} from"lucide-react";
import { publicExamsApi} from"../lib/exams-api";
import { PublicExam, PublicExamQuestion, ExamStartResponse, ExamResult} from"../types/exam";
import { toast} from"sonner";

type Stage ="intro"|"taking"|"completed";

export default function ExamTakePage() {
 const { token} = useParams<{ token: string}>();
 
 const [stage, setStage] = useState<Stage>("intro");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 
 // Данные экзамена
 const [exam, setExam] = useState<PublicExam | null>(null);
 const [submission, setSubmission] = useState<ExamStartResponse | null>(null);
 
 // Форма студента
 const [studentName, setStudentName] = useState("");
 const [studentClass, setStudentClass] = useState("");
 
 // Ответы
 const [answers, setAnswers] = useState<Record<string, any>>({});
 const [currentQuestion, setCurrentQuestion] = useState(0);
 
 // Таймер
 const [timeLeft, setTimeLeft] = useState<number | null>(null);
 
 // Результат
 const [result, setResult] = useState<ExamResult | null>(null);

 // Загрузка экзамена
 useEffect(() => {
 if (!token) return;
 loadExam();
}, [token]);

 const loadExam = async () => {
 setLoading(true);
 setError(null);
 try {
 const data = await publicExamsApi.getExam(token!);
 setExam(data);
} catch (err: any) {
 setError(err.message ||"Контрольная недоступна");
} finally {
 setLoading(false);
}
};

 // Таймер
 useEffect(() => {
 if (stage !=="taking"|| !submission?.timeLimit) return;
 
 const startTime = new Date(submission.startedAt).getTime();
 const endTime = startTime + submission.timeLimit * 60 * 1000;
 
 const interval = setInterval(() => {
 const now = Date.now();
 const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
 setTimeLeft(remaining);
 
 if (remaining <= 0) {
 clearInterval(interval);
 handleSubmit();
}
}, 1000);
 
 return () => clearInterval(interval);
}, [stage, submission]);

 // Начать экзамен
 const handleStart = async () => {
 if (!studentName.trim()) {
 toast.error("Введите ваше имя");
 return;
}
 
 setLoading(true);
 try {
 const response = await publicExamsApi.startExam(token!, {
 studentName: studentName.trim(),
 studentClass: studentClass.trim() || undefined,
});
 setSubmission(response);
 setStage("taking");
 if (response.timeLimit) {
 setTimeLeft(response.timeLimit * 60);
}
} catch (err: any) {
 toast.error(err.message ||"Не удалось начать контрольную");
} finally {
 setLoading(false);
}
};

 // Отправить ответы
 const handleSubmit = async () => {
 if (!submission || !exam) return;
 
 const unanswered = exam.questions.filter(q => !answers[q.id]);
 if (unanswered.length > 0) {
 const confirm = window.confirm(
 `У вас ${unanswered.length} вопросов без ответа. Всё равно отправить?`
 );
 if (!confirm) return;
}
 
 setLoading(true);
 try {
 const formattedAnswers = exam.questions.map(q => ({
 questionId: q.id,
 answer: answers[q.id] ?? null,
}));
 
 const response = await publicExamsApi.submitExam(token!, {
 submissionId: submission.submissionId,
 answers: formattedAnswers,
});
 
 setResult(response);
 setStage("completed");
 toast.success("Контрольная сдана!");
} catch (err: any) {
 toast.error(err.message ||"Ошибка при отправке");
} finally {
 setLoading(false);
}
};

 // Изменение ответа
 const setAnswer = useCallback((questionId: string, value: any) => {
 setAnswers(prev => ({ ...prev, [questionId]: value}));
}, []);

 // Форматирование времени
 const formatTime = (seconds: number) => {
 const m = Math.floor(seconds / 60);
 const s = seconds % 60;
 return `${m}:${s.toString().padStart(2,"0")}`;
};

 // Экран загрузки
 if (loading && !exam) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-fill-quaternary">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
 </div>
 );
}

 // Экран ошибки
 if (error) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-fill-quaternary p-4">
 <div className="bg-white rounded-xl shadow-subtle border border-card p-8 max-w-md text-center">
 <AlertTriangle className="h-16 w-16 text-macos-orange mx-auto mb-4"/>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary mb-2">Контрольная недоступна</h1>
 <p className="text-secondary">{error}</p>
 </div>
 </div>
 );
}

 // Начальный экран
 if (stage ==="intro"&& exam) {
 return (
 <div className="min-h-screen bg-fill-quaternary py-8 px-4">
 <div className="max-w-xl mx-auto">
 <div className="bg-white rounded-xl shadow-subtle border border-card p-8">
 <div className="text-center mb-8">
 <FileText className="h-16 w-16 text-macos-blue mx-auto mb-4"/>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary mb-2">{exam.title}</h1>
 {exam.subject && <p className="text-macos-blue font-medium">{exam.subject}</p>}
 </div>

 {exam.description && (
 <div className="bg-fill-quaternary rounded-lg p-4 mb-6">
 <p className="text-secondary">{exam.description}</p>
 </div>
 )}

 <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
 <div className="bg-fill-quaternary rounded-lg p-4 text-center">
 <p className="text-secondary">Вопросов</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">{exam.totalQuestions}</p>
 </div>
 <div className="bg-fill-quaternary rounded-lg p-4 text-center">
 <p className="text-secondary">Всего баллов</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">{exam.totalPoints}</p>
 </div>
 {exam.timeLimit && (
 <div className="col-span-2 bg-[rgba(255,204,0,0.06)] rounded-lg p-4 text-center">
 <Clock className="h-5 w-5 text-macos-orange mx-auto mb-1"/>
 <p className="text-macos-orange font-medium">
 Ограничение времени: {exam.timeLimit} минут
 </p>
 </div>
 )}
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Ваше имя <span className="text-macos-red">*</span>
 </label>
 <input
 type="text"
 value={studentName}
 onChange={(e) => setStudentName(e.target.value)}
 placeholder="Иванов Иван"
 className="w-full px-4 py-3 mezon-field rounded-lg focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Класс / Группа
 </label>
 <input
 type="text"
 value={studentClass}
 onChange={(e) => setStudentClass(e.target.value)}
 placeholder="10-А"
 className="w-full px-4 py-3 mezon-field rounded-lg focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 />
 </div>
 </div>

 <button
 onClick={handleStart}
 disabled={loading || !studentName.trim()}
 className="w-full mt-6 px-6 py-3 bg-macos-blue text-white rounded-lg font-medium hover:bg-macos-blue disabled:opacity-50 disabled:cursor-not-allowed macos-transition"
 >
 {loading ?"Загрузка...":"Начать контрольную"}
 </button>
 </div>
 </div>
 </div>
 );
}

 // Экран прохождения
 if (stage ==="taking"&& exam) {
 const question = exam.questions[currentQuestion];
 const progress = Object.keys(answers).length;

 return (
 <div className="min-h-screen bg-fill-quaternary flex flex-col">
 {/* Шапка с таймером */}
 <header className="bg-white shadow-sm py-4 px-6 sticky top-0 z-10">
 <div className="max-w-4xl mx-auto flex items-center justify-between">
 <div>
 <h1 className="font-semibold text-primary truncate">{exam.title}</h1>
 <p className="text-sm text-secondary">
 Вопрос {currentQuestion + 1} из {exam.totalQuestions}
 </p>
 </div>
 <div className="flex items-center gap-4">
 <span className="text-sm text-secondary">
 Отвечено: {progress}/{exam.totalQuestions}
 </span>
 {timeLeft !== null && (
 <div
 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
 timeLeft < 300 ?"bg-[rgba(255,59,48,0.12)] text-macos-red":"bg-fill-tertiary text-primary"
}`}
 >
 <Clock className="h-4 w-4"/>
 <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
 </div>
 )}
 </div>
 </div>
 </header>

 {/* Прогресс бар */}
 <div className="bg-white border-b">
 <div className="max-w-4xl mx-auto px-6">
 <div className="flex gap-1 py-2 overflow-x-auto">
 {exam.questions.map((q, i) => (
 <button
 key={q.id}
 onClick={() => setCurrentQuestion(i)}
 className={`min-w-[32px] h-8 text-xs font-medium rounded ${
 i === currentQuestion
 ?"bg-macos-blue text-white"
 : answers[q.id]
 ?"bg-tint-blue text-macos-blue"
 :"bg-fill-tertiary text-secondary hover:bg-fill-secondary"
}`}
 >
 {i + 1}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Вопрос */}
 <main className="flex-1 py-8 px-4">
 <div className="max-w-2xl mx-auto">
 <QuestionView
 question={question}
 value={answers[question.id]}
 onChange={(value) => setAnswer(question.id, value)}
 />
 </div>
 </main>

 {/* Навигация */}
 <footer className="bg-white border-t py-4 px-6 sticky bottom-0">
 <div className="max-w-4xl mx-auto flex items-center justify-between">
 <button
 onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
 disabled={currentQuestion === 0}
 className="flex items-center gap-2 px-4 py-2 text-primary bg-fill-tertiary rounded-lg hover:bg-fill-secondary disabled:opacity-50"
 >
 <ChevronLeft className="h-5 w-5"/>
 Назад
 </button>

 {currentQuestion < exam.totalQuestions - 1 ? (
 <button
 onClick={() => setCurrentQuestion(currentQuestion + 1)}
 className="flex items-center gap-2 px-4 py-2 text-white bg-macos-blue rounded-lg hover:bg-macos-blue"
 >
 Далее
 <ChevronRight className="h-5 w-5"/>
 </button>
 ) : (
 <button
 onClick={handleSubmit}
 disabled={loading}
 className="flex items-center gap-2 px-6 py-2 text-white bg-macos-green rounded-lg hover:bg-macos-green disabled:opacity-50"
 >
 <Send className="h-5 w-5"/>
 {loading ?"Отправка...":"Завершить и отправить"}
 </button>
 )}
 </div>
 </footer>
 </div>
 );
}

 // Экран результатов
 if (stage ==="completed"&& result) {
 return (
 <div className="min-h-screen bg-fill-quaternary py-8 px-4">
 <div className="max-w-2xl mx-auto">
 <div className="bg-white rounded-xl shadow-subtle border border-card p-8 text-center mb-6">
 <Award
 className={`h-20 w-20 mx-auto mb-4 ${
 result.result?.passed ?"text-macos-green":"text-macos-orange"
}`}
 />
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary mb-2">
 {result.result?.passed ?"Поздравляем!":"Контрольная завершена"}
 </h1>
 <p className="text-secondary mb-6">{result.message}</p>

 {result.result && (
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="bg-fill-quaternary rounded-lg p-4">
 <p className="text-sm text-secondary">Набрано баллов</p>
 <p className="text-3xl font-bold text-primary">
 {result.result.totalScore}
 <span className="text-lg text-tertiary">/{result.result.maxScore}</span>
 </p>
 </div>
 <div className="bg-fill-quaternary rounded-lg p-4">
 <p className="text-sm text-secondary">Процент</p>
 <p className="text-3xl font-bold text-primary">
 {Math.round(result.result.percentage)}%
 </p>
 </div>
 <div className="bg-fill-quaternary rounded-lg p-4">
 <p className="text-sm text-secondary">Результат</p>
 <p
 className={`text-[24px] font-bold tracking-[-0.025em] leading-tight ${
 result.result.passed ?"text-macos-green":"text-macos-red"
}`}
 >
 {result.result.passed ?"Зачёт":"Незачёт"}
 </p>
 </div>
 </div>
 )}

 {result.pendingAiReview && (
 <div className="bg-[rgba(255,204,0,0.06)] text-macos-orange rounded-lg p-4 text-sm">
 <AlertTriangle className="h-5 w-5 inline-block mr-2"/>
 Некоторые ответы ожидают проверки AI. Результат может измениться.
 </div>
 )}
 </div>

 {/* Детальные результаты */}
 {result.result?.answers && (
 <div className="bg-white rounded-xl shadow-subtle border border-card overflow-hidden">
 <div className="p-4 border-b bg-fill-quaternary">
 <h2 className="font-semibold text-primary">Детальные результаты</h2>
 </div>
 <div className="divide-y">
 {result.result.answers.map((answer, i) => (
 <div key={answer.questionId} className="p-4">
 <div className="flex items-start gap-3">
 <span
 className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
 answer.isCorrect === true
 ?"bg-[rgba(52,199,89,0.12)] text-macos-green"
 : answer.isCorrect === false
 ?"bg-[rgba(255,59,48,0.12)] text-macos-red"
 :"bg-[rgba(255,204,0,0.12)] text-macos-orange"
}`}
 >
 {answer.isCorrect === true ? (
 <CheckCircle className="h-5 w-5"/>
 ) : answer.isCorrect === false ? (
 <XCircle className="h-5 w-5"/>
 ) : (
 <Clock className="h-5 w-5"/>
 )}
 </span>
 <div className="flex-1">
 <p className="font-medium text-primary mb-1">
 {i + 1}. {answer.content}
 </p>
 <p className="text-sm text-secondary mb-1">
 Ваш ответ: {String(answer.yourAnswer ||"—")}
 </p>
 <p className="text-sm">
 <span className="text-secondary">Баллы: </span>
 <span className="font-medium">
 {answer.score}/{answer.maxScore}
 </span>
 </p>
 {answer.needsAiReview && (
 <p className="text-sm text-macos-orange mt-1">
 ⏳ Ожидает проверки AI
 </p>
 )}
 {answer.explanation && (
 <p className="text-sm text-secondary mt-2 bg-fill-quaternary p-2 rounded">
 💡 {answer.explanation}
 </p>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}

 return null;
}

// Компонент отображения вопроса
function QuestionView({
 question,
 value,
 onChange,
}: {
 question: PublicExamQuestion;
 value: any;
 onChange: (value: any) => void;
}) {
 return (
 <div className="bg-white rounded-xl shadow-subtle border border-card p-6">
 <div className="flex items-center gap-2 text-sm text-secondary mb-4">
 <span className="px-2 py-1 bg-fill-tertiary rounded">
 {question.points} {question.points === 1 ?"балл":"баллов"}
 </span>
 </div>

 <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-primary mb-6">{question.content}</h2>

 {question.imageUrl && (
 <img
 src={question.imageUrl}
 alt="К вопросу"
 className="max-w-full h-auto rounded-lg mb-6"
 />
 )}

 {/* Один вариант ответа */}
 {question.type ==="SINGLE_CHOICE"&& (
 <div className="space-y-3">
 {(question.options || []).map((option, i) => (
 <label
 key={i}
 className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer macos-transition ${
 value === option
 ?"border-teal-500 bg-tint-blue"
 :"border-[rgba(0,0,0,0.08)] hover:border-field"
}`}
 >
 <input
 type="radio"
 name="answer"
 value={option}
 checked={value === option}
 onChange={() => onChange(option)}
 className="text-macos-blue focus:ring-macos-blue/30"
 />
 <span className="text-primary">{option}</span>
 </label>
 ))}
 </div>
 )}

 {/* Несколько вариантов */}
 {question.type ==="MULTIPLE_CHOICE"&& (
 <div className="space-y-3">
 {(question.options || []).map((option, i) => {
 const selected = Array.isArray(value) ? value.includes(option) : false;
 return (
 <label
 key={i}
 className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer macos-transition ${
 selected
 ?"border-teal-500 bg-tint-blue"
 :"border-[rgba(0,0,0,0.08)] hover:border-field"
}`}
 >
 <input
 type="checkbox"
 checked={selected}
 onChange={(e) => {
 const current = Array.isArray(value) ? value : [];
 if (e.target.checked) {
 onChange([...current, option]);
} else {
 onChange(current.filter((v: string) => v !== option));
}
}}
 className="rounded text-macos-blue focus:ring-macos-blue/30"
 />
 <span className="text-primary">{option}</span>
 </label>
 );
})}
 </div>
 )}

 {/* Да/Нет */}
 {question.type ==="TRUE_FALSE"&& (
 <div className="grid grid-cols-2 gap-4">
 {["Верно","Неверно"].map((option) => (
 <button
 key={option}
 onClick={() => onChange(option)}
 className={`p-4 border rounded-lg font-medium macos-transition ${
 value === option
 ?"border-teal-500 bg-tint-blue text-macos-blue"
 :"border-[rgba(0,0,0,0.08)] text-primary hover:border-field"
}`}
 >
 {option}
 </button>
 ))}
 </div>
 )}

 {/* Короткий текстовый ответ */}
 {question.type ==="TEXT_SHORT"&& (
 <input
 type="text"
 value={value ||""}
 onChange={(e) => onChange(e.target.value)}
 placeholder="Введите ваш ответ..."
 className="w-full px-4 py-3 mezon-field rounded-lg focus-visible:ring-4 focus-visible:ring-macos-blue/30 focus:border-transparent"
 />
 )}

 {/* Развёрнутый ответ */}
 {(question.type ==="TEXT_LONG"|| question.type ==="PROBLEM") && (
 <textarea
 value={value ||""}
 onChange={(e) => onChange(e.target.value)}
 placeholder={
 question.type ==="PROBLEM"
 ?"Напишите решение задачи..."
 :"Введите развёрнутый ответ..."
}
 rows={8}
 className="w-full px-4 py-3 mezon-field rounded-lg focus-visible:ring-4 focus-visible:ring-macos-blue/30 focus:border-transparent"
 />
 )}
 </div>
 );
}
