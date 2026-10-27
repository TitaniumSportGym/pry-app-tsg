import { render, screen } from '@testing-library/react-native';

import { formatBadgeCount, TabBadge } from './tab-badge';

describe('TabBadge', () => {
  it('muestra la cantidad y se oculta en cero', async () => {
    const view = await render(<TabBadge count={3} />);
    // Hidden from screen readers: the tab label already says "Carrito, 3 productos".
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeOnTheScreen();

    await view.rerender(<TabBadge count={0} />);
    expect(screen.queryByText('0', { includeHiddenElements: true })).toBeNull();
  });

  it('abrevia cantidades mayores a 9', () => {
    expect(formatBadgeCount(9)).toBe('9');
    expect(formatBadgeCount(12)).toBe('9+');
  });
});
