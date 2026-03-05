import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('renders all 4 navigation items', () => {
    render(<Sidebar activeTab="analyze" onTabChange={() => {}} />);
    expect(screen.getByText('Scan Services')).toBeInTheDocument();
    expect(screen.getByText('Compare Policies')).toBeInTheDocument();
    expect(screen.getByText('Paste & Scan')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    render(<Sidebar activeTab="compare" onTabChange={() => {}} />);
    const compareBtn = screen.getByText('Compare Policies').closest('button');
    expect(compareBtn.className).toContain('active');
    const analyzeBtn = screen.getByText('Scan Services').closest('button');
    expect(analyzeBtn.className).not.toContain('active');
  });

  it('calls onTabChange when a nav item is clicked', () => {
    const onTabChange = vi.fn();
    render(<Sidebar activeTab="analyze" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('How It Works'));
    expect(onTabChange).toHaveBeenCalledWith('about');
  });

  it('renders the brand name', () => {
    render(<Sidebar activeTab="analyze" onTabChange={() => {}} />);
    expect(screen.getByText('PrivacyLens')).toBeInTheDocument();
  });

});
