// src/components/ui/InventoryAutocomplete.tsx
import { useState, useEffect, useRef, useId} from 'react';
import { Control, useController} from 'react-hook-form';
import { api} from '../../lib/api';
import { Input} from './input';

export interface InventorySearchItem {
 id: number;
 name: string;
 unit: string;
 quantity: number;
 type: string;
}

interface InventoryAutocompleteProps {
 name: string;
 control: Control<any>;
 onSelect: (item: InventorySearchItem) => void;
 placeholder?: string;
 className?: string;
 disabled?: boolean;
}

export function InventoryAutocomplete({
 name,
 control,
 onSelect,
 placeholder = 'Наименование товара',
 className = '',
 disabled = false,
}: InventoryAutocompleteProps) {
 const [suggestions, setSuggestions] = useState<InventorySearchItem[]>([]);
 const [isOpen, setIsOpen] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [highlightedIndex, setHighlightedIndex] = useState(-1);
 const debounceRef = useRef<NodeJS.Timeout | null>(null);
 const containerRef = useRef<HTMLDivElement>(null);
 const listboxId = useId();

 const { field} = useController({
 name,
 control,
});

 // Поиск товаров с дебаунсом
 const searchItems = async (query: string) => {
 if (!query || query.trim().length < 1) {
 setSuggestions([]);
 setIsOpen(false);
 return;
}

 setIsLoading(true);
 try {
 const results = await api.get(`/api/inventory/search?q=${encodeURIComponent(query)}`);
 setSuggestions(results || []);
 setIsOpen(results && results.length > 0);
} catch (error) {
 console.error('Failed to search inventory:', error);
 setSuggestions([]);
} finally {
 setIsLoading(false);
}
};

 // Обработка ввода с дебаунсом 300ms
 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const value = e.target.value;
 field.onChange(value);

 // Очищаем предыдущий таймер
 if (debounceRef.current) {
 clearTimeout(debounceRef.current);
}

 // Устанавливаем новый таймер
 debounceRef.current = setTimeout(() => {
 searchItems(value);
}, 300);
};

 // Выбор элемента из списка
 const handleSelect = (item: InventorySearchItem) => {
 field.onChange(item.name);
 setSuggestions([]);
 setIsOpen(false);
 setHighlightedIndex(-1);
 onSelect(item);
};

 // Клавиатурная навигация
 const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!isOpen || suggestions.length === 0) return;
  switch (e.key) {
   case 'ArrowDown':
    e.preventDefault();
    setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    break;
   case 'ArrowUp':
    e.preventDefault();
    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    break;
   case 'Enter':
    e.preventDefault();
    if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
     handleSelect(suggestions[highlightedIndex]);
    }
    break;
   case 'Escape':
    e.preventDefault();
    setIsOpen(false);
    setHighlightedIndex(-1);
    break;
  }
 };

 // Закрытие списка при клике вне компонента
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
 setIsOpen(false);
}
};

 document.addEventListener('mousedown', handleClickOutside);
 return () => {
 document.removeEventListener('mousedown', handleClickOutside);
};
}, []);

 // Очистка таймера при размонтировании
 useEffect(() => {
 return () => {
 if (debounceRef.current) {
 clearTimeout(debounceRef.current);
}
};
}, []);

 // Сброс выделения при изменении списка предложений
 useEffect(() => {
  setHighlightedIndex(-1);
 }, [suggestions]);

 return (
 <div ref={containerRef} className="relative">
 <Input
 {...field}
 onChange={handleInputChange}
 onKeyDown={handleKeyDown}
 placeholder={placeholder}
 className={`text-sm ${className}`}
 autoComplete="off"
 disabled={disabled}
 role="combobox"
 aria-expanded={isOpen}
 aria-controls={listboxId}
 aria-autocomplete="list"
 aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
 />
 
 {/* Индикатор загрузки */}
 {isLoading && (
 <div className="absolute right-3 top-1/2 -translate-y-1/2">
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
 </div>
 )}

 {/* Выпадающий список предложений */}
 {isOpen && suggestions.length > 0 && (
 <ul id={listboxId} role="listbox" className="absolute z-50 w-full mt-1 bg-[var(--surface-primary)] border border-[var(--border-card)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
 {suggestions.map((item, index) => (
 <li
 key={`${item.name}-${item.id}`}
 id={`${listboxId}-option-${index}`}
 role="option"
 aria-selected={index === highlightedIndex}
 onClick={() => handleSelect(item)}
 className={`px-3 py-2 cursor-pointer hover:bg-[var(--fill-quaternary)] macos-transition flex justify-between items-center text-sm${index === highlightedIndex ? ' bg-[var(--fill-quaternary)]' : ''}`}
 >
 <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
 <div className="flex items-center gap-2">
 <span className={`text-xs px-1.5 py-0.5 rounded ${item.quantity > 0 ? 'bg-[var(--tint-green)] text-[var(--color-green)]' : 'bg-[var(--tint-red)] text-[var(--color-red)]'}`}>
 {item.quantity} {item.unit}
 </span>
 <span className="text-secondary text-xs bg-fill-tertiary px-2 py-0.5 rounded">
 {item.unit}
 </span>
 </div>
 </li>
 ))}
 </ul>
 )}
 </div>
 );
}
