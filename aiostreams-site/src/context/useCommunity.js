import { useContext } from 'react';
import { CommunityContext } from './communityContext';

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error('useCommunity must be used inside CommunityProvider');
  return context;
}
