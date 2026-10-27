import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { getProduct, getProducts } from '../../src/features/store/api/products-api';
import { CatalogView } from '../../src/features/store/views/catalog-view';
import { ProductDetailView } from '../../src/features/store/views/product-detail-view';
import { StoreView } from '../../src/features/store/views/store-view';
import { creatine, protein, shirt } from './fixtures';
import { renderAcceptance, requestedDetailId, requestedParams } from './support';

describe('Aceptación simulada — consulta del catálogo', () => {
  it('CA-CAT-01: como visitante abro una categoría desde Tienda, combino filtros y recupero el catálogo', async () => {
    jest.mocked(getProducts).mockResolvedValue([creatine, shirt, protein]);
    const view = await renderAcceptance(<StoreView />);
    const user = userEvent.setup();

    expect(await screen.findByRole('button', { name: 'Ropa deportiva, 1 productos' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'TIENDA' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Categorías' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Nuevos' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Suplementos, 2 productos' })).toBeOnTheScreen();
    // Newest items are ordered by createdAt and exclude sold-out products.
    const newest = screen.getAllByRole('button', { name: /\$/ });
    expect(newest.map(card => card.props.accessibilityLabel)).toEqual([
      'Proteína de suero, $799.00', 'Creatina monohidratada 300 g, $549.00',
    ]);
    expect(screen.queryByText(shirt.name)).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Ropa deportiva, 1 productos' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/store/catalog', params: { category: '1' } });
    await view.rerender(<CatalogView category={requestedParams().category} />);
    expect(await screen.findByRole('header', { name: 'ROPA DEPORTIVA' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ropa deportiva', selected: true })).toBeOnTheScreen();
    expect(screen.getByText(shirt.name)).toBeOnTheScreen();
    expect(screen.getByText('AGOTADO')).toBeOnTheScreen();
    expect(screen.queryByText(creatine.name)).toBeNull();
    await user.type(screen.getByLabelText('Buscar'), 'creatina');
    expect(screen.getByText('No encontramos productos con esa búsqueda.')).toBeOnTheScreen();
    expect(screen.queryByText(creatine.name)).toBeNull();
    expect(screen.queryByText(shirt.name)).toBeNull();
    expect(screen.queryByText(protein.name)).toBeNull();

    // The query is preserved while changing category: both filters must apply.
    await user.press(screen.getByRole('button', { name: 'Suplementos' }));
    expect(screen.getByRole('header', { name: 'SUPLEMENTOS' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Suplementos', selected: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Buscar')).toHaveDisplayValue('creatina');
    expect(screen.getByText(creatine.name)).toBeOnTheScreen();
    expect(screen.queryByText(protein.name)).toBeNull();
    expect(screen.queryByText(shirt.name)).toBeNull();
    expect(screen.queryByText('No encontramos productos con esa búsqueda.')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));
    expect(screen.getByLabelText('Buscar')).toHaveDisplayValue('');
    expect(screen.getByText(protein.name)).toBeOnTheScreen();
    expect(screen.queryByText(shirt.name)).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByRole('header', { name: 'CATÁLOGO' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Todos', selected: true })).toBeOnTheScreen();
    for (const product of [creatine, shirt, protein]) {
      expect(screen.getByText(product.name)).toBeOnTheScreen();
    }
    expect(getProducts).toHaveBeenCalledTimes(2); // Tienda then Catálogo; filtering is local.
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['CA-CAT-02', creatine, '$549.00', 'Disponible', 'SUPLEMENTOS', 'Presentación: 300 g'],
    ['CA-CAT-03', shirt, '$599.00', 'Agotado', 'ROPA DEPORTIVA', 'Talla: M'],
  ])('%s: desde Ver todo el detalle conserva identidad, precio, especificaciones y disponibilidad', async (_id, product, price, stockLabel, category, spec) => {
    jest.mocked(getProducts).mockResolvedValue([creatine, shirt]);
    jest.mocked(getProduct).mockResolvedValue(product);
    const view = await renderAcceptance(<StoreView />);
    const user = userEvent.setup();

    expect(await screen.findByRole('header', { name: 'Nuevos' })).toBeOnTheScreen();
    expect(screen.getByText(creatine.name)).toBeOnTheScreen();
    expect(screen.queryByText(shirt.name)).toBeNull();
    await user.press(screen.getAllByRole('link', { name: 'Ver todo' })[0]);
    expect(router.push).toHaveBeenLastCalledWith('/store/catalog');
    await view.rerender(<CatalogView />);
    const card = await screen.findByRole('button', {
      name: `${product.name}, ${price}${product.stock === 0 ? ', agotado' : ''}`,
    });
    expect(screen.getByRole('header', { name: 'CATÁLOGO' })).toBeOnTheScreen();
    expect(screen.getByText('AGOTADO')).toBeOnTheScreen();
    await user.press(card);
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/store/[id]', params: { id: String(product.id) },
    });
    await view.rerender(<ProductDetailView productId={requestedDetailId()} />);

    expect(await screen.findByRole('header', { name: product.name })).toBeOnTheScreen();
    expect(screen.getByText(price)).toBeOnTheScreen();
    expect(screen.getByText(stockLabel)).toBeOnTheScreen();
    expect(screen.getByText(category)).toBeOnTheScreen();
    expect(screen.getByText(product.brand)).toBeOnTheScreen();
    expect(screen.getByText(spec)).toBeOnTheScreen();
    expect(screen.getByText(product.description)).toBeOnTheScreen();
    expect(screen.getByText('Inicia sesión para agregar productos a tu carrito.')).toBeOnTheScreen();
    expect(screen.queryByRole('header', {
      name: product.id === creatine.id ? shirt.name : creatine.name,
    })).toBeNull();
    expect(getProduct).toHaveBeenCalledWith(product.id);
    if (product.stock === 0) {
      expect(screen.getByRole('button', { name: 'AGOTADO' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'COMPRAR' })).toBeDisabled();
    } else {
      expect(screen.getByRole('button', { name: 'AGREGAR' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'COMPRAR' })).toBeEnabled();
    }
  });

  it('CA-CAT-04: tras fallar la consulta puedo reintentar y enviar una búsqueda al catálogo', async () => {
    jest.mocked(getProducts)
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValue([creatine, shirt]);
    const view = await renderAcceptance(<StoreView />);
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No fue posible conectar/);
    expect(screen.queryByText(creatine.name)).toBeNull();
    expect(screen.queryByText('Aún no hay productos en la tienda')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(creatine.name)).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();

    expect(getProducts).toHaveBeenCalledTimes(2);
    await user.type(screen.getByLabelText('Buscar'), 'youngla', { submitEditing: true });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/store/catalog', params: { q: 'youngla' } });
    await view.rerender(<CatalogView query={requestedParams().q} />);
    expect(await screen.findByText(shirt.name)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'CATÁLOGO' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Buscar')).toHaveDisplayValue('youngla');
    expect(screen.queryByText(creatine.name)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(getProducts).toHaveBeenCalledTimes(3);
  });

  it('CA-CAT-05: sin productos, Tienda y Catálogo informan vacío sin confundirlo con errores o filtros sin coincidencias', async () => {
    jest.mocked(getProducts).mockResolvedValue([]);
    const view = await renderAcceptance(<StoreView />);
    const user = userEvent.setup();

    expect(await screen.findByText('Aún no hay productos en la tienda')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'TIENDA' })).toBeOnTheScreen();
    expect(screen.getByText('Vuelve pronto para ver suplementos, ropa y accesorios.')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Nuevos' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ver todo' })).toBeNull();
    expect(screen.queryByRole('button', { name: /\$/ })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Buscar'), 'bicicleta', { submitEditing: true });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/store/catalog', params: { q: 'bicicleta' } });
    await view.rerender(<CatalogView query={requestedParams().q} />);
    expect(await screen.findByText('Aún no hay productos en la tienda.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'CATÁLOGO' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Buscar')).toHaveDisplayValue('bicicleta');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    expect(screen.queryByText('No encontramos productos con esa búsqueda.')).toBeNull();
    expect(screen.queryByRole('button', { name: /\$/ })).toBeNull();
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(getProduct).not.toHaveBeenCalled();
  });
});
