// src/components/ui/InventoryAutocomplete.tsx
import { useState, useEffect, useRef} from 'react';
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
 const debounceRef = useRef<NodeJS.Timeout | null>(null);
 const containerRef = useRef<HTMLDivElement>(null);

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
 onSelect(item);
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

 return (
 <div ref={containerRef} className="relative">
 <Input
 {...field}
 onChange={handleInputChange}
 placeholder={placeholder}
 className={`text-sm ${className}`}
 autoComplete="off"
 disabled={disabled}
 />
 
 {/* Индикатор загрузки */}
 {isLoading && (
 <div className="absolute right-3 top-1/2 -translate-y-1/2">
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
 </div>
 )}

 {/* Выпадающий список предложений */}
 {isOpen && suggestions.length > 0 && (
 <ul className="absolute z-50 w-full mt-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
 {suggestions.map((item, index) => (
 <li
 key={`${item.name}-${item.id}`}
 onClick={() => handleSelect(item)}
 className="px-3 py-2 cursor-pointer hover:bg-blue-50 macos-transition flex justify-between items-center text-sm"
 >
 <span className="font-medium text-gray-800">{item.name}</span>
 <div className="flex items-center gap-2">
 <span className={`text-xs px-1.5 py-0.5 rounded ${item.quantity > 0 ? 'bg-[rgba(52,199,89,0.12)] text-green-700' : 'bg-[rgba(255,59,48,0.12)] text-red-700'}`}>
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
