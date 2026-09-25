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
});
