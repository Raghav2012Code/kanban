import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardForm } from '../CardForm';

async function fillTitleAndSave() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Card title'), 'Task');
  await user.click(screen.getByRole('button', { name: 'Save card' }));
  return user;
}

describe('CardForm', () => {
  it('saves a card with a future due date immediately', async () => {
    const onSave = vi.fn();
    render(<CardForm onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2999-01-01' } });
    await fillTitleAndSave();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Task', dueDate: '2999-01-01' }));
  });

  it('keeps a blank due date dateless', async () => {
    const onSave = vi.fn();
    render(<CardForm onSave={onSave} onCancel={vi.fn()} />);
    await fillTitleAndSave();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Task', dueDate: '' }));
  });

  it('requires explicit confirmation before saving a past due date', async () => {
    const onSave = vi.fn();
    render(<CardForm onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2000-01-01' } });
    const user = await fillTitleAndSave();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/in the past/i);
    await user.click(screen.getByRole('button', { name: 'Save anyway' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Task', dueDate: '2000-01-01' }));
  });

  it('shows error message and focuses input when submitting an empty title', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<CardForm onSave={onSave} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save card' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/card title is required/i);
    expect(screen.getByLabelText('Card title')).toHaveFocus();

    // The error is described as well as alerted, so a field that regains focus
    // still explains why the save was refused.
    const alert = screen.getByRole('alert');
    expect(screen.getByLabelText('Card title')).toHaveAttribute('aria-describedby', alert.id);
    expect(document.getElementById(alert.id)).toBe(alert);
  });

  it('describes a field with its own error, and holds no reference when there is none', async () => {
    const user = userEvent.setup();
    render(<CardForm onSave={vi.fn()} onCancel={vi.fn()} />);

    // No error yet: a reference to a missing element would be a dangling idref.
    expect(screen.getByLabelText('Card title')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText('Due date')).not.toHaveAttribute('aria-describedby');

    // A title error describes the title only: announcing "Card title is required"
    // while the due date has focus would be misleading.
    await user.click(screen.getByRole('button', { name: 'Save card' }));
    const titleError = screen.getByRole('alert').id;
    expect(titleError).not.toBe('');
    expect(screen.getByLabelText('Card title')).toHaveAttribute('aria-describedby', titleError);
    expect(screen.getByLabelText('Due date')).not.toHaveAttribute('aria-describedby');

    // A due-date error is the mirror image of it.
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2000-01-01' } });
    await user.type(screen.getByLabelText('Card title'), 'Task');
    await user.click(screen.getByRole('button', { name: 'Save card' }));
    const dueError = screen.getByRole('alert').id;
    expect(screen.getByLabelText('Due date')).toHaveAttribute('aria-describedby', dueError);
    expect(screen.getByLabelText('Card title')).not.toHaveAttribute('aria-describedby');
  });

  it('keeps each field id unique across coexisting forms, so no label points at the wrong input', () => {
    const { container } = render(
      <>
        <CardForm onSave={vi.fn()} onCancel={vi.fn()} />
        <CardForm onSave={vi.fn()} onCancel={vi.fn()} />
      </>,
    );
    const forms = Array.from(container.querySelectorAll('form'));
    expect(forms).toHaveLength(2);

    const ids = Array.from(container.querySelectorAll<HTMLElement>('[id]')).map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const form of forms) {
      const ownIds = new Set(Array.from(form.querySelectorAll<HTMLElement>('[id]')).map((element) => element.id));
      for (const label of Array.from(form.querySelectorAll('label[for]'))) {
        expect(ownIds.has(label.getAttribute('for') ?? '')).toBe(true);
      }
    }
  });
});
