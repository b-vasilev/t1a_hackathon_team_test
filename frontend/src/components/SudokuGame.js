'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Three verified classic Sudoku puzzles (0 = empty)
const PUZZLES = [
  {
    label: 'Classic #1',
    given: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  },
  {
    label: 'Classic #2',
    given: '003020600900305001001806400008102900700000008006708200002609500800203009005010300',
  },
  {
    label: 'Classic #3',
    given: '800000000003600000070090200060005030004000100030010060020080070500300040000020000',
  },
];

function parsePuzzle(str) {
  return str.split('').map(Number);
}

function getConflicts(board) {
  const conflicts = new Set();
  for (let i = 0; i < 81; i++) {
    if (board[i] === 0) { continue; }
    const row = Math.floor(i / 9);
    const col = i % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let j = 0; j < 81; j++) {
      if (i === j || board[j] === 0 || board[j] !== board[i]) { continue; }
      const jr = Math.floor(j / 9);
      const jc = j % 9;
      const sameRow = jr === row;
      const sameCol = jc === col;
      const sameBox = Math.floor(jr / 3) * 3 === boxRow && Math.floor(jc / 3) * 3 === boxCol;
      if (sameRow || sameCol || sameBox) {
        conflicts.add(i);
        conflicts.add(j);
      }
    }
  }
  return conflicts;
}

export default function SudokuGame({ scanDone = false }) {
  const [puzzleIdx, setPuzzleIdx] = useState(() => Math.floor(Math.random() * PUZZLES.length));
  const [given, setGiven] = useState(() => parsePuzzle(PUZZLES[puzzleIdx].given));
  const [board, setBoard] = useState(() => parsePuzzle(PUZZLES[puzzleIdx].given));
  const [selected, setSelected] = useState(null);
  const [solved, setSolved] = useState(false);
  const [conflicts, setConflicts] = useState(new Set());
  const containerRef = useRef(null);

  const loadPuzzle = useCallback((idx) => {
    const g = parsePuzzle(PUZZLES[idx].given);
    setGiven(g);
    setBoard([...g]);
    setSelected(null);
    setSolved(false);
    setConflicts(new Set());
  }, []);

  useEffect(() => {
    loadPuzzle(puzzleIdx);
  }, [puzzleIdx, loadPuzzle]);

  const applyInput = useCallback((val) => {
    if (selected === null || given[selected] !== 0) { return; }
    const newBoard = [...board];
    newBoard[selected] = val;
    setBoard(newBoard);
    const newConflicts = getConflicts(newBoard);
    setConflicts(newConflicts);
    if (newConflicts.size === 0 && newBoard.every((v) => v !== 0)) {
      setSolved(true);
    }
  }, [selected, given, board]);

  const handleKeyDown = useCallback((e) => {
    if (selected === null) { return; }
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      e.preventDefault();
      applyInput(num);
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      applyInput(0);
    } else if (e.key === 'ArrowRight') { e.preventDefault(); setSelected((s) => s !== null && s % 9 < 8 ? s + 1 : s); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); setSelected((s) => s !== null && s % 9 > 0 ? s - 1 : s); }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); setSelected((s) => s !== null && s < 72 ? s + 9 : s); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setSelected((s) => s !== null && s > 8  ? s - 9 : s); }
  }, [selected, applyInput]);

  const nextPuzzle = () => {
    const next = (puzzleIdx + 1) % PUZZLES.length;
    setPuzzleIdx(next);
  };

  const cellStyle = (idx) => {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const isGiven = given[idx] !== 0;
    const isSelected = selected === idx;
    const isConflict = conflicts.has(idx);
    const isSameRowCol = selected !== null && (
      Math.floor(selected / 9) === row || selected % 9 === col
    );

    let bg = 'var(--pl-surface)';
    let borderColor = 'var(--pl-border)';
    let color = 'var(--pl-text)';
    const fontWeight = isGiven ? 700 : 400;
    let boxShadow = 'none';

    if (solved) {
      bg = 'rgba(0, 229, 255, 0.12)';
      color = 'var(--pl-accent)';
    } else if (isConflict) {
      bg = 'rgba(255, 23, 68, 0.15)';
      borderColor = 'rgba(255, 23, 68, 0.5)';
      color = '#ff5252';
    } else if (isSelected) {
      bg = 'rgba(0, 229, 255, 0.2)';
      borderColor = 'var(--pl-accent)';
      boxShadow = '0 0 8px rgba(0, 229, 255, 0.4)';
    } else if (isSameRowCol) {
      bg = 'rgba(0, 229, 255, 0.05)';
    } else if (isGiven) {
      bg = 'rgba(255,255,255,0.04)';
    }

    // Thick box borders (every 3rd line)
    const borderRight  = col % 3 === 2 && col !== 8 ? '2px solid rgba(255,255,255,0.25)' : `1px solid ${borderColor}`;
    const borderBottom = row % 3 === 2 && row !== 8 ? '2px solid rgba(255,255,255,0.25)' : `1px solid ${borderColor}`;
    const borderLeft   = col === 0 ? '2px solid rgba(255,255,255,0.25)' : undefined;
    const borderTop    = row === 0 ? '2px solid rgba(255,255,255,0.25)' : undefined;
    const borderRightEdge  = col === 8 ? '2px solid rgba(255,255,255,0.25)' : undefined;
    const borderBottomEdge = row === 8 ? '2px solid rgba(255,255,255,0.25)' : undefined;

    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      fontSize: '0.95rem',
      fontWeight,
      cursor: isGiven ? 'default' : 'pointer',
      background: bg,
      color,
      boxShadow,
      transition: 'background 0.1s, box-shadow 0.1s',
      borderRight:  borderRightEdge  || borderRight,
      borderBottom: borderBottomEdge || borderBottom,
      borderLeft:   borderLeft   || `1px solid ${borderColor}`,
      borderTop:    borderTop    || `1px solid ${borderColor}`,
      userSelect: 'none',
      fontFamily: 'var(--font-mono)',
    };
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => {}}
      style={{ outline: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
    >
      {/* Puzzle header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: 'var(--pl-text-dim)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
          {PUZZLES[puzzleIdx].label}
        </span>
        <button
          onClick={nextPuzzle}
          style={{
            fontSize: '0.75rem',
            padding: '3px 10px',
            borderRadius: '9999px',
            border: '1px solid var(--pl-border)',
            background: 'transparent',
            color: 'var(--pl-text-dim)',
            cursor: 'pointer',
          }}
        >
          Next puzzle →
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 36px)',
          width: 'fit-content',
        }}
        onClick={() => containerRef.current?.focus()}
      >
        {board.map((val, idx) => (
          <div
            key={idx}
            style={cellStyle(idx)}
            onClick={() => {
              if (given[idx] === 0) { setSelected(idx); }
              containerRef.current?.focus();
            }}
          >
            {val !== 0 ? val : ''}
          </div>
        ))}
      </div>

      {/* Number pad */}
      {!solved && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => { applyInput(n); containerRef.current?.focus(); }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid var(--pl-border)',
                background: 'var(--pl-surface)',
                color: 'var(--pl-text)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => { applyInput(0); containerRef.current?.focus(); }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid var(--pl-border)',
              background: 'var(--pl-surface)',
              color: 'var(--pl-text-dim)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
            title="Clear"
          >
            ✕
          </button>
        </div>
      )}

      {/* Solved banner */}
      {solved && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeInUp 0.4s ease forwards',
          }}
        >
          <p style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
            ✓ Puzzle solved! Nice work.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={nextPuzzle}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                background: 'var(--pl-accent)',
                color: 'var(--pl-bg)',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Play another puzzle
            </button>
            {scanDone && (
              <button
                onClick={() => window.close()}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--pl-text-dim)',
                  border: '1px solid var(--pl-border)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                View my results →
              </button>
            )}
          </div>
        </div>
      )}

      <p style={{ color: 'var(--pl-text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
        Click a cell · type 1–9 · arrow keys to navigate
      </p>
    </div>
  );
}
