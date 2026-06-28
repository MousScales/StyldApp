import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { getLoginLayoutMetrics } from '../theme/layout';

export function useLoginLayout() {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getLoginLayoutMetrics(width, height), [height, width]);
}
