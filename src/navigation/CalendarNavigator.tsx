import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppointmentDetailScreen from '../screens/AppointmentDetailScreen';
import AppointmentSessionScreen from '../screens/AppointmentSessionScreen';
import CalendarScreen from '../screens/CalendarScreen';

export type CalendarStackParamList = {
  CalendarHome: undefined;
  AppointmentDetail: { appointmentId: string };
  AppointmentSession: { appointmentId: string };
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export default function CalendarNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true, animation: 'slide_from_right' }}>
      <Stack.Screen name="CalendarHome" component={CalendarScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen
        name="AppointmentSession"
        component={AppointmentSessionScreen}
        options={{ animation: 'fade_from_bottom', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
