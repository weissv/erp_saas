// src/components/DataTable/DataTable.test.tsx
// Unit тесты для DataTable компонента

import { describe, it, expect, vi, beforeEach} from 'vitest';
import { render, screen, fireEvent, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, Column} from './DataTable';

// Мок для URL и Blob
const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
const mockRevokeObjectURL = vi.fn();
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

// Мок для createElement и click
const mockClick = vi.fn();
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
 const element = originalCreateElement(tagName);
 if (tagName === 'a') {
 element.click = mockClick;
}
 return element;
});

interface TestData {
 id: number;
 name: string;
 email: string;
 status: string;
 amount: number;
}

const testData: TestData[] = [
 { id: 1, name: 'Иван Иванов', email: 'ivan@test.com', status: 'active', amount: 1000},
 { id: 2, name: 'Анна Петрова', email: 'anna@test.com', status: 'inactive', amount: 2000},
 { id: 3, name: 'Пётр Сидоров', email: 'petr@test.com', status: 'active', amount: 3000},
];

const testColumns: Column<TestData>[] = [
 { key: 'id', header: 'ID'},
 { key: 'name', header: 'Имя'},
 { key: 'email', header: 'Email'},
 { key: 'status', header: 'Статус'},
 { key: 'amount', header: 'Сумма'},
];

describe('DataTable', () => {
 const defaultProps = {
 data: testData,
 columns: testColumns,
 page: 1,
 pageSize: 10,
 total: 3,
 onPageChange: vi.fn(),
};

 beforeEach(() => {
 vi.clearAllMocks();
});

 describe('Рендеринг', () => {
 it('отображает заголовки колонок', () => {
 render(<DataTable {...defaultProps} />);

 expect(screen.getByText('ID')).toBeInTheDocument();
 expect(screen.getByText('Имя')).toBeInTheDocument();
 expect(screen.getByText('Email')).toBeInTheDocument();
 expect(screen.getByText('Статус')).toBeInTheDocument();
 expect(screen.getByText('Сумма')).toBeInTheDocument();
});

 it('отображает данные в ячейках', () => {
 render(<DataTable {...defaultProps} />);

 expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
 expect(screen.getByText('ivan@test.com')).toBeInTheDocument();
 expect(screen.getByText('active')).toBeInTheDocument();
});

 it('отображает общее количество записей', () => {
 render(<DataTable {...defaultProps} />);

 expect(screen.getByText('Всего: 3')).toBeInTheDocument();
});

 it('отображает текущую страницу и общее количество страниц', () => {
 render(<DataTable {...defaultProps} />);

 expect(screen.getByText('1 / 1')).toBeInTheDocument();
});

 it('отображает сообщение при пустых данных', () => {
 render(<DataTable {...defaultProps} data={[]} total={0} />);

 expect(screen.getByText('Нет данных')).toBeInTheDocument();
});
});

 describe('Пагинация', () => {
 it('вызывает onPageChange при клике на"Вперёд"', async () => {
 const onPageChange = vi.fn();
 render(
 <DataTable
 {...defaultProps}
 total={30}
 pageSize={10}
 onPageChange={onPageChange}
 />
 );

 const nextButton = screen.getByRole('button', { name: /Вперёд/i});
 await userEvent.click(nextButton);

 expect(onPageChange).toHaveBeenCalledWith(2);
});

 it('вызывает onPageChange при клике на"Назад"', async () => {
 const onPageChange = vi.fn();
 render(
 <DataTable
 {...defaultProps}
 page={2}
 total={30}
 pageSize={10}
 onPageChange={onPageChange}
 />
 );

 const prevButton = screen.getByRole('button', { name: /Назад/i});
 await userEvent.click(prevButton);

 expect(onPageChange).toHaveBeenCalledWith(1);
});

 it('отключает кнопку"Назад"на первой странице', () => {
 render(<DataTable {...defaultProps} page={1} />);

 const prevButton = screen.getByRole('button', { name: /Назад/i});
 expect(prevButton).toBeDisabled();
});

 it('отключает кнопку"Вперёд"на последней странице', () => {
 render(
 <DataTable
 {...defaultProps}
 page={3}
 total={30}
 pageSize={10}
 />
 );

 const nextButton = screen.getByRole('button', { name: /Вперёд/i});
 expect(nextButton).toBeDisabled();
});

 it('корректно рассчитывает количество страниц', () => {
 render(
 <DataTable
 {...defaultProps}
 total={25}
 pageSize={10}
 />
 );

 expect(screen.getByText('1 / 3')).toBeInTheDocument();
});
});

 describe('Кастомный рендеринг ячеек', () => {
 it('использует кастомный render для колонки', () => {
 const customColumns: Column<TestData>[] = [
 ...testColumns.slice(0, 3),
 {
 key: 'status',
 header: 'Статус',
 render: (row) => (
 <span data-testid="custom-status"className={row.status === 'active' ? 'green' : 'red'}>
 {row.status === 'active' ? 'Активен' : 'Неактивен'}
 </span>
 ),
},
 testColumns[4],
 ];

 render(<DataTable {...defaultProps} columns={customColumns} />);

 const customStatuses = screen.getAllByTestId('custom-status');
 expect(customStatuses).toHaveLength(3);
 expect(customStatuses[0]).toHaveTextContent('Активен');
 expect(customStatuses[1]).toHaveTextContent('Неактивен');
});
});

 describe('Экспорт CSV', () => {
 it('экспортирует данные в CSV при клике на кнопку', async () => {
 render(<DataTable {...defaultProps} />);

 const exportButton = screen.getByRole('button', { name: /Экспорт CSV/i});
 await userEvent.click(exportButton);

 expect(mockCreateObjectURL).toHaveBeenCalled();
 expect(mockClick).toHaveBeenCalled();
 expect(mockRevokeObjectURL).toHaveBeenCalled();
});
});

 describe('Опция wrapCells', () => {
 it('применяет классы для переноса текста когда wrapCells=true', () => {
 const { container} = render(<DataTable {...defaultProps} wrapCells={true} />);

 const table = container.querySelector('table');
 expect(table).toHaveClass('table-fixed');

 const headerCells = container.querySelectorAll('th');
 headerCells.forEach((cell) => {
 expect(cell).toHaveClass('whitespace-normal');
 expect(cell).toHaveClass('break-words');
});
});

 it('применяет классы без переноса когда wrapCells=false', () => {
 const { container} = render(<DataTable {...defaultProps} wrapCells={false} />);

 const table = container.querySelector('table');
 expect(table).not.toHaveClass('table-fixed');

 const headerCells = container.querySelectorAll('th');
 headerCells.forEach((cell) => {
 expect(cell).toHaveClass('whitespace-nowrap');
});
});
});

 describe('Обработка null/undefined значений', () => {
 it('отображает пустую строку для null значений', () => {
 const dataWithNull: TestData[] = [
 { id: 1, name: 'Тест', email: null as any, status: 'active', amount: 1000},
 ];

 render(<DataTable {...defaultProps} data={dataWithNull} total={1} />);

 const rows = screen.getAllByRole('row');
 expect(rows).toHaveLength(2); // header + 1 data row
});

 it('отображает пустую строку для undefined значений', () => {
 const dataWithUndefined: Partial<TestData>[] = [
 { id: 1, name: 'Тест', status: 'active'},
 ];

 render(<DataTable {...defaultProps} data={dataWithUndefined as TestData[]} total={1} />);

 const rows = screen.getAllByRole('row');
 expect(rows).toHaveLength(2);
});
});

 describe('Доступность (a11y)', () => {
 it('таблица имеет корректную структуру', () => {
 const { container} = render(<DataTable {...defaultProps} />);

 expect(container.querySelector('table')).toBeInTheDocument();
 expect(container.querySelector('thead')).toBeInTheDocument();
 expect(container.querySelector('tbody')).toBeInTheDocument();
});

 it('кнопки пагинации доступны для keyboard navigation', () => {
 render(<DataTable {...defaultProps} total={30} pageSize={10} />);

 const buttons = screen.getAllByRole('button');
 buttons.forEach((button) => {
 expect(button).not.toHaveAttribute('tabindex', '-1');
});
});
});
});
