import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AboutTab from './AboutTab';

describe('AboutTab', () => {
  it('renders the hero title', () => {
    render(<AboutTab />);
    expect(screen.getByText('PrivacyLens')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<AboutTab />);
    expect(screen.getByText(/Know what you're agreeing to/)).toBeInTheDocument();
  });

  it('renders trust chips', () => {
    render(<AboutTab />);
    expect(screen.getByText('No account needed')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('AI-powered')).toBeInTheDocument();
  });

  it('renders the how-it-works steps', () => {
    render(<AboutTab />);
    expect(screen.getByText('Select services')).toBeInTheDocument();
    expect(screen.getByText('Scan policies')).toBeInTheDocument();
    expect(screen.getByText('Understand risk')).toBeInTheDocument();
  });
});
