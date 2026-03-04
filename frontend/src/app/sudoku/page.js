'use client';

import { useState, useEffect, useRef } from 'react';
import SudokuGame from '@/components/SudokuGame';

export default function SudokuPage() {
  const [scanDone, setScanDone] = useState(false);
  const [scanSteps, setScanSteps] = useState([]);
  const stepsEndRef = useRef(null);

  useEffect(() => {
    const ch = new BroadcastChannel('pl_scan');
    ch.onmessage = (e) => {
      if (e.data.type === 'scan_start') {
        setScanDone(false);
        setScanSteps([]);
      } else if (e.data.type === 'scan_progress') {
        setScanSteps((prev) => [...prev, e.data.msg]);
      } else if (e.data.type === 'scan_complete') {
        setScanDone(true);
      } else if (e.data.type === 'scan_error') {
        setScanSteps((prev) => [...prev, 'Scan failed.']);
      }
    };
    return () => ch.close();
  }, []);

  // Auto-scroll progress log
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scanSteps]);

  const isScanning = !scanDone && scanSteps.length > 0;

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
          PolicyLens Sudoku
        </h1>
        <p style={{ color: 'var(--pl-text-dim)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
          {scanDone
            ? 'Scan finished — your results are waiting!'
            : isScanning
              ? 'Scanning your privacy policies...'
              : 'Play while we scan your privacy policies.'}
        </p>
      </div>

      {/* Progress log */}
      {(isScanning || scanDone) && (
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'var(--pl-surface)',
            border: `1px solid ${scanDone ? 'var(--pl-accent)' : 'var(--pl-border)'}`,
            boxShadow: scanDone ? '0 0 20px rgba(0, 229, 255, 0.2)' : 'none',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        >
          {scanSteps.map((step, i) => (
            <p
              key={i}
              style={{
                color: i === scanSteps.length - 1 && !scanDone ? 'var(--pl-accent)' : 'var(--pl-text-muted)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                margin: '2px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ opacity: 0.5 }}>›</span>
              {step}
            </p>
          ))}
          {scanDone && (
            <p
              style={{
                color: 'var(--pl-accent)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                margin: '4px 0 0',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>✓</span> Report ready in the main window.
            </p>
          )}
          <div ref={stepsEndRef} />
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
      {!scanDone && !isScanning && (
        <p style={{ color: 'var(--pl-text-muted)', fontSize: '0.75rem', textAlign: 'center', maxWidth: '320px' }}>
          Start a scan from the main window to see live progress here.
        </p>
      )}
    </main>
  );
}
