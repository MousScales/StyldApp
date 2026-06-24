import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminSalonDetailScreen from '../screens/admin/AdminSalonDetailScreen';
import AdminBookingDetailScreen from '../screens/admin/AdminBookingDetailScreen';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminSalonDetail: { userId: string };
  AdminBookingDetail: { bookingId: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminSalonDetail" component={AdminSalonDetailScreen} />
      <Stack.Screen name="AdminBookingDetail" component={AdminBookingDetailScreen} />
    </Stack.Navigator>
  );
}
