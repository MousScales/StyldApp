import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import ClientListScreen from '../screens/ClientListScreen';
import ClientRemindersScreen from '../screens/ClientRemindersScreen';

export type ClientStackParamList = {
  ClientList: undefined;
  ClientDetail: { clientId: string };
  ClientReminders: undefined;
};

const Stack = createNativeStackNavigator<ClientStackParamList>();

export default function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true, animation: 'slide_from_right' }}>
      <Stack.Screen name="ClientList" component={ClientListScreen} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <Stack.Screen name="ClientReminders" component={ClientRemindersScreen} />
    </Stack.Navigator>
  );
}
