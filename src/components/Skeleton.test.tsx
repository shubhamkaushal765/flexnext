import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Skeleton from './Skeleton';

const count = (html: string) => (html.match(/class="skeleton-line"/g) ?? []).length;

describe('Skeleton', () => {
  it('is an accessible busy status region', () => {
    const html = renderToStaticMarkup(<Skeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
  });

  it('has default sr-only label', () => {
    expect(renderToStaticMarkup(<Skeleton />)).toContain('<span class="sr-only">Loading</span>');
  });

  it('accepts a custom label', () => {
    expect(renderToStaticMarkup(<Skeleton label="Loading profiles" />)).toContain(
      '<span class="sr-only">Loading profiles</span>',
    );
  });

  it('renders 3 lines by default and honours lines prop', () => {
    expect(count(renderToStaticMarkup(<Skeleton />))).toBe(3);
    expect(count(renderToStaticMarkup(<Skeleton lines={2} />))).toBe(2);
  });
});
