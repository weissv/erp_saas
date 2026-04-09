// src/components/ui/input.test.tsx
// Unit тесты для Input компонента

import { describe, it, expect, vi} from 'vitest';
import { render, screen, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input} from './input';
import { createRef} from 'react';

describe('Input', () => {
 describe('Рендеринг', () => {
 it('рендерит input элемент', () => {
 render(<Input />);

 expect(screen.getByRole('textbox')).toBeInTheDocument();
});

 it('применяет переданный className', () => {
 render(<Input className="custom-input"/>);

 expect(screen.getByRole('textbox')).toHaveClass('custom-input');
});

 it('передаёт дополнительные props', () => {
 render(<Input placeholder="Введите текст"name="testInput"/>);

 const input = screen.getByRole('textbox');
 expect(input).toHaveAttribute('placeholder', 'Введите текст');
 expect(input).toHaveAttribute('name', 'testInput');
});

 it('поддерживает type prop', () => {
 render(<Input type="email"/>);

 // email тип не имеет роли textbox, используем querySelector
 const input = document.querySelector('input[type="email"]');
 expect(input).toBeInTheDocument();
});

 it('поддерживает password type', () => {
 render(<Input type="password"data-testid="password-input"/>);

 const input = screen.getByTestId('password-input');
 expect(input).toHaveAttribute('type', 'password');
});
});

 describe('Взаимодействие', () => {
 it('обрабатывает ввод текста', async () => {
 const user = userEvent.setup();
 render(<Input />);

 const input = screen.getByRole('textbox');
 await user.type(input, 'Тестовый текст');

 expect(input).toHaveValue('Тестовый текст');
});

 it('вызывает onChange при вводе', async () => {
 const user = userEvent.setup();
 const onChange = vi.fn();
 render(<Input onChange={onChange} />);

 const input = screen.getByRole('textbox');
 await user.type(input, 'a');

 expect(onChange).toHaveBeenCalled();
});

 it('вызывает onFocus при фокусе', async () => {
 const user = userEvent.setup();
 const onFocus = vi.fn();
 render(<Input onFocus={onFocus} />);

 const input = screen.getByRole('textbox');
 await user.click(input);

 expect(onFocus).toHaveBeenCalledTimes(1);
});

 it('вызывает onBlur при потере фокуса', async () => {
 const user = userEvent.setup();
 const onBlur = vi.fn();
 render(<Input onBlur={onBlur} />);

 const input = screen.getByRole('textbox');
 await user.click(input);
 await user.tab();

 expect(onBlur).toHaveBeenCalledTimes(1);
});
});

 describe('Состояние disabled', () => {
 it('отключает input когда disabled=true', () => {
 render(<Input disabled />);

 expect(screen.getByRole('textbox')).toBeDisabled();
});

 it('не позволяет ввод когда disabled', async () => {
 const user = userEvent.setup();
 render(<Input disabled />);

 const input = screen.getByRole('textbox');
 await user.type(input, 'test');

 expect(input).toHaveValue('');
});
});

 describe('Состояние readOnly', () => {
 it('делает input только для чтения', () => {
 render(<Input readOnly value="Read only value"/>);

 const input = screen.getByRole('textbox');
 expect(input).toHaveAttribute('readonly');
 expect(input).toHaveValue('Read only value');
});
});

 describe('Ref forwarding', () => {
 it('передаёт ref на input элемент', () => {
 const ref = createRef<HTMLInputElement>();
 render(<Input ref={ref} />);

 expect(ref.current).toBeInstanceOf(HTMLInputElement);
});

 it('позволяет вызывать методы через ref', () => {
 const ref = createRef<HTMLInputElement>();
 render(<Input ref={ref} />);

 ref.current?.focus();
 expect(document.activeElement).toBe(ref.current);
});
});

 describe('Стили', () => {
		it('имеет базовые классы', () => {
			render(<Input />);

			const input = screen.getByRole('textbox');
			expect(input).toHaveClass('mezon-field');
		});
	});

 describe('Контролируемый компонент', () => {
 it('отображает контролируемое значение', () => {
 render(<Input value="Controlled value"onChange={() => {}} />);

 expect(screen.getByRole('textbox')).toHaveValue('Controlled value');
});

 it('обновляется при изменении value prop', () => {
 const { rerender} = render(<Input value="Initial"onChange={() => {}} />);
 
 expect(screen.getByRole('textbox')).toHaveValue('Initial');

 rerender(<Input value="Updated"onChange={() => {}} />);
 
 expect(screen.getByRole('textbox')).toHaveValue('Updated');
});
});

 describe('Неконтролируемый компонент', () => {
 it('использует defaultValue', () => {
 render(<Input defaultValue="Default text"/>);

 expect(screen.getByRole('textbox')).toHaveValue('Default text');
});

 it('позволяет изменять значение с defaultValue', async () => {
 const user = userEvent.setup();
 render(<Input defaultValue="Default"/>);

 const input = screen.getByRole('textbox');
 await user.clear(input);
 await user.type(input, 'New value');

 expect(input).toHaveValue('New value');
});
});

 describe('Доступность (a11y)', () => {
 it('поддерживает aria-label', () => {
 render(<Input aria-label="Поле ввода имени"/>);

 expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Поле ввода имени');
});

 it('поддерживает aria-describedby', () => {
 render(
 <>
 <Input aria-describedby="hint-text"/>
 <span id="hint-text">Подсказка</span>
 </>
 );

 expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'hint-text');
});

 it('поддерживает aria-invalid', () => {
 render(<Input aria-invalid="true"/>);

 expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
});

 it('поддерживает aria-required', () => {
 render(<Input aria-required="true"/>);

 expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
});
});
});
