'use client';

import { useState } from 'react';
import ServiceIcon from '@/components/ServiceIcon';

const CATEGORY_ORDER = ['All', 'Social', 'Messaging', 'Streaming', 'Shopping & Finance', 'Productivity'];

export default function ServiceGrid({ services, selectedIds, onToggle, customServices, onRemoveCustom, compareMode = false, slotOrder = [], onDragStart }) {
  const [activeCategory, setActiveCategory] = useState('All');

  const allServices = [
    ...services,
    ...customServices.map(s => ({ ...s, isCustom: true })),
  ];

  if (allServices.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--pl-text-dim)' }}>No services available. Add one below.</p>
    );
  }

  const availableCategories = CATEGORY_ORDER.filter(
    cat => cat === 'All' || allServices.some(s => s.category === cat)
  );

  const filtered = activeCategory === 'All'
    ? allServices
    : allServices.filter(s => s.category === activeCategory);

  return (
    <div className="flex flex-col gap-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {availableCategories.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-medium transition-all duration-150"
              style={
                isActive
                  ? {
                      background: 'var(--pl-accent)',
                      color: 'var(--pl-bg)',
                      border: '1px solid var(--pl-accent)',
                    }
                  : {
                      background: 'transparent',
                      color: 'var(--pl-text-dim)',
                      border: '1px solid var(--pl-border)',
                    }
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Service grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 stagger-children">
        {filtered.map((svc) => {
          const selected = selectedIds.has(svc.id);
          return (
            <div
              key={svc.id}
              role="button"
              tabIndex={0}
              draggable={Boolean(compareMode)}
              onDragStart={(e) => {
                if (compareMode && onDragStart) {
                  e.dataTransfer.setData('text/plain', String(svc.id));
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart(svc.id);
                }
              }}
              onClick={() => onToggle(svc.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(svc.id); } }}
              className="relative cursor-pointer rounded-lg p-2 flex flex-col items-center gap-1 select-none transition-all duration-200"
              style={
                selected
                  ? {
                      border: '2px solid var(--pl-accent)',
                      background: 'var(--pl-accent-muted)',
                      boxShadow: '0 0 12px rgba(0, 229, 255, 0.35), inset 0 0 20px rgba(0, 229, 255, 0.08)',
                      transform: 'translateY(-2px)',
                    }
                  : {
                      border: '1px solid var(--pl-border)',
                      background: 'var(--pl-surface)',
                      transform: 'translateY(0)',
                    }
              }
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.borderColor = 'var(--pl-border-hover)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.borderColor = 'var(--pl-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {svc.isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCustom(svc.id);
                  }}
                  className="absolute top-1.5 right-1.5 text-xs leading-none p-0.5"
                  style={{ color: 'var(--pl-text-dim)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--pl-grade-f)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--pl-text-dim)';
                  }}
                  title="Remove"
                >
                  &#x2715;
                </button>
              )}
              <ServiceIcon icon={svc.icon} name={svc.name} size="sm" />
              <span
                className="text-xs font-medium text-center leading-tight"
                style={{ color: 'var(--pl-text)' }}
              >
                {svc.name}
              </span>
              {selected && !compareMode && (
                <span
                  className="absolute bottom-1.5 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--pl-accent)', color: 'var(--pl-bg)', boxShadow: '0 0 6px rgba(0, 229, 255, 0.5)' }}
                >
                  &#x2713;
                </span>
              )}
              {selected && compareMode && (() => {
                const slot = slotOrder.indexOf(svc.id);
                const isA = slot === 0;
                return (
                  <span
                    className="absolute bottom-1.5 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={isA
                      ? { background: 'var(--pl-accent)', color: 'var(--pl-bg)', boxShadow: '0 0 6px rgba(0, 229, 255, 0.5)' }
                      : { background: '#f97316', color: '#fff', boxShadow: '0 0 6px rgba(249, 115, 22, 0.5)' }
                    }
                  >
                    {isA ? 'A' : 'B'}
                  </span>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
