import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppointmentDetailScreen from './AppointmentDetailScreen';
import { DashboardStackParamList } from '../navigation/DashboardNavigator';

type Props = NativeStackScreenProps<DashboardStackParamList, 'BookingDetail'>;
type AppointmentProps = NativeStackScreenProps<DashboardStackParamList, 'AppointmentDetail'>;

/** Same booking record as AppointmentDetail — keeps dashboard “booking” links in sync. */
export default function BookingDetailScreen({ navigation, route }: Props) {
  return (
    <AppointmentDetailScreen
      navigation={navigation as AppointmentProps['navigation']}
      route={{
        ...route,
        params: { appointmentId: route.params.bookingId },
      }}
    />
  );
}
