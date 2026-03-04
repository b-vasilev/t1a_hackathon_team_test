'use client';

function ServiceIcon({ icon, name }) {
  if (icon && icon.startsWith('http')) {
    return (
      <div className="w-10 h-10 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt={name}
          width={40}
          height={40}
          className="rounded-lg object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'flex';
          }}
        />
        <span
          style={{ display: 'none' }}
          className="w-10 h-10 rounded-lg bg-slate-700 items-center justify-center text-slate-300 font-bold text-lg"
        >
          {name[0].toUpperCase()}
        </span>
      </div>
    );
  }
  return <span className="text-3xl">{icon || '🌐'}</span>;
}

export default function ServiceGrid({ services, selectedIds, onToggle, customServices, onRemoveCustom }) {
  const allServices = [
    ...services,
    ...customServices.map(s => ({ ...s, isCustom: true })),
  ];

  if (allServices.length === 0) {
    return (
      <p className="text-slate-500 text-sm">No services available. Add one below.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {allServices.map((svc) => {
        const selected = selectedIds.has(svc.id);
        return (
          <div
            key={svc.id}
            onClick={() => onToggle(svc.id)}
            className={`
              relative cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2
              border transition-all duration-150 select-none
              ${selected
                ? 'border-indigo-500 ring-2 ring-indigo-500/60 bg-indigo-950/40'
                : 'border-slate-700 bg-slate-900 hover:border-slate-500'}
            `}
          >
            {svc.isCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveCustom(svc.id);
                }}
                className="absolute top-1.5 right-1.5 text-slate-500 hover:text-red-400 text-xs leading-none p-0.5"
                title="Remove"
              >
                ✕
              </button>
            )}
            <ServiceIcon icon={svc.icon} name={svc.name} />
            <span className="text-sm font-medium text-slate-200 text-center leading-tight">
              {svc.name}
            </span>
            {selected && (
              <span className="absolute bottom-1.5 right-2 text-indigo-400 text-xs">✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
