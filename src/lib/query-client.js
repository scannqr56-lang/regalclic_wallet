import { QueryClient } from '@tanstack/react-query';

export const STALE_TIMES = {
  business: 60_000,
  stats: 30_000,
  customers: 30_000,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
