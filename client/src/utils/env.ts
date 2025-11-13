/**
 * Environment variable validation and configuration
 */

interface EnvConfig {
  apiUrl: string;
  socketUrl: string;
  googleClientId: string | undefined;
  isDevelopment: boolean;
  isProduction: boolean;
}

interface EnvValidationError {
  variable: string;
  message: string;
}

/**
 * Validates required environment variables
 * Throws error if critical variables are missing in production
 */
export function validateEnvironment(): void {
  const errors: EnvValidationError[] = [];
  const isProduction = import.meta.env.PROD;

  // Required in production
  if (isProduction) {
    if (!import.meta.env.VITE_API_URL) {
      errors.push({
        variable: 'VITE_API_URL',
        message: 'VITE_API_URL is required in production',
      });
    }

    if (!import.meta.env.VITE_SOCKET_URL) {
      errors.push({
        variable: 'VITE_SOCKET_URL',
        message: 'VITE_SOCKET_URL is required in production',
      });
    }
  }

  // Optional but recommended - just log a warning, don't throw
  // This is handled in the validation error message if needed

  if (errors.length > 0) {
    const errorMessage = `Environment validation failed:\n${errors
      .map((e) => `  - ${e.variable}: ${e.message}`)
      .join('\n')}`;
    
    throw new Error(errorMessage);
  }
}

/**
 * Get validated environment configuration
 * This function does NOT validate - it just returns the config
 * Use validateEnvironment() separately if validation is needed
 */
export function getEnvConfig(): EnvConfig {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  return {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    isDevelopment,
    isProduction,
  };
}

