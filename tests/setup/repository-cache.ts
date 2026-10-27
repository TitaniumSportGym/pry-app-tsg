import { repositoryCache } from '../../src/core/repository/repository-cache';

// Repositories share one in-memory cache. Each test starts empty so data mocked
// by one test never answers the requests of the next one.
beforeEach(() => {
  repositoryCache.clear();
});
