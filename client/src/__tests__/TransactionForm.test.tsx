import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/transactions', () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}));

import TransactionForm from '../components/TransactionForm';
import * as txApi from '../api/transactions';

const noop = vi.fn();

describe('TransactionForm — Add Transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Field rendering
  // ---------------------------------------------------------------------------
  it('renders all required fields and action buttons for an expense', () => {
    render(<TransactionForm onSuccess={noop} onCancel={noop} />);

    // Labels (TransactionForm uses un-associated <label> elements, so query by text)
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText(/^note/i)).toBeInTheDocument();

    // Inputs / interactive elements
    expect(screen.getByPlaceholderText('e.g. Grocery run')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();            // amount
    expect(screen.getByDisplayValue('Select a category')).toBeInTheDocument(); // category

    // Action buttons
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
  });

  it('shows expense-only fields (Category, Payment method, Purchase type) by default', () => {
    render(<TransactionForm onSuccess={noop} onCancel={noop} />);
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Select a payment method')).toBeInTheDocument();
    expect(screen.getByText('Purchase type')).toBeInTheDocument();
  });

  it('hides expense-only fields when the Income type is selected', async () => {
    render(<TransactionForm onSuccess={noop} onCancel={noop} />);
    await userEvent.click(screen.getByRole('button', { name: /income/i }));
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
    expect(screen.queryByText(/payment method/i)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Required-field validation
  // ---------------------------------------------------------------------------
  it('does not call createTransaction when the title is empty', async () => {
    render(<TransactionForm onSuccess={noop} onCancel={noop} />);
    // Leave title empty; type a valid amount to isolate the title check
    await userEvent.type(screen.getByRole('spinbutton'), '10');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(txApi.createTransaction).not.toHaveBeenCalled();
  });

  it('does not call createTransaction when the category is empty (expense)', async () => {
    render(<TransactionForm onSuccess={noop} onCancel={noop} />);
    const user = userEvent.setup();
    // Fill in title and amount but leave category unselected
    await user.type(screen.getByPlaceholderText('e.g. Grocery run'), 'Coffee');
    await user.clear(screen.getByRole('spinbutton'));
    await user.type(screen.getByRole('spinbutton'), '5');
    // Category stays at the empty default "Select a category"
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(txApi.createTransaction).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Successful submission
  // ---------------------------------------------------------------------------
  it('calls createTransaction with the entered values on valid submission', async () => {
    vi.mocked(txApi.createTransaction).mockResolvedValue(undefined as never);

    render(<TransactionForm onSuccess={noop} onCancel={noop} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('e.g. Grocery run'), 'Coffee');
    await user.clear(screen.getByRole('spinbutton'));
    await user.type(screen.getByRole('spinbutton'), '5.5');
    await user.selectOptions(screen.getByDisplayValue('Select a category'), 'food');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(txApi.createTransaction).toHaveBeenCalledOnce();
      expect(txApi.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Coffee', amount: 5.5, type: 'expense', category: 'food' }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Cancel button
  // ---------------------------------------------------------------------------
  it('calls onCancel when the Cancel button is clicked', async () => {
    render(<TransactionForm onSuccess={noop} onCancel={noop} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(noop).toHaveBeenCalled();
  });
});
