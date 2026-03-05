'use client';

import { useRef, useCallback } from 'react';

export default function SudokuNudge({ style }) {
  const popupRef = useRef(null);

  const openSudokuPopup = useCallback((e) => {
    e.preventDefault();
    if (!popupRef.current || popupRef.current.closed) {
      const w = 520, h = 740;
      const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open('/sudoku', 'privacylens-sudoku', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`);
      if (popup) { popupRef.current = popup; }
    } else {
      popupRef.current.focus();
    }
  }, []);

  return (
    <p style={{ color: 'var(--pl-text-muted)', fontSize: '0.75rem', textAlign: 'center', maxWidth: '480px', ...style }}>
      Not ready to face the truth? That&apos;s fair — you can always just{' '}
      <button
        onClick={openSudokuPopup}
        style={{ color: 'var(--pl-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
      >
        play Sudoku
      </button>
      {' '}instead.
      <br />
      Your data will be harvested either way. Share your sudoku success with friends!
    </p>
  );
}
