import { calcularReposicion } from '../src/logic/reposicion';

describe('Cantidad sugerida a pedir', () => {
  test('máximo − (existencia + en tránsito)', () => {
    const r = calcularReposicion({ total: 4, minimo: 6, maximo: 24, transito: 0 });
    expect(r.sugerido).toBe(20);
    expect(r.bajoMinimo).toBe(true);
    expect(r.estado).toBe('bajo');
  });

  test('si no hay máximo se usa 2 × mínimo', () => {
    const r = calcularReposicion({ total: 2, minimo: 5, maximo: null, transito: 0 });
    expect(r.tope).toBe(10);
    expect(r.sugerido).toBe(8);
  });

  test('descuenta lo que está en tránsito', () => {
    expect(calcularReposicion({ total: 4, minimo: 6, maximo: 24, transito: 12 }).sugerido).toBe(8);
  });

  test('nunca sugiere menos de 0', () => {
    expect(calcularReposicion({ total: 30, minimo: 6, maximo: 24, transito: 5 }).sugerido).toBe(0);
  });

  test('"Pedido en camino" cuando el tránsito ya cubre la necesidad', () => {
    const r = calcularReposicion({ total: 3, minimo: 6, maximo: 12, transito: 9 });
    expect(r.sugerido).toBe(0);
    expect(r.pedidoEnCamino).toBe(true);
    expect(r.estado).toBe('en_camino');
  });

  test('bajo mínimo significa existencia menor O IGUAL al mínimo', () => {
    expect(calcularReposicion({ total: 6, minimo: 6, maximo: 12, transito: 0 }).bajoMinimo).toBe(true);
    expect(calcularReposicion({ total: 7, minimo: 6, maximo: 12, transito: 0 }).bajoMinimo).toBe(false);
  });

  test('colores de estado: agotado, bajo, en camino, bien', () => {
    expect(calcularReposicion({ total: 0, minimo: 6, maximo: 12, transito: 0 }).estado).toBe('agotado');
    expect(calcularReposicion({ total: 0, minimo: 6, maximo: 12, transito: 12 }).estado).toBe('agotado');
    expect(calcularReposicion({ total: 5, minimo: 6, maximo: 12, transito: 2 }).estado).toBe('bajo');
    expect(calcularReposicion({ total: 10, minimo: 6, maximo: 12, transito: 0 }).estado).toBe('bien');
  });
});
