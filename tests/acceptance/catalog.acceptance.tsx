import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { getProduct, getProducts } from '../../src/features/store/api/products-api';
import { ProductDetailView } from '../../src/features/store/views/product-detail-view';
import { StoreView } from '../../src/features/store/views/store-view';
import { creatine, protein, shirt } from './fixtures';
import { renderAcceptance, requestedDetailId } from './support';

describe('Aceptación simulada — consulta del catálogo', () => {
  it('CA-CAT-01: como visitante combino categoría y búsqueda, y puedo recuperar el catálogo sin resultados', async () => {
    jest.mocked(getProducts).mockResolvedValue([creatine, shirt, protein]);
    await renderAcceptance(<StoreView />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Ropa deportiva' }));
    await user.type(screen.getByLabelText('Buscar productos'), 'creatina');
    expect(screen.getByText('No encontramos productos con esa búsqueda.')).toBeOnTheScreen();
    expect(screen.queryByText(creatine.name)).toBeNull();
    expect(screen.queryByText(shirt.name)).toBeNull();
    expect(screen.queryByText(protein.name)).toBeNull();

    // The query is preserved while changing category: both filters must apply.
    await user.press(screen.getByRole('button', { name: 'Suplementos' }));
    expect(screen.getByRole('button', { name: 'Suplementos', selected: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Buscar productos')).toHaveDisplayValue('creatina');
    expect(screen.getByText(creatine.name)).toBeOnTheScreen();
    expect(screen.queryByText(protein.name)).toBeNull();
    expect(screen.queryByText(shirt.name)).toBeNull();
    expect(screen.queryByText('No encontramos productos con esa búsqueda.')).toBeNull();

    await user.clear(screen.getByLabelText('Buscar productos'));
    expect(screen.getByText(protein.name)).toBeOnTheScreen();
    expect(screen.queryByText(shirt.name)).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByRole('button', { name: 'Todos', selected: true })).toBeOnTheScreen();
    for (const product of [creatine, shirt, protein]) {
      expect(screen.getByText(product.name)).toBeOnTheScreen();
    }
    expect(getProducts).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([
    ['CA-CAT-02', creatine, '$549.00', 'Disponible', 'SUPLEMENTOS', '300 g'],
    ['CA-CAT-03', shirt, '$599.00', 'Agotado', 'ROPA DEPORTIVA', 'M'],
  ])('%s: el detalle del producto seleccionado conserva precio y disponibilidad', async (_id, product, price, stockLabel, category, spec) => {
    jest.mocked(getProducts).mockResolvedValue([creatine, shirt]);
    jest.mocked(getProduct).mockResolvedValue(product);
    const view = await renderAcceptance(<StoreView />);
    const user = userEvent.setup();

    expect(await screen.findByText(product.name)).toBeOnTheScreen();
    expect(screen.getByText('AGOTADO')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', {
      name: `${product.name}, ${price}${product.stock === 0 ? ', agotado' : ''}`,
    }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/store/[id]', params: { id: String(product.id) },
    });
    await view.rerender(<ProductDetailView productId={requestedDetailId()} />);

    expect(await screen.findByRole('header', { name: product.name })).toBeOnTheScreen();
    expect(screen.getByText(price)).toBeOnTheScreen();
    expect(screen.getByText(stockLabel)).toBeOnTheScreen();
    expect(screen.getByText(category)).toBeOnTheScreen();
    expect(screen.getByText(product.brand)).toBeOnTheScreen();
    expect(screen.getByText(spec)).toBeOnTheScreen();
    expect(screen.queryByRole('header', {
      name: product.id === creatine.id ? shirt.name : creatine.name,
    })).toBeNull();
    expect(getProduct).toHaveBeenCalledWith(product.id);
  });

  it('CA-CAT-04: tras fallar la consulta puedo reintentar y volver a buscar productos', async () => {
    jest.mocked(getProducts)
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce([creatine, shirt]);
    await renderAcceptance(<StoreView />);
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No fue posible conectar/);
    expect(screen.queryByText(creatine.name)).toBeNull();
    expect(screen.queryByText('Aún no hay productos en la tienda.')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(creatine.name)).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();

    await user.type(screen.getByLabelText('Buscar productos'), 'youngla');
    expect(screen.getByText(shirt.name)).toBeOnTheScreen();
    expect(screen.queryByText(creatine.name)).toBeNull();
    expect(getProducts).toHaveBeenCalledTimes(2);
  });

  it('CA-CAT-05: si el catálogo está vacío veo un estado informativo sin productos ni errores de conexión', async () => {
    jest.mocked(getProducts).mockResolvedValue([]);
    await renderAcceptance(<StoreView />);

    expect(await screen.findByText('Aún no hay productos en la tienda.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'TIENDA TITANIUM' })).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    expect(screen.queryByText('No encontramos productos con esa búsqueda.')).toBeNull();
    expect(screen.queryByRole('button', { name: /\$/ })).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(getProduct).not.toHaveBeenCalled();
  });
});
