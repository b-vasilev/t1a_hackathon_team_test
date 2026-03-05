import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SudokuNudge from './SudokuNudge';

describe('SudokuNudge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the play Sudoku button', () => {
    render(<SudokuNudge />);
    expect(screen.getByText('play Sudoku')).toBeTruthy();
  });

  it('renders the nudge text', () => {
    render(<SudokuNudge />);
    expect(screen.getByText(/Not ready to face the truth/)).toBeTruthy();
  });

  it('opens a popup window on click', () => {
    const mockPopup = { closed: false, focus: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPopup);

    render(<SudokuNudge />);
    fireEvent.click(screen.getByText('play Sudoku'));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toBe('/sudoku');
    expect(openSpy.mock.calls[0][1]).toBe('privacylens-sudoku');
  });

  it('focuses existing popup on second click', () => {
    const mockPopup = { closed: false, focus: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup);

    render(<SudokuNudge />);
    const button = screen.getByText('play Sudoku');

    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockPopup.focus).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledTimes(1);
  });

  it('reopens popup if previous one was closed', () => {
    const closedPopup = { closed: true, focus: vi.fn() };
    const newPopup = { closed: false, focus: vi.fn() };
    vi.spyOn(window, 'open')
      .mockReturnValueOnce(closedPopup)
      .mockReturnValueOnce(newPopup);

    render(<SudokuNudge />);
    const button = screen.getByText('play Sudoku');

    fireEvent.click(button);
    fireEvent.click(button);

    expect(window.open).toHaveBeenCalledTimes(2);
  });

  it('applies custom style prop', () => {
    const { container } = render(<SudokuNudge style={{ marginTop: '20px' }} />);
    const p = container.querySelector('p');
    expect(p.style.marginTop).toBe('20px');
  });
});
