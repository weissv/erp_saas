// src/pages/AiAssistantPage.tsx
import { useState, useEffect} from"react";
import ReactMarkdown from"react-markdown";
import { Send, Loader2, Bot, User, Sparkles, FileText, Trash2, Plus, FolderOpen, ExternalLink, RefreshCw, AlertTriangle} from"lucide-react";
import { useAuth} from"../hooks/useAuth";
import { api} from"../lib/api";
import { Modal} from"../components/Modal";
import { Button} from"../components/ui/button";

// Google Drive папка с базой знаний
const GOOGLE_DRIVE_FOLDER_ID ="1d9_a3NQ2hHioMJsaUJ53NIj-CS1rVeDd";
const GOOGLE_DRIVE_EMBED_URL = `https://drive.google.com/embeddedfolderview?id=${GOOGLE_DRIVE_FOLDER_ID}#list`;
const GOOGLE_DRIVE_LINK = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

interface ChatMessage {
 role:"user"|"assistant";
 content: string;
 thinking?: string; // Блок размышлений
 sources?: {
 id: number;
 content: string;
 metadata: {
 title?: string;
 subject?: string;
 grade?: string;
} | null;
 similarity?: number;
}[];
}

interface KnowledgeDocument {
 id: number;
 content: string;
 metadata: {
 title?: string;
 subject?: string;
 grade?: string;
 tags?: string[];
} | null;
 createdAt: string;
}

interface SyncStatus {
 isRunning: boolean;
 startedAt: string | null;
 progress: number;
 total: number;
 current: number;
 currentFile: string;
 synced: number;
 updated: number;
 skipped: number;
 errors: number;
 completedAt: string | null;
 error: string | null;
}

/**
 * Парсит ответ и извлекает блок <think>...</think>
 */
function parseThinkingBlock(response: string): { content: string; thinking: string | null} {
 const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
 const matches = response.match(thinkRegex);
 
 if (matches && matches.length > 0) {
 // Извлекаем содержимое think блоков
 const thinking = matches
 .map(m => m.replace(/<\/?think>/gi,"").trim())
 .join("\n\n");
 
 // Удаляем think блоки из основного контента
 const content = response.replace(thinkRegex,"").trim();
 
 return { content, thinking};
}
 
 return { content: response, thinking: null};
}

export default function AiAssistantPage() {
 const { user} = useAuth();
 const [messages, setMessages] = useState<ChatMessage[]>([]);
 const [inputValue, setInputValue] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const [activeTab, setActiveTab] = useState<"chat"|"knowledge">("chat");
 const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
 const [isLoadingDocs, setIsLoadingDocs] = useState(false);
 const [isSyncing, setIsSyncing] = useState(false);
 const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
 const [showAddDocModal, setShowAddDocModal] = useState(false);
 const [newDocContent, setNewDocContent] = useState("");
 const [newDocMetadata, setNewDocMetadata] = useState({
 title:"",
 subject:"",
 grade:"",
 tags:"",
});
 const [systemPrompt, setSystemPrompt] = useState("");
 const [isSavingPrompt, setIsSavingPrompt] = useState(false);
 const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});
 const [deleteConfirm, setDeleteConfirm] = useState<KnowledgeDocument | null>(null);
 const [isDeletingDoc, setIsDeletingDoc] = useState(false);
 const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
 const [resetPromptConfirmOpen, setResetPromptConfirmOpen] = useState(false);

 // Убрана автопрокрутка - страница не будет скроллиться автоматически

 useEffect(() => {
 if (activeTab ==="knowledge") {
 loadDocuments();
}
 if (activeTab ==="chat") {
 loadSystemPrompt();
}
}, [activeTab]);

 // Загрузка системного промта при старте
 useEffect(() => {
 loadSystemPrompt();
}, []);

 const loadSystemPrompt = async () => {
 try {
 const data = await api.get("/ai/system-prompt");
 if (data.success && data.data?.prompt != null) {
 // Ensure prompt is always a string
 setSystemPrompt(String(data.data.prompt));
}
} catch (error) {
 console.error("Error loading system prompt:", error);
}
};

 const loadDocuments = async () => {
 setIsLoadingDocs(true);
 try {
 const data = await api.get("/ai/documents");
 if (data.success) {
 setDocuments(Array.isArray(data.data) ? data.data : []);
}
} catch (error) {
 console.error("Error loading documents:", error);
} finally {
 setIsLoadingDocs(false);
}
};

 const handleSendMessage = async () => {
 if (!inputValue.trim() || isLoading) return;

 const userMessage: ChatMessage = { role:"user", content: inputValue};
 setMessages((prev) => [...prev, userMessage]);
 setInputValue("");
 setIsLoading(true);

 try {
 const data = await api.post("/ai/chat", {
 message: inputValue,
 history: messages.map((m) => ({ role: m.role, content: m.content})),
});

 if (data.success) {
 // Парсим ответ для извлечения блока размышлений
 const { content, thinking} = parseThinkingBlock(data.data.response);
 
 const assistantMessage: ChatMessage = {
 role:"assistant",
 content,
 thinking: thinking || undefined,
 sources: data.data.sources,
};
 setMessages((prev) => [...prev, assistantMessage]);
} else {
 setMessages((prev) => [
 ...prev,
 {
 role:"assistant",
 content: `❌ Ошибка: ${data.message ||"Не удалось получить ответ"}`,
},
 ]);
}
} catch (error) {
 console.error("Chat error:", error);
 setMessages((prev) => [
 ...prev,
 {
 role:"assistant",
 content:"❌ Ошибка соединения. Проверьте подключение к сети.",
},
 ]);
} finally {
 setIsLoading(false);
}
};

 const handleKeyPress = (e: React.KeyboardEvent) => {
 if (e.key ==="Enter"&& !e.shiftKey) {
 e.preventDefault();
 handleSendMessage();
}
};

 const handleAddDocument = async () => {
 if (!newDocContent.trim()) return;
 if (!newDocMetadata.title.trim()) {
 alert("Название документа обязательно");
 return;
}

 try {
 // Используем новый endpoint с разбиением на чанки
 const data = await api.post("/ai/documents/upload", {
 content: newDocContent,
 title: newDocMetadata.title,
 subject: newDocMetadata.subject || undefined,
 grade: newDocMetadata.grade || undefined,
});

 if (data.success) {
 setShowAddDocModal(false);
 setNewDocContent("");
 setNewDocMetadata({ title:"", subject:"", grade:"", tags:""});
 loadDocuments();
 alert(data.message ||"Документ добавлен");
} else {
 alert(data.message ||"Ошибка добавления документа");
}
} catch (error) {
 console.error("Error adding document:", error);
 alert("Ошибка добавления документа");
}
};

 const handleDeleteDocument = async () => {
 if (!deleteConfirm) return;
 setIsDeletingDoc(true);

 try {
 const data = await api.delete(`/ai/documents/${deleteConfirm.id}`);
 if (data.success) {
 loadDocuments();
 setDeleteConfirm(null);
} else {
 alert(data.message ||"Ошибка удаления");
}
} catch (error) {
 console.error("Error deleting document:", error);
} finally {
 setIsDeletingDoc(false);
}
};

 const handleSyncGoogleDrive = async () => {
 setSyncConfirmOpen(false);
 setIsSyncing(true);
 setSyncStatus(null);
 
 try {
 // Запускаем синхронизацию в фоновом режиме
 const startData = await api.post("/ai/sync-google-drive?background=true");
 
 if (!startData.success) {
 alert(startData.message ||"Ошибка запуска синхронизации");
 setIsSyncing(false);
 return;
}
 
 // Начинаем поллинг статуса
 const pollInterval = setInterval(async () => {
 try {
 const statusData = await api.get("/ai/sync-status");
 if (statusData.success) {
 setSyncStatus(statusData.data);
 
 // Если синхронизация завершена
 if (!statusData.data.isRunning) {
 clearInterval(pollInterval);
 setIsSyncing(false);
 loadDocuments();
 
 const { synced, updated, skipped, errors} = statusData.data;
 if (statusData.data.error) {
 alert(`Ошибка синхронизации: ${statusData.data.error}`);
} else {
 alert(`Синхронизация завершена!\nДобавлено: ${synced}\nОбновлено: ${updated}\nПропущено: ${skipped}\nОшибок: ${errors}`);
}
 setSyncStatus(null);
}
}
} catch (pollError) {
 console.error("Poll error:", pollError);
}
}, 1000); // Поллинг каждую секунду
 
 // Таймаут на 5 минут
 setTimeout(() => {
 clearInterval(pollInterval);
 if (isSyncing) {
 setIsSyncing(false);
 alert("Синхронизация заняла слишком много времени. Проверьте статус позже.");
}
}, 5 * 60 * 1000);
 
} catch (error) {
 console.error("Error syncing Google Drive:", error);
 alert("Ошибка синхронизации с Google Drive");
 setIsSyncing(false);
}
};

 const handleSaveSystemPrompt = async () => {
 if (!systemPrompt.trim()) {
 alert("Системный промт не может быть пустым");
 return;
}
 
 setIsSavingPrompt(true);
 try {
 const data = await api.put("/ai/system-prompt", { prompt: systemPrompt});
 if (data.success) {
 alert("Системный промт успешно сохранён");
} else {
 alert(data.message ||"Ошибка сохранения");
}
} catch (error) {
 console.error("Error saving system prompt:", error);
 alert("Ошибка сохранения системного промта");
} finally {
 setIsSavingPrompt(false);
}
};

 const handleResetSystemPrompt = async () => {
 setResetPromptConfirmOpen(false);
 try {
 const data = await api.post("/ai/system-prompt/reset");
 if (data.success) {
 setSystemPrompt(data.data.prompt);
 alert("Системный промт сброшен к значению по умолчанию");
} else {
 alert(data.message ||"Ошибка сброса");
}
} catch (error) {
 console.error("Error resetting system prompt:", error);
 alert("Ошибка сброса системного промта");
}
};

 const toggleThinking = (index: number) => {
 setExpandedThinking((prev) => ({
 ...prev,
 [index]: !prev[index]
}));
};

 const canManageDocuments =
 user?.role ==="ADMIN"|| user?.role ==="DIRECTOR"|| user?.role ==="DEPUTY";
 
 const canEditPrompt = user?.role ==="ADMIN"|| user?.role ==="DIRECTOR";

 return (
 <div className="flex flex-col">
 {/* Tabs */}
 <div className="mb-4 flex gap-2 border-b pb-2">
 <button
 onClick={() => setActiveTab("chat")}
 className={`flex items-center gap-2 rounded-lg px-4 py-2 macos-transition ${
 activeTab ==="chat"
 ?"bg-indigo-600 text-white"
 :"bg-fill-tertiary text-primary hover:bg-fill-secondary"
}`}
 >
 <Bot className="h-4 w-4"/>
 ИИ-Методист
 </button>
 <button
 onClick={() => setActiveTab("knowledge")}
 className={`flex items-center gap-2 rounded-lg px-4 py-2 macos-transition ${
 activeTab ==="knowledge"
 ?"bg-indigo-600 text-white"
 :"bg-fill-tertiary text-primary hover:bg-fill-secondary"
}`}
 >
 <FileText className="h-4 w-4"/>
 База знаний
 </button>
 </div>

 {activeTab ==="chat"? (
 <>
 {/* Chat Messages */}
 <div className="min-h-[400px] rounded-lg border bg-fill-quaternary p-4">
 {messages.length === 0 ? (
 <div className="flex h-full flex-col items-center justify-center text-secondary">
 <Sparkles className="mb-4 h-16 w-16 text-indigo-400"/>
 <h2 className="mb-2 text-xl font-semibold text-primary">
 ИИ-Методист
 </h2>
 <p className="max-w-md text-center">
 Помогу составить план урока, найти метапредметные связи и
 подготовить учебные материалы на основе базы знаний школы.
 </p>
 <div className="mt-4 flex flex-wrap justify-center gap-2">
 {[
"Составь план урока по математике для 5 класса",
"Найди связи между физикой и биологией",
"Помоги с интегрированным уроком",
 ].map((prompt) => (
 <button
 key={prompt}
 onClick={() => setInputValue(prompt)}
 className="rounded-full bg-white px-3 py-1.5 text-sm text-secondary shadow-sm hover:bg-fill-tertiary"
 >
 {prompt}
 </button>
 ))}
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 {messages.map((message, index) => (
 <div
 key={index}
 className={`flex gap-3 ${
 message.role ==="user"?"justify-end":"justify-start"
}`}
 >
 {message.role ==="assistant"&& (
 <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
 <Bot className="h-5 w-5 text-indigo-600"/>
 </div>
 )}
 <div
 className={`max-w-[80%] rounded-lg px-4 py-2 ${
 message.role ==="user"
 ?"bg-indigo-600 text-white"
 :"bg-white shadow-sm"
}`}
 >
 {message.role ==="assistant"? (
 <div className="prose prose-sm max-w-none">
 {/* Скрытый блок размышлений */}
 {message.thinking && (
 <div className="mb-3 border-l-4 border-violet-200 bg-violet-50 rounded-r-lg">
 <button
 onClick={() => setExpandedThinking(prev => ({
 ...prev,
 [index]: !prev[index]
}))}
 className="w-full flex items-center justify-between px-3 py-2 text-sm text-violet-600 hover:bg-violet-100 macos-transition"
 >
 <span className="flex items-center gap-2">
 <span className="text-lg">💭</span>
 <span>Размышления ИИ</span>
 </span>
 <svg
 className={`w-4 h-4 transition-transform ${expandedThinking[index] ? 'rotate-180' : ''}`}
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round"strokeLinejoin="round"strokeWidth={2} d="M19 9l-7 7-7-7"/>
 </svg>
 </button>
 {expandedThinking[index] && (
 <div className="px-3 pb-3 text-sm text-violet-700 italic whitespace-pre-wrap">
 {message.thinking}
 </div>
 )}
 </div>
 )}
 <ReactMarkdown>{message.content}</ReactMarkdown>
 </div>
 ) : (
 <p className="whitespace-pre-wrap">{message.content}</p>
 )}
 {message.sources && message.sources.length > 0 && (
 <div className="mt-3 border-t pt-2">
 <p className="mb-1 text-xs font-medium text-secondary">
 Источники из базы знаний:
 </p>
 <div className="space-y-1">
 {message.sources.map((source, i) => (
 <div
 key={i}
 className="rounded bg-fill-quaternary p-2 text-xs text-secondary"
 >
 <span className="font-medium">
 {source.metadata?.title ||
 source.metadata?.subject ||
 `Документ #${source.id}`}
 </span>
 {source.similarity && (
 <span className="ml-2 text-tertiary">
 (релевантность:{""}
 {Math.round(source.similarity * 100)}%)
 </span>
 )}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 {message.role ==="user"&& (
 <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600">
 <User className="h-5 w-5 text-white"/>
 </div>
 )}
 </div>
 ))}
 {isLoading && (
 <div className="flex gap-3">
 <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
 <Bot className="h-5 w-5 text-indigo-600"/>
 </div>
 <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm">
 <Loader2 className="h-4 w-4 animate-spin text-indigo-600"/>
 <span className="text-secondary">Думаю...</span>
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Input */}
 <div className="mt-4 flex gap-2 items-stretch">
 <textarea
 value={inputValue}
 onChange={(e) => setInputValue(e.target.value)}
 onKeyPress={handleKeyPress}
 placeholder="Задайте вопрос ИИ-методисту..."
 className="flex-1 resize-none rounded-lg border p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
 rows={2}
 disabled={isLoading}
 />
 <button
 onClick={handleSendMessage}
 disabled={!inputValue.trim() || isLoading}
 className="flex items-center justify-center rounded-lg bg-indigo-600 px-4 text-white macos-transition hover:bg-indigo-700 disabled:bg-gray-300"
 >
 {isLoading ? (
 <Loader2 className="h-5 w-5 animate-spin"/>
 ) : (
 <Send className="h-5 w-5"/>
 )}
 </button>
 </div>

 {/* System Prompt Editor - только для Admin и Director */}
 {(user?.role === 'ADMIN' || user?.role === 'DIRECTOR') && (
 <div className="mt-4 border-t pt-4">
 <details className="group">
 <summary className="flex items-center justify-between cursor-pointer text-[11px] font-medium uppercase tracking-widest text-primary hover:text-indigo-600">
 <span className="flex items-center gap-2">
 <svg className="w-4 h-4"fill="none"stroke="currentColor"viewBox="0 0 24 24">
 <path strokeLinecap="round"strokeLinejoin="round"strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
 <path strokeLinecap="round"strokeLinejoin="round"strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
 </svg>
 Настройки системного промпта ИИ
 </span>
 <svg className="w-4 h-4 transition-transform group-open:rotate-180"fill="none"stroke="currentColor"viewBox="0 0 24 24">
 <path strokeLinecap="round"strokeLinejoin="round"strokeWidth={2} d="M19 9l-7 7-7-7"/>
 </svg>
 </summary>
 <div className="mt-3 space-y-3">
 <p className="text-xs text-secondary">
 Здесь вы можете настроить поведение и инструкции для ИИ-методиста. Изменения будут применены ко всем новым диалогам.
 </p>
 <textarea
 value={systemPrompt}
 onChange={(e) => setSystemPrompt(e.target.value)}
 className="w-full rounded-lg border p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
 style={{ minHeight: '200px', height: 'auto'}}
 rows={Math.max(8, String(systemPrompt || '').split('\n').length + 2)}
 placeholder="Введите системный промпт..."
 />
 <div className="flex justify-end gap-2">
 <button
 onClick={() => setResetPromptConfirmOpen(true)}
 disabled={isSavingPrompt}
 className="px-3 py-1.5 text-sm rounded-lg border border-field text-secondary hover:bg-fill-quaternary disabled:opacity-50 macos-transition"
 >
 Сбросить к стандартному
 </button>
 <button
 onClick={handleSaveSystemPrompt}
 disabled={isSavingPrompt}
 className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 macos-transition flex items-center gap-2"
 >
 {isSavingPrompt && <Loader2 className="h-3 w-3 animate-spin"/>}
 Сохранить промпт
 </button>
 </div>
 </div>
 </details>
 </div>
 )}
 </>
 ) : (
 <>
 {/* Knowledge Base */}
 <div>
 {/* Google Drive Section */}
 <div className="mb-4">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <FolderOpen className="h-5 w-5 text-macos-orange"/>
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-800">
 Google Drive - Учебные материалы
 </h2>
 </div>
 <div className="flex items-center gap-2">
 {canManageDocuments && (
 <button
 onClick={() => setSyncConfirmOpen(true)}
 disabled={isSyncing}
 className="flex items-center gap-1 text-sm bg-macos-green text-white px-3 py-1.5 rounded-lg hover:bg-macos-green disabled:bg-gray-400"
 >
 {isSyncing ? (
 <Loader2 className="h-4 w-4 animate-spin"/>
 ) : (
 <RefreshCw className="h-4 w-4"/>
 )}
 {isSyncing ?"Синхронизация...":"Синхронизировать"}
 </button>
 )}
 <a
 href={GOOGLE_DRIVE_LINK}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
 >
 Открыть в Google Drive
 <ExternalLink className="h-4 w-4"/>
 </a>
 </div>
 </div>
 <div className="rounded-lg border bg-white overflow-hidden"style={{ height:"300px"}}>
 <iframe
 src={GOOGLE_DRIVE_EMBED_URL}
 className="w-full h-full border-0"
 title="База знаний Google Drive"
 allow="autoplay"
 />
 </div>
 <p className="mt-2 text-xs text-secondary">
 💡 Нажмите"Синхронизировать"чтобы загрузить документы из Google Drive в базу знаний RAG
 </p>
 </div>

 {/* Separator */}
 <div className="border-t my-4"/>

 {/* Local Documents Section */}
 <div>
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-800">
 Локальные документы ({documents.length})
 </h2>
 {canManageDocuments && (
 <button
 onClick={() => setShowAddDocModal(true)}
 className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
 >
 <Plus className="h-4 w-4"/>
 Добавить документ
 </button>
 )}
 </div>

 {isLoadingDocs ? (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="h-8 w-8 animate-spin text-indigo-600"/>
 </div>
 ) : documents.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-8 text-secondary">
 <FileText className="mb-4 h-12 w-12"/>
 <p>Локальные документы не добавлены</p>
 {canManageDocuments && (
 <p className="mt-2 text-sm">
 Вы можете добавить дополнительные материалы вручную
 </p>
 )}
 </div>
 ) : (
 <div className="space-y-3">
 {documents.map((doc) => (
 <div
 key={doc.id}
 className="rounded-lg border bg-white p-4 shadow-sm"
 >
 <div className="mb-2 flex items-start justify-between">
 <div>
 <h3 className="font-medium text-gray-800">
 {doc.metadata?.title || `Документ #${doc.id}`}
 </h3>
 <div className="mt-1 flex gap-2 text-xs text-secondary">
 {doc.metadata?.subject && (
 <span className="rounded bg-[rgba(0,122,255,0.12)] px-2 py-0.5 text-macos-blue">
 {doc.metadata.subject}
 </span>
 )}
 {doc.metadata?.grade && (
 <span className="rounded bg-[rgba(52,199,89,0.12)] px-2 py-0.5 text-macos-green">
 {doc.metadata.grade}
 </span>
 )}
 {Array.isArray(doc.metadata?.tags) && doc.metadata.tags.map((tag, i) => (
 <span
 key={i}
 className="rounded bg-fill-tertiary px-2 py-0.5 text-secondary"
 >
 {tag}
 </span>
 ))}
 </div>
 </div>
 {canManageDocuments && (
 <button
 onClick={() => setDeleteConfirm(doc)}
 className="text-tertiary hover:text-macos-red"
 >
 <Trash2 className="h-4 w-4"/>
 </button>
 )}
 </div>
 <p className="line-clamp-3 text-sm text-secondary">
 {doc.content}
 </p>
 <p className="mt-2 text-xs text-tertiary">
 Добавлен:{""}
 {new Date(doc.createdAt).toLocaleDateString("ru-RU")}
 </p>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </>
 )}

 {/* Add Document Modal */}
 {showAddDocModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
 <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
 <h2 className="mb-4 text-xl font-semibold">
 Добавить документ в базу знаний
 </h2>
 
 {/* Hint about Google Drive */}
 <div className="mb-4 rounded-lg bg-tint-blue border border-blue-200 p-3">
 <p className="text-sm text-blue-800">
 <strong>💡 Совет:</strong> Откройте документ в{""}
 <a 
 href={GOOGLE_DRIVE_LINK} 
 target="_blank"
 rel="noopener noreferrer"
 className="underline hover:text-macos-blue"
 >
 Google Drive
 </a>
 , скопируйте текст (Ctrl+A, Ctrl+C) и вставьте его в поле ниже.
 Большие документы автоматически разбиваются на части для лучшего поиска.
 </p>
 </div>

 <div className="mb-4 grid grid-cols-2 gap-4">
 <div>
 <label className="mb-1 block text-[11px] font-medium uppercase tracking-widest text-primary">
 Название *
 </label>
 <input
 type="text"
 value={newDocMetadata.title}
 onChange={(e) =>
 setNewDocMetadata({ ...newDocMetadata, title: e.target.value})
}
 className="w-full rounded-lg border p-2"
 placeholder="Учебная программа по математике"
 />
 </div>
 <div>
 <label className="mb-1 block text-[11px] font-medium uppercase tracking-widest text-primary">
 Предмет
 </label>
 <input
 type="text"
 value={newDocMetadata.subject}
 onChange={(e) =>
 setNewDocMetadata({ ...newDocMetadata, subject: e.target.value})
}
 className="w-full rounded-lg border p-2"
 placeholder="Математика"
 />
 </div>
 <div className="col-span-2">
 <label className="mb-1 block text-[11px] font-medium uppercase tracking-widest text-primary">
 Класс/Возраст
 </label>
 <input
 type="text"
 value={newDocMetadata.grade}
 onChange={(e) =>
 setNewDocMetadata({ ...newDocMetadata, grade: e.target.value})
}
 className="w-full rounded-lg border p-2"
 placeholder="5 класс"
 />
 </div>
 </div>

 <div className="mb-4">
 <label className="mb-1 block text-[11px] font-medium uppercase tracking-widest text-primary">
 Содержимое документа *
 </label>
 <textarea
 value={newDocContent}
 onChange={(e) => setNewDocContent(e.target.value)}
 className="h-64 w-full rounded-lg border p-3 font-mono text-sm"
 placeholder="Вставьте текст учебной программы, методических рекомендаций или других материалов...&#10;&#10;Скопируйте содержимое документа из Google Drive и вставьте сюда."
 />
 <p className="mt-1 text-xs text-secondary">
 {newDocContent.length > 0 
 ? `${newDocContent.length} символов • ~${Math.ceil(newDocContent.length / 3000)} частей`
 :"Минимум 10 символов"
}
 </p>
 </div>

 <div className="flex justify-end gap-2">
 <button
 onClick={() => {
 setShowAddDocModal(false);
 setNewDocContent("");
 setNewDocMetadata({ title:"", subject:"", grade:"", tags:""});
}}
 className="rounded-lg bg-fill-tertiary px-4 py-2 text-primary hover:bg-fill-secondary"
 >
 Отмена
 </button>
 <button
 onClick={handleAddDocument}
 disabled={!newDocContent.trim() || !newDocMetadata.title.trim()}
 className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-gray-300"
 >
 Добавить в базу знаний
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Delete Document Confirmation Modal */}
 <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Удаление документа">
 <div className="p-4">
 <div className="flex items-start gap-4">
 <div className="flex-shrink-0 w-10 h-10 bg-[rgba(255,59,48,0.12)] rounded-full flex items-center justify-center">
 <AlertTriangle className="h-5 w-5 text-macos-red"/>
 </div>
 <div className="flex-1">
 <p className="font-medium text-primary">Вы уверены, что хотите удалить этот документ из базы знаний?</p>
 {deleteConfirm && (
 <div className="mt-2 p-3 bg-fill-quaternary rounded-md">
 <p className="text-[11px] font-medium uppercase tracking-widest">{deleteConfirm.metadata?.title || `Документ #${deleteConfirm.id}`}</p>
 {deleteConfirm.metadata?.subject && (
 <p className="text-xs text-secondary mt-1">Предмет: {deleteConfirm.metadata.subject}</p>
 )}
 </div>
 )}
 <p className="text-sm text-secondary mt-2">Это действие нельзя отменить.</p>
 </div>
 </div>
 <div className="flex justify-end gap-3 mt-6">
 <Button variant="outline"onClick={() => setDeleteConfirm(null)} disabled={isDeletingDoc}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDeleteDocument} disabled={isDeletingDoc}>
 {isDeletingDoc ? 'Удаление...' : 'Удалить'}
 </Button>
 </div>
 </div>
 </Modal>

 {/* Sync Google Drive Confirmation Modal */}
 <Modal isOpen={syncConfirmOpen} onClose={() => setSyncConfirmOpen(false)} title="Синхронизация с Google Drive">
 <div className="p-4">
 <div className="flex items-start gap-4">
 <div className="flex-shrink-0 w-10 h-10 bg-[rgba(0,122,255,0.12)] rounded-full flex items-center justify-center">
 <RefreshCw className="h-5 w-5 text-macos-blue"/>
 </div>
 <div className="flex-1">
 <p className="font-medium text-primary">Синхронизировать документы из Google Drive?</p>
 <p className="text-sm text-secondary mt-2">
 Это может занять некоторое время в зависимости от количества документов.
 </p>
 </div>
 </div>
 <div className="flex justify-end gap-3 mt-6">
 <Button variant="outline"onClick={() => setSyncConfirmOpen(false)}>
 Отмена
 </Button>
 <Button onClick={handleSyncGoogleDrive}>
 Синхронизировать
 </Button>
 </div>
 </div>
 </Modal>

 {/* Sync Progress Modal */}
 <Modal isOpen={isSyncing} onClose={() => {}} title="Синхронизация с Google Drive">
 <div className="p-4">
 <div className="flex flex-col gap-4">
 <div className="flex items-center gap-3">
 <div className="flex-shrink-0">
 <RefreshCw className="h-6 w-6 text-macos-blue animate-spin"/>
 </div>
 <div className="flex-1">
 <p className="font-medium text-primary">
 {syncStatus ? 'Синхронизация...' : 'Запуск синхронизации...'}
 </p>
 {syncStatus?.currentFile && (
 <p className="text-sm text-secondary truncate mt-1"title={syncStatus.currentFile}>
 {syncStatus.currentFile}
 </p>
 )}
 </div>
 </div>
 
 {syncStatus && syncStatus.total > 0 && (
 <>
 {/* Progress bar */}
 <div className="w-full bg-fill-secondary rounded-full h-3 overflow-hidden">
 <div 
 className="bg-macos-blue h-3 rounded-full macos-transition"
 style={{ width: `${Math.round((syncStatus.current / syncStatus.total) * 100)}%`}}
 />
 </div>
 
 {/* Progress text */}
 <div className="flex justify-between text-sm text-secondary">
 <span>
 Файл {syncStatus.current} из {syncStatus.total}
 </span>
 <span>
 {Math.round((syncStatus.current / syncStatus.total) * 100)}%
 </span>
 </div>
 
 {/* Statistics */}
 <div className="grid grid-cols-4 gap-2 text-center text-xs mt-2">
 <div className="bg-[rgba(52,199,89,0.06)] rounded p-2">
 <div className="font-semibold text-macos-green">{syncStatus.synced}</div>
 <div className="text-macos-green">Добавлено</div>
 </div>
 <div className="bg-tint-blue rounded p-2">
 <div className="font-semibold text-macos-blue">{syncStatus.updated}</div>
 <div className="text-macos-blue">Обновлено</div>
 </div>
 <div className="bg-fill-quaternary rounded p-2">
 <div className="font-semibold text-primary">{syncStatus.skipped}</div>
 <div className="text-secondary">Пропущено</div>
 </div>
 <div className="bg-[rgba(255,59,48,0.06)] rounded p-2">
 <div className="font-semibold text-macos-red">{syncStatus.errors}</div>
 <div className="text-macos-red">Ошибок</div>
 </div>
 </div>
 </>
 )}
 </div>
 </div>
 </Modal>

 {/* Reset System Prompt Confirmation Modal */}
 <Modal isOpen={resetPromptConfirmOpen} onClose={() => setResetPromptConfirmOpen(false)} title="Сброс системного промта">
 <div className="p-4">
 <div className="flex items-start gap-4">
 <div className="flex-shrink-0 w-10 h-10 bg-[rgba(255,204,0,0.12)] rounded-full flex items-center justify-center">
 <AlertTriangle className="h-5 w-5 text-macos-orange"/>
 </div>
 <div className="flex-1">
 <p className="font-medium text-primary">Сбросить системный промт к значению по умолчанию?</p>
 <p className="text-sm text-secondary mt-2">
 Все ваши настройки промта будут потеряны.
 </p>
 </div>
 </div>
 <div className="flex justify-end gap-3 mt-6">
 <Button variant="outline"onClick={() => setResetPromptConfirmOpen(false)}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleResetSystemPrompt}>
 Сбросить
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 );
}
