'use client';

import ServiceIcon from '@/components/ServiceIcon';

export default function ServiceGrid({ services, selectedIds, onToggle, customServices, onRemoveCustom }) {
  const allServices = [
    ...services,
    ...customServices.map(s => ({ ...s, isCustom: true })),
  ];

  if (allServices.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--pl-text-dim)' }}>No services available. Add one below.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 stagger-children">
      {allServices.map((svc) => {
        const selected = selectedIds.has(svc.id);
        return (
          <div
            key={svc.id}
            role="button"
            tabIndex={0}
            onClick={() => onToggle(svc.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(svc.id); } }}
            className="relative cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2 select-none transition-all duration-200"
            style={
              selected
                ? {
                    border: '1px solid var(--pl-accent)',
                    background: 'var(--pl-accent-muted)',
                    animation: 'pulseGlow 2.5s ease-in-out infinite',
                    transform: 'translateY(0)',
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
            <ServiceIcon icon={svc.icon} name={svc.name} />
            <span
              className="text-sm font-medium text-center leading-tight"
              style={{ color: 'var(--pl-text)' }}
            >
              {svc.name}
            </span>
            {selected && (
              <span
                className="absolute bottom-1.5 right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: 'var(--pl-accent)', color: 'var(--pl-bg)' }}
              >
                &#x2713;
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
