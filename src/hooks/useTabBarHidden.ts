import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { shouldHideTabBar } from '../navigation/tabBarVisibility';

/** True when the active tab has left its home screen (matches floating tab bar rules). */
export function useTabBarHidden(): boolean {
  const navigation = useNavigation();

  // Re-render when the nearest stack/tab state changes.
  useNavigationState(() => null);

  const parent = navigation.getParent();
  const tabState = (parent?.getState() ?? navigation.getState()) as BottomTabBarProps['state'];
  return shouldHideTabBar(tabState);
}
