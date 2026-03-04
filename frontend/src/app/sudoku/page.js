'use client';

import { useState, useEffect } from 'react';
import SudokuGame from '@/components/SudokuGame';

export default function SudokuPage() {
  const [scanDone, setScanDone] = useState(false);

  useEffect(() => {
    // Check if scan already finished before this window opened
    if (sessionStorage.getItem('pl_scan_done')) {
      setScanDone(true);
    }

    const handleStorage = (e) => {
      if (e.key === 'pl_scan_done' && e.newValue) {
        setScanDone(true);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '24px 16px',
        background: 'var(--pl-bg)',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--pl-accent), #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '6px',
          }}
        >
          PrivacyLens Sudoku
        </h1>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
          {scanDone ? 'Scan finished — your results are waiting!' : 'Your privacy is being scanned. Relax.'}
        </p>
      </div>

      {/* Scan complete banner */}
      {scanDone && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 20px',
            borderRadius: '10px',
            background: 'var(--pl-surface)',
            border: '1px solid var(--pl-accent)',
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)',
            animation: 'fadeInUp 0.4s ease forwards',
            textAlign: 'center',
            width: '100%',
            maxWidth: '380px',
          }}
        >
          <span style={{ color: 'var(--pl-accent)', fontSize: '1.1rem' }}>✓</span>
          <span style={{ color: 'var(--pl-text)', fontSize: '0.85rem', fontWeight: 500 }}>
            Scan complete! Your privacy report is ready in the main window.
          </span>
        </div>
      )}

      {/* Game */}
      <div
        style={{
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid var(--pl-border)',
          background: 'var(--pl-surface)',
        }}
      >
        <SudokuGame scanDone={scanDone} />
      </div>

      {/* Footer nudge */}
      {!scanDone && (
        <p style={{ color: 'var(--pl-text-muted)', fontSize: '0.75rem', textAlign: 'center', maxWidth: '320px' }}>
          Results will appear in the main window when the scan finishes.
        </p>
      )}
    </main>
  );
}
