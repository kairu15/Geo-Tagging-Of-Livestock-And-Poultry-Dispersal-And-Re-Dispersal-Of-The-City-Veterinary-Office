import { useEffect } from 'react';
import api, { getApiErrorMessage } from './axios';
import { useToast } from '../components/ui/Toast';

/**
 * Global API error handler — intercepts unhandled Axios errors and surfaces
 * them as toast notifications. Wrap the app root with this component.
 *
 * This is NOT a React Error Boundary (which catches render errors).
 * Instead, it hooks into Axios to catch API-level errors that aren't
 * handled by individual useMutation/onError callbacks.
 */
export default function ApiErrorHandler({ children }) {
  const toast = useToast();

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only show toast for errors not already handled by component-level error handling.
        // We detect this by checking if the error has been marked as "handled".
        if (!error.__handled) {
          const message = getApiErrorMessage(error);
          toast.error(message);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [toast]);

  return children;
}
