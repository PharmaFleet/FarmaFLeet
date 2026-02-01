import { ReactNode, useState, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapProviderProps {
  children: ReactNode;
}

/**
 * Map Provider Component
 * 
 * Wraps the application with Google Maps APIProvider.
 * Handles API key configuration, loading states, and errors.
 * 
 * Required environment variable:
 * - VITE_GOOGLE_MAPS_API_KEY: Your Google Maps API key
 */
export function MapProvider({ children }: MapProviderProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((e: Error) => {
    console.error('Google Maps failed to load:', e);
    setError(e);
    setIsLoading(false);
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRetryCount((prev) => prev + 1);
  }, []);

  // Show error if API key is missing
  if (!apiKey) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-destructive">Google Maps API Key Missing</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Please configure <code className="bg-muted px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      onLoad={handleLoad}
      onError={handleError}
      libraries={['places', 'geometry']}
      version="weekly"
    >
      {isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
        </div>
      )}
      
      {error && !isLoading && (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold text-destructive">Failed to Load Google Maps</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message || 'An error occurred while loading Google Maps.'}
            </p>
            <Button onClick={handleRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry {retryCount > 0 && `(${retryCount})`}
            </Button>
          </div>
        </div>
      )}
      
      {!isLoading && !error && children}
    </APIProvider>
  );
}

export default MapProvider;
