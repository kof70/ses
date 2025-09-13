/**
 * Gestionnaire d'erreurs Supabase pour éviter les bugs et améliorer la robustesse
 */

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    code.includes('network') ||
    code.includes('timeout')
  );
};

export const isRLSError = (error: any): boolean => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  return (
    message.includes('rls') ||
    message.includes('policy') ||
    message.includes('permission') ||
    message.includes('unauthorized') ||
    code.includes('42501') || // PostgreSQL permission denied
    code.includes('PGRST301') // PostgREST RLS error
  );
};

export const isRefreshTokenError = (error: any): boolean => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('refresh token expired') ||
    code.includes('invalid_grant') ||
    code.includes('refresh_token_not_found')
  );
};

export const shouldTriggerOfflineMode = (error: any): boolean => {
  return isNetworkError(error) || isRLSError(error);
};

export const shouldSignOut = (error: any): boolean => {
  return isRefreshTokenError(error);
};

export const getErrorMessage = (error: any): string => {
  if (!error) return 'Erreur inconnue';
  
  if (isNetworkError(error)) {
    return 'Problème de connexion. Vérifiez votre réseau.';
  }
  
  if (isRLSError(error)) {
    return 'Permissions insuffisantes. Contactez l\'administrateur.';
  }
  
  if (isRefreshTokenError(error)) {
    return 'Session expirée. Veuillez vous reconnecter.';
  }
  
  return error.message || 'Erreur inconnue';
};

export const logSupabaseError = (context: string, error: any) => {
  console.error(`[${context}] Supabase Error:`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    isNetworkError: isNetworkError(error),
    isRLSError: isRLSError(error),
    shouldTriggerOffline: shouldTriggerOfflineMode(error)
  });
};
