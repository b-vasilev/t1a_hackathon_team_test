'use client';

import { useState } from 'react';

export default function ServiceIcon({ icon, name, size = 'md' }) {
  const [imgFailed, setImgFailed] = useState(false);

  const dim = size === 'sm' ? 'w-9 h-9' : 'w-12 h-12';
  const imgSize = size === 'sm' ? 24 : 32;
  const emojiSize = size === 'sm' ? 'text-lg' : 'text-2xl';
  const extraClass = size === 'sm' ? 'shrink-0 mt-0.5' : '';
  const letterClass = size === 'sm' ? 'font-bold' : 'font-bold text-lg';

  if (icon && icon.startsWith('http') && !imgFailed) {
    return (
      <div
        className={`${dim} ${extraClass} flex items-center justify-center rounded-full overflow-hidden`}
        style={{ border: '1px solid var(--pl-border)', background: 'var(--pl-surface)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt={name}
          width={imgSize}
          height={imgSize}
          className="object-contain"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  if (icon && icon.startsWith('http') && imgFailed) {
    return (
      <div
        className={`${dim} ${extraClass} flex items-center justify-center rounded-full`}
        style={{ border: '1px solid var(--pl-border)', background: 'var(--pl-surface)', fontFamily: 'var(--font-mono)', color: 'var(--pl-text-muted)' }}
      >
        <span className={letterClass}>{name[0].toUpperCase()}</span>
      </div>
    );
  }

  return (
    <div
      className={`${dim} ${extraClass} flex items-center justify-center rounded-full`}
      style={{ border: '1px solid var(--pl-border)', background: 'var(--pl-surface)' }}
    >
      <span className={emojiSize}>{icon || '🌐'}</span>
    </div>
  );
}
