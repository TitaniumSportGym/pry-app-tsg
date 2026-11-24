import { repositoryCache } from '../../src/core/repository/repository-cache';

// Los repositorios comparten una caché en memoria. Cada prueba empieza vacía para
// que los datos simulados de una prueba nunca respondan las peticiones de la siguiente.
beforeEach(() => {
  repositoryCache.clear();
});
