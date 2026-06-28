import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

/** Root screen per tab — tab bar stays visible only on these. */
export const TAB_HOME_SCREENS = {
  Dashboard: 'DashboardHome',
  Calendar: 'CalendarHome',
  Site: 'SiteHome',
  Client: 'ClientList',
  Profile: 'ProfileHome',
} as const;

export type TabRouteName = keyof typeof TAB_HOME_SCREENS;

export function shouldHideTabBar(state: BottomTabBarProps['state']): boolean {
  const currentRoute = state.routes[state.index ?? 0];
  const homeScreen = TAB_HOME_SCREENS[currentRoute.name as TabRouteName];
  if (!homeScreen) return false;

  const nestedState = currentRoute.state;
  if (!nestedState?.routes.length) return false;

  const nestedRoute = nestedState.routes[nestedState.index ?? nestedState.routes.length - 1];
  return nestedRoute?.name !== homeScreen;
}
