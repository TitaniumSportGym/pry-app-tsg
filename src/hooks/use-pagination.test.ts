import { act, renderHook } from '@testing-library/react-native';

import { getPageCount, getPageTokens, usePagination } from './use-pagination';

describe('paginación', () => {
  it('calcula el número de páginas', () => {
    expect(getPageCount(0, 12)).toBe(1);
    expect(getPageCount(12, 12)).toBe(1);
    expect(getPageCount(160, 12)).toBe(14);
  });

  it('muestra todas las páginas cuando caben', () => {
    expect(getPageTokens(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageTokens(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('colapsa las páginas lejanas manteniendo siempre 7 posiciones', () => {
    expect(getPageTokens(1, 14)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 14]);
    expect(getPageTokens(4, 14)).toEqual([1, 'ellipsis-start', 3, 4, 5, 'ellipsis-end', 14]);
    expect(getPageTokens(7, 14)).toEqual([1, 'ellipsis-start', 6, 7, 8, 'ellipsis-end', 14]);
    expect(getPageTokens(14, 14)).toEqual([1, 'ellipsis-start', 10, 11, 12, 13, 14]);
  });

  it('pagina, limita el rango y vuelve a la primera página al cambiar los filtros', async () => {
    const items = Array.from({ length: 10 }, (_, index) => index + 1);
    const { result, rerender } = await renderHook(
      ({ list, key }: { list: number[]; key: string }) => usePagination(list, 4, key),
      { initialProps: { list: items, key: 'todas' } },
    );

    expect(result.current.pageItems).toEqual([1, 2, 3, 4]);
    expect(result.current.pageCount).toBe(3);

    await act(() => result.current.setPage(3));
    expect(result.current.pageItems).toEqual([9, 10]);
    expect([result.current.rangeStart, result.current.rangeEnd]).toEqual([9, 10]);

    await act(() => result.current.setPage(99));
    expect(result.current.page).toBe(3);

    await rerender({ list: items, key: 'fuerza' });
    expect(result.current.page).toBe(1);

    await act(() => result.current.setPage(3));
    await rerender({ list: items.slice(0, 5), key: 'fuerza' });
    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([5]);
  });
});
