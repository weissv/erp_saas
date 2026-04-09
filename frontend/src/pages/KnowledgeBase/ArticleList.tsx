// src/pages/KnowledgeBase/ArticleList.tsx
// Список статей базы знаний с семантическим поиском и фильтрацией по тегам

import { useState, useEffect, useCallback, useRef} from"react";
import { useNavigate, useSearchParams} from"react-router-dom";
import { toast} from"sonner";
import { Search, BookOpen, Tag, Plus, Trash2, Edit, Clock, Sparkles} from"lucide-react";
import { knowledgeBaseApi} from"../../lib/api";
import { useAuth} from"../../hooks/useAuth";
import type { KnowledgeBaseArticle, CreateArticleInput} from"../../types/knowledge-base";
import { Modal} from"../../components/Modal";
import { Button} from"../../components/ui/button";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
 const [debouncedValue, setDebouncedValue] = useState(value);
 useEffect(() => {
 const timer = setTimeout(() => setDebouncedValue(value), delay);
 return () => clearTimeout(timer);
}, [value, delay]);
 return debouncedValue;
}

export default function ArticleList() {
 const navigate = useNavigate();
 const { user} = useAuth();
 const [searchParams, setSearchParams] = useSearchParams();

 // Состояние
 const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
 const [total, setTotal] = useState(0);
 const [loading, setLoading] = useState(true);
 const [query, setQuery] = useState(searchParams.get("q") ||"");
 const [tagFilter, setTagFilter] = useState(searchParams.get("tags") ||"");
 const debouncedQuery = useDebounce(query, 400);

 // Модалка создания
 const [isCreateOpen, setIsCreateOpen] = useState(false);
 const [createForm, setCreateForm] = useState<CreateArticleInput>({
 title:"",
 content:"",
 tags: [],
 roles: [],
});
 const [creating, setCreating] = useState(false);
 const [tagInput, setTagInput] = useState("");

 // Права на создание (ADMIN, DEPUTY, DIRECTOR, DEVELOPER)
 const canCreate = user && ["ADMIN","DEPUTY","DIRECTOR","DEVELOPER"].includes(user.role);

 // ========== Загрузка данных ==========
 const fetchArticles = useCallback(async () => {
 setLoading(true);
 try {
 const result = await knowledgeBaseApi.search({
 q: debouncedQuery || undefined,
 tags: tagFilter || undefined,
 limit: 50,
});
 setArticles(result.items);
 setTotal(result.total);
} catch (err) {
 console.error("Ошибка загрузки статей:", err);
 toast.error("Не удалось загрузить статьи");
} finally {
 setLoading(false);
}
}, [debouncedQuery, tagFilter]);

 useEffect(() => {
 fetchArticles();
}, [fetchArticles]);

 // Синхронизируем URL с поисковыми параметрами
 useEffect(() => {
 const params = new URLSearchParams();
 if (debouncedQuery) params.set("q", debouncedQuery);
 if (tagFilter) params.set("tags", tagFilter);
 setSearchParams(params, { replace: true});
}, [debouncedQuery, tagFilter, setSearchParams]);

 // ========== Создание статьи ==========
 const handleCreate = async () => {
 if (!createForm.title.trim() || !createForm.content.trim()) {
 toast.error("Заполните заголовок и содержимое");
 return;
}
 setCreating(true);
 try {
 const article = await knowledgeBaseApi.create(createForm);
 toast.success("Статья создана");
 setIsCreateOpen(false);
 setCreateForm({ title:"", content:"", tags: [], roles: []});
 setTagInput("");
 navigate(`/knowledge-base/${article.slug}`);
} catch (err) {
 console.error("Ошибка создания:", err);
 toast.error("Не удалось создать статью");
} finally {
 setCreating(false);
}
};

 // Добавить тег
 const addTag = () => {
 const tag = tagInput.trim().toLowerCase();
 if (tag && !createForm.tags?.includes(tag)) {
 setCreateForm((prev) => ({ ...prev, tags: [...(prev.tags || []), tag]}));
 setTagInput("");
}
};

 const removeTag = (tag: string) => {
 setCreateForm((prev) => ({
 ...prev,
 tags: (prev.tags || []).filter((t) => t !== tag),
}));
};

 // ========== Удаление ==========
 const handleDelete = async (id: number, e: React.MouseEvent) => {
 e.stopPropagation();
 if (!confirm("Вы уверены, что хотите удалить эту статью?")) return;
 try {
 await knowledgeBaseApi.delete(id);
 toast.success("Статья удалена");
 fetchArticles();
} catch (err) {
 toast.error("Не удалось удалить статью");
}
};

 // ========== Рендер ==========
 return (
 <div>
 {/* Заголовок */}
 <div className="flex justify-between items-center mb-6">
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight flex items-center gap-2">
 <BookOpen className="h-6 w-6"/>
 База знаний
 </h1>
 {canCreate && (
 <Button onClick={() => setIsCreateOpen(true)}>
 <Plus className="mr-2 h-4 w-4"/> Новая статья
 </Button>
 )}
 </div>

 {/* Поиск и фильтры */}
 <div className="flex flex-col sm:flex-row gap-3 mb-6">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary"/>
 <input
 type="text"
 placeholder="Семантический поиск по базе знаний..."
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-field rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
 />
 </div>
 <div className="relative sm:w-64">
 <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary"/>
 <input
 type="text"
 placeholder="Фильтр по тегам (через ,)"
 value={tagFilter}
 onChange={(e) => setTagFilter(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-field rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
 />
 </div>
 </div>

 {/* Результаты */}
 {loading ? (
 <div className="flex justify-center py-20">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
 </div>
 ) : articles.length === 0 ? (
 <div className="text-center py-20 text-secondary">
 <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50"/>
 <p className="text-lg mb-1">Статьи не найдены</p>
 <p className="text-sm">
 {query ?"Попробуйте изменить запрос":"Пока нет ни одной статьи"}
 </p>
 </div>
 ) : (
 <>
 <p className="text-sm text-secondary mb-4">
 Найдено: {total} {total === 1 ?"статья": total < 5 ?"статьи":"статей"}
 </p>

 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {articles.map((article) => (
 <div
 key={article.id}
 onClick={() => navigate(`/knowledge-base/${article.slug}`)}
 className="border border-[rgba(0,0,0,0.08)] rounded-xl p-5 hover:shadow-md hover:border-blue-300 macos-transition cursor-pointer group bg-white"
 >
 {/* Скор сходства (при семантическом поиске) */}
 {article.similarity !== undefined && article.similarity !== null && (
 <div className="flex items-center gap-1 text-xs text-macos-blue mb-2">
 <Sparkles className="h-3 w-3"/>
 <span>{(article.similarity * 100).toFixed(0)}% совпадение</span>
 </div>
 )}

 <h3 className="font-semibold text-lg mb-2 group-hover:text-macos-blue macos-transition line-clamp-2">
 {article.title}
 </h3>

 <p className="text-secondary text-sm mb-3 line-clamp-3">
 {article.summary}
 </p>

 {/* Теги */}
 {article.tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mb-3">
 {article.tags.slice(0, 4).map((tag) => (
 <span
 key={tag}
 className="px-2 py-0.5 bg-tint-blue text-macos-blue text-xs rounded-full"
 >
 {tag}
 </span>
 ))}
 {article.tags.length > 4 && (
 <span className="text-xs text-tertiary">
 +{article.tags.length - 4}
 </span>
 )}
 </div>
 )}

 {/* Мета */}
 <div className="flex items-center justify-between text-xs text-tertiary mt-auto pt-2 border-t border-[rgba(0,0,0,0.04)]">
 <div className="flex items-center gap-1">
 <Clock className="h-3 w-3"/>
 {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
 </div>

 {article.author && (
 <span>
 {article.author.employee.firstName} {article.author.employee.lastName[0]}.
 </span>
 )}

 {canCreate && (
 <button
 onClick={(e) => handleDelete(article.id, e)}
 className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-macos-red transition-opacity"
 title="Удалить"
 >
 <Trash2 className="h-4 w-4"/>
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </>
 )}

 {/* ===== Модалка создания ===== */}
 <Modal
 isOpen={isCreateOpen}
 onClose={() => setIsCreateOpen(false)}
 title="Новая статья"
 >
 <div className="space-y-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Заголовок *</label>
 <input
 type="text"
 value={createForm.title}
 onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value}))}
 className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
 placeholder="Название статьи"
 />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Содержимое (Markdown) *</label>
 <textarea
 value={createForm.content}
 onChange={(e) => setCreateForm((p) => ({ ...p, content: e.target.value}))}
 rows={10}
 className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
 placeholder="# Заголовок&#10;&#10;Текст статьи в формате Markdown..."
 />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Теги</label>
 <div className="flex gap-2">
 <input
 type="text"
 value={tagInput}
 onChange={(e) => setTagInput(e.target.value)}
 onKeyDown={(e) => e.key ==="Enter"&& (e.preventDefault(), addTag())}
 className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
 placeholder="Введите тег и нажмите Enter"
 />
 <Button variant="outline"onClick={addTag} type="button">
 Добавить
 </Button>
 </div>
 {(createForm.tags?.length ?? 0) > 0 && (
 <div className="flex flex-wrap gap-1 mt-2">
 {createForm.tags!.map((tag) => (
 <span
 key={tag}
 className="px-2 py-1 bg-tint-blue text-macos-blue text-xs rounded-full flex items-center gap-1"
 >
 {tag}
 <button
 onClick={() => removeTag(tag)}
 className="hover:text-macos-red"
 >
 ×
 </button>
 </span>
 ))}
 </div>
 )}
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline"onClick={() => setIsCreateOpen(false)}>
 Отмена
 </Button>
 <Button onClick={handleCreate} disabled={creating}>
 {creating ?"Создание...":"Создать статью"}
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 );
}
