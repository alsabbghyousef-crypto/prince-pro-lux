import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1. Core Dynamic Sync & Focus Listeners
      refetchOnWindowFocus: true, 
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 2,
      // Default to slightly stale to prevent overfetching static data
      // For dynamic data (POS, Items), we will override this at the query level
      staleTime: 0, 
      gcTime: 10 * 60 * 1000, 
    },
    mutations: {
      // 2. Real-Time Live Synchronization via BroadcastChannel
      // Whenever a mutation succeeds, we broadcast a sync event to other tabs
      onSuccess: () => {
        const channel = new BroadcastChannel('app_sync_channel');
        channel.postMessage({ type: 'MUTATION_SUCCESS', timestamp: Date.now() });
        channel.close();
      }
    }
  },
})

// Cross-Tab Synchronization Listener
function BroadcastSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const channel = new BroadcastChannel('app_sync_channel');
    
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'MUTATION_SUCCESS') {
        // Invalidate all active queries silently in the background
        // 0ms synchronization without flickering
        queryClient.invalidateQueries();
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BroadcastSyncProvider>
        <App />
      </BroadcastSyncProvider>
    </QueryClientProvider>
  </StrictMode>,
)
