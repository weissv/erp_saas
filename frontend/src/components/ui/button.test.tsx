// src/components/ui/button.test.tsx
// Unit тесты для Button компонента

import { describe, it, expect, vi} from 'vitest';
import { render, screen, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button} from './button';

describe('Button', () => {
 describe('Рендеринг', () => {
 it('отображает текст кнопки', () => {
 render(<Button>Нажми меня</Button>);

 expect(screen.getByRole('button')).toHaveTextContent('Нажми меня');
});

 it('применяет переданный className', () => {
 render(<Button className="custom-class">Тест</Button>);

 expect(screen.getByRole('button')).toHaveClass('custom-class');
});

 it('передаёт дополнительные props', () => {
 render(<Button data-testid="test-button"type="submit">Отправить</Button>);

 const button = screen.getByTestId('test-button');
 expect(button).toHaveAttribute('type', 'submit');
});
});

 describe('Варианты (variants)', () => {
 it('применяет default вариант по умолчанию', () => {
 render(<Button>Default</Button>);

 const button = screen.getByRole('button');
 expect(button).toHaveClass('bg-macos-blue');
 expect(button).toHaveClass('text-white');
});

 it('применяет outline вариант', () => {
 render(<Button variant="outline">Outline</Button>);

 const button = screen.getByRole('button');
 expect(button).toHaveClass('border-2');
 expect(button).toHaveClass('border-macos-blue');
});

 it('применяет ghost вариант', () => {
 render(<Button variant="ghost">Ghost</Button>);

 const button = screen.getByRole('button');
 expect(button).toHaveClass('text-macos-blue');
});

 it('применяет secondary вариант', () => {
 render(<Button variant="secondary">Secondary</Button>);

 const button = screen.getByRole('button');
 expect(button).toHaveClass('bg-[var(--mezon-sand)]');
});

 it('применяет destructive вариант', () => {
 render(<Button variant="destructive">Удалить</Button>);

 const button = screen.getByRole('button');
 expect(button).toHaveClass('bg-red-600');
 expect(button).toHaveClass('text-white');
});
});

 describe('Размеры (sizes)', () => {
 it('применяет md размер по умолчанию', () => {
 render(<Button>Medium</Button>);

 const button = screen.getByRole('button');
 expect(button).toHaveClass('px-5');
 expect(button).toHaveClass('py-2.5');
});

 it('применяет sm размер', () => {
 render(<Button size="sm">Small</Button>);

 const button = screen.getByRole('button');
 expect(button).toHaveClass('px-3');
 expect(button).toHaveClass('py-2');
 expect(button).toHaveClass('text-sm');
});

 it('применяет lg размер', () => {
 render(<Button size="lg">Large</Button>);

 const button = screen.getByRole('button');
 expect(button).toHaveClass('px-7');
 expect(button).toHaveClass('py-3.5');
 expect(button).toHaveClass('text-lg');
});
});

 describe('Состояние disabled', () => {
 it('применяет стили для disabled', () => {
 render(<Button disabled>Disabled</Button>);

 const button = screen.getByRole('button');
 expect(button).toBeDisabled();
 expect(button).toHaveClass('disabled:opacity-50');
 expect(button).toHaveClass('disabled:cursor-not-allowed');
});

 it('не вызывает onClick когда disabled', async () => {
 const user = userEvent.setup();
 const onClick = vi.fn();

 render(<Button disabled onClick={onClick}>Disabled</Button>);

 await user.click(screen.getByRole('button'));

 expect(onClick).not.toHaveBeenCalled();
});
});

 describe('Взаимодействие', () => {
 it('вызывает onClick при клике', async () => {
 const user = userEvent.setup();
 const onClick = vi.fn();

 render(<Button onClick={onClick}>Кликни</Button>);

 await user.click(screen.getByRole('button'));

 expect(onClick).toHaveBeenCalledTimes(1);
});

 it('поддерживает keyboard navigation', async () => {
 const user = userEvent.setup();
 const onClick = vi.fn();

 render(<Button onClick={onClick}>Кнопка</Button>);

 const button = screen.getByRole('button');
 button.focus();
 await user.keyboard('{Enter}');

 expect(onClick).toHaveBeenCalledTimes(1);
});

 it('реагирует на пробел', async () => {
 const user = userEvent.setup();
 const onClick = vi.fn();

 render(<Button onClick={onClick}>Кнопка</Button>);

 const button = screen.getByRole('button');
 button.focus();
 await user.keyboard(' ');

 expect(onClick).toHaveBeenCalledTimes(1);
});
});

 describe('Доступность (a11y)', () => {
 it('имеет role="button"', () => {
 render(<Button>Accessible</Button>);

 expect(screen.getByRole('button')).toBeInTheDocument();
});

 it('может принимать aria-label', () => {
 render(<Button aria-label="Close dialog">×</Button>);

 expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
});

 it('поддерживает aria-disabled', () => {
 render(<Button aria-disabled="true">Aria Disabled</Button>);

 expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
});
});

 describe('Базовые стили', () => {
 it('имеет rounded-full класс', () => {
 render(<Button>Round</Button>);

 expect(screen.getByRole('button')).toHaveClass('rounded-full');
});

 it('имеет macos-transition класс', () => {
 render(<Button>Transition</Button>);

 expect(screen.getByRole('button')).toHaveClass('macos-transition');
});

 it('имеет touch-manipulation класс', () => {
 render(<Button>Touch</Button>);

 expect(screen.getByRole('button')).toHaveClass('touch-manipulation');
});
});
});
