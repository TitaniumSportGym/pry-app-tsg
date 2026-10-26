import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { getMembershipPlan, getMembershipPlans } from '../../src/features/memberships/api/memberships-api';
import type { MembershipArea } from '../../src/features/memberships/models/membership-area';
import { MembershipDetailView } from '../../src/features/memberships/views/membership-detail-view';
import { MembershipsView } from '../../src/features/memberships/views/memberships-view';
import { couple, monthly, student } from './fixtures';
import { renderAcceptance, requestedDetailId } from './support';

describe('Aceptación simulada — consulta de membresías', () => {
  it.each<[string, MembershipArea, string | undefined, string]>([
    ['CA-MEM-01', 'client', undefined, '/memberships/[id]'],
    ['CA-MEM-02', 'trainer', 'entrenador', '/trainer/account/memberships/[id]'],
  ])('%s: en el área %s comparo planes y el detalle conserva el precio y la cobertura elegidos', async (_id, area, role, pathname) => {
    jest.mocked(getMembershipPlans).mockResolvedValue([monthly, couple]);
    jest.mocked(getMembershipPlan).mockResolvedValue(couple);
    const view = await renderAcceptance(<MembershipsView area={area} />, role);
    const user = userEvent.setup();

    expect(await screen.findByRole('tab', { name: monthly.name, selected: true })).toBeOnTheScreen();
    expect(screen.getByText('$440')).toBeOnTheScreen();
    expect(screen.getByText('Acceso a rutinas y entrenamientos')).toBeOnTheScreen();
    await user.press(screen.getByRole('tab', { name: couple.name }));

    expect(screen.getByRole('tab', { name: couple.name, selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: monthly.name, selected: false })).toBeOnTheScreen();
    expect(screen.getByText('$780')).toBeOnTheScreen();
    expect(screen.getByText('por 1 mes · $390 por persona')).toBeOnTheScreen();
    expect(screen.getByText('Acceso mensual para 2 personas')).toBeOnTheScreen();
    expect(screen.queryByText('$440')).toBeNull();
    expect(screen.queryByText('Acceso a rutinas y entrenamientos')).toBeNull();
    if (area === 'trainer') {
      expect(screen.queryByRole('button', { name: /Comprar por/ })).toBeNull();
    } else {
      expect(screen.getByRole('button', { name: 'Comprar por $780' })).toBeEnabled();
    }

    await user.press(screen.getByRole('link', { name: `Ver detalle de la membresía ${couple.name}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname, params: { id: couple.id } });
    await view.rerender(<MembershipDetailView area={area} planId={requestedDetailId()} />);

    expect(await screen.findByRole('header', { name: 'PAQUETE 2 PERSONAS' })).toBeOnTheScreen();
    expect(screen.getByText('$780')).toBeOnTheScreen();
    expect(screen.getByText('$390 por persona')).toBeOnTheScreen();
    expect(screen.getByText('por 1 mes')).toBeOnTheScreen();
    expect(screen.getByText('2 personas')).toBeOnTheScreen();
    expect(screen.getByText('Grupal')).toBeOnTheScreen();
    expect(screen.getByText('Acceso mensual para 2 personas')).toBeOnTheScreen();
    expect(getMembershipPlan).toHaveBeenCalledWith(couple.id);
    expect(screen.queryByText('$440')).toBeNull();
    if (area === 'trainer') {
      expect(screen.queryByRole('button', { name: /Comprar por/ })).toBeNull();
    } else {
      expect(screen.getByRole('button', { name: 'Comprar por $780' })).toBeEnabled();
    }
  });

  it('CA-MEM-03: al elegir la tarifa estudiantil conozco su requisito antes de decidir', async () => {
    jest.mocked(getMembershipPlans).mockResolvedValue([monthly, student]);
    jest.mocked(getMembershipPlan).mockResolvedValue(student);
    const view = await renderAcceptance(<MembershipsView area="client" />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('tab', { name: student.name }));
    expect(screen.getByText('$350')).toBeOnTheScreen();
    expect(screen.getByText('ESTUDIANTE')).toBeOnTheScreen();
    expect(screen.queryByText('$440')).toBeNull();
    await user.press(screen.getByRole('link', { name: `Ver detalle de la membresía ${student.name}` }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/memberships/[id]', params: { id: student.id },
    });
    await view.rerender(<MembershipDetailView area="client" planId={requestedDetailId()} />);

    expect(await screen.findByRole('header', { name: 'MENSUAL ESTUDIANTE' })).toBeOnTheScreen();
    expect(screen.getByText('$350')).toBeOnTheScreen();
    expect(screen.getByText('Requisito')).toBeOnTheScreen();
    expect(screen.getByText('Credencial de estudiante vigente')).toBeOnTheScreen();
    expect(screen.getByText('Acceso mensual con tarifa de estudiante')).toBeOnTheScreen();
  });

  it('CA-MEM-04: tras un error de conexión puedo reintentar, elegir un plan y consultar su detalle', async () => {
    jest.mocked(getMembershipPlans)
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce([monthly]);
    jest.mocked(getMembershipPlan).mockResolvedValue(monthly);
    const view = await renderAcceptance(<MembershipsView area="client" />);
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No fue posible conectar/);
    expect(screen.queryByRole('link', { name: /Ver detalle/ })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('tab', { name: monthly.name })).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    expect(getMembershipPlans).toHaveBeenCalledTimes(2);

    await user.press(screen.getByRole('link', { name: `Ver detalle de la membresía ${monthly.name}` }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/memberships/[id]', params: { id: monthly.id },
    });
    await view.rerender(<MembershipDetailView area="client" planId={requestedDetailId()} />);
    expect(await screen.findByRole('header', { name: 'REGULAR MENSUAL' })).toBeOnTheScreen();
    expect(screen.getByText('$440')).toBeOnTheScreen();
  });

  it('CA-MEM-05: sin planes disponibles recibo orientación y no puedo abrir un detalle inexistente', async () => {
    jest.mocked(getMembershipPlans).mockResolvedValue([]);
    await renderAcceptance(<MembershipsView area="client" />);

    expect(await screen.findByText('No hay membresías disponibles')).toBeOnTheScreen();
    expect(screen.getByText('Vuelve más tarde para consultar los planes del gimnasio.')).toBeOnTheScreen();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('link', { name: /Ver detalle/ })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(getMembershipPlan).not.toHaveBeenCalled();
  });
});
