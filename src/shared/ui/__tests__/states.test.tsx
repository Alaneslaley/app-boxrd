import { render } from '@testing-library/react-native';

import { AccessDeniedState } from '../AccessDeniedState';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { LoadingState } from '../LoadingState';
import { OfflineBanner } from '../OfflineBanner';

describe('estados compartidos', () => {
  it.each([
    [<LoadingState key="loading" />, 'Cargando'],
    [<EmptyState key="empty" />, 'Sin resultados'],
    [<ErrorState key="error" traceId="trace-1" />, 'Ocurrió un error'],
    [<AccessDeniedState key="denied" />, 'Acceso denegado'],
    [<OfflineBanner key="offline" visible />, 'Sin conexión'],
  ])('renderiza un estado accesible', async (component, expectedText) => {
    const view = await render(component);
    expect(view.getByText(new RegExp(expectedText))).toBeOnTheScreen();
  });

  it('no renderiza OfflineBanner cuando hay conexión', async () => {
    const view = await render(<OfflineBanner visible={false} />);
    expect(view.queryByText('Sin conexión')).toBeNull();
  });
});
