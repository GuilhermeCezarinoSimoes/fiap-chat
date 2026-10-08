import { useContext } from 'react';
import { UserDirectoryContext, type UserDirectoryContextValue } from '../contexts/UserDirectoryContext';

export function useUserDirectory(): UserDirectoryContextValue {
  const context = useContext(UserDirectoryContext);
  if (!context) {
    throw new Error('useUserDirectory deve ser usado dentro de UserDirectoryProvider');
  }
  return context;
}
