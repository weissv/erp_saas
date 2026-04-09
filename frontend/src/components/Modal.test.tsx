import { afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import { cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal} from './Modal';

describe('Modal', () => {
 const defaultProps = {
 isOpen: true,
 onClose: vi.fn(),
 title: 'Test Modal',
 children: <div>Modal content</div>,
};

 beforeEach(() => {
 vi.clearAllMocks();
});

 afterEach(() => {
 cleanup();
 document.body.style.overflow = '';
 document.body.style.paddingRight = '';
});

 it('не рендерит диалог когда isOpen=false', () => {
 render(
 <Modal {...defaultProps} isOpen={false}>
 Content
 </Modal>
 );

 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

 it('рендерит модалку через portal', () => {
 render(<Modal {...defaultProps} />);

 expect(document.body.querySelector('.mezon-modal-root')).toBeInTheDocument();
 expect(screen.getByRole('dialog')).toBeInTheDocument();
 expect(screen.getByText('Modal content')).toBeInTheDocument();
});

 it('отображает описание и footer', () => {
 render(
 <Modal
 {...defaultProps}
 description="Helpful description"
 footer={<button type="button">Footer action</button>}
 />,
 );

 expect(screen.getByText('Helpful description')).toBeInTheDocument();
 expect(screen.getByRole('button', { name: /footer action/i})).toBeInTheDocument();
});

 it('блокирует скролл body при открытии', () => {
 render(<Modal {...defaultProps} />);

 expect(document.body.style.overflow).toBe('hidden');
});

 it('закрывается по кнопке закрытия', async () => {
 const user = userEvent.setup();
 const onClose = vi.fn();

 render(<Modal {...defaultProps} onClose={onClose} />);

 await user.click(screen.getByRole('button', { name: /закрыть/i}));

 expect(onClose).toHaveBeenCalledTimes(1);
});

 it('закрывается по клику на overlay', async () => {
 const user = userEvent.setup();
 const onClose = vi.fn();

 render(<Modal {...defaultProps} onClose={onClose} />);

 const overlay = document.body.querySelector('.mezon-modal-overlay');
 expect(overlay).toBeTruthy();

 await user.click(overlay as Element);

 expect(onClose).toHaveBeenCalledTimes(1);
});

 it('не закрывается по overlay при closeOnBackdrop=false', async () => {
 const user = userEvent.setup();
 const onClose = vi.fn();

 render(<Modal {...defaultProps} onClose={onClose} closeOnBackdrop={false} />);

 const overlay = document.body.querySelector('.mezon-modal-overlay');
 expect(overlay).toBeTruthy();

 await user.click(overlay as Element);

 expect(onClose).not.toHaveBeenCalled();
});

 it('закрывается по Escape по умолчанию', async () => {
 const user = userEvent.setup();
 const onClose = vi.fn();

 render(<Modal {...defaultProps} onClose={onClose} />);
 await user.keyboard('{Escape}');

 expect(onClose).toHaveBeenCalledTimes(1);
});

 it('не закрывается по Escape при closeOnEscape=false', async () => {
 const user = userEvent.setup();
 const onClose = vi.fn();

 render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);
 await user.keyboard('{Escape}');

 expect(onClose).not.toHaveBeenCalled();
});

 it('использует класс размера и отдельный body для скролла', () => {
 render(<Modal {...defaultProps} size="xl" />);

 const surface = document.body.querySelector('.mezon-modal-surface');
 const body = document.body.querySelector('.mezon-modal-body');

 expect(surface).toHaveClass('max-w-5xl');
 expect(body).toBeInTheDocument();
});

 it('возвращает фокус после закрытия', () => {
 const trigger = document.createElement('button');
 trigger.textContent = 'Open';
 document.body.appendChild(trigger);
 trigger.focus();

 const { rerender} = render(<Modal {...defaultProps} />);

 rerender(<Modal {...defaultProps} isOpen={false} />);

 expect(document.activeElement).toBe(trigger);
 trigger.remove();
});
});
