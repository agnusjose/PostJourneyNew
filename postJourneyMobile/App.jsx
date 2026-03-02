import 'whatwg-fetch';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { CLERK_PUBLISHABLE_KEY } from './config/ClerkConfig';
import SplashScreen from './screens/SplashScreen';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AdminLoginScreen from "./screens/AdminLoginScreen";
import AdminUsersScreen from "./screens/admin/AdminUsersScreen";
import PatientDashboard from "./screens/PatientDashboard";
import ServiceProviderDashboard from "./screens/ServiceProviderDashboard";
import ExercisesDashboard from './screens/ExercisesDashboard';
import VideoPlayer from "./screens/VideoPlayer";
import MedicalVideos from "./screens/MedicalVideos";
import OtpVerifyScreen from "./screens/OtpVerifyScreen";
import TFSanityTest from "./screens/TFSanityTest";
import MiniSquatMonitor from './screens/exerciseMonitoring/MiniSquatMonitoring'
import ExercisesDemo from './screens/exerciseMonitoring/ExercisesDemo';
import NeckMobilityMonitor from './screens/exerciseMonitoring/NeckMobilityMonitor';
import ExerciseCompleted from './screens/exerciseMonitoring/ExerciseCompleted';
import CardiacRehab from './screens/exercises/CardiacRehab';
import Icu_General from './screens/exercises/Icu_General';
import Elderlycare from './screens/exercises/Elderlycare';
import CommonExercises from './screens/exercises/CommonExercises';
import Post_SurgicalRehab from './screens/exercises/Post_SurgicalRehab';
import Orthopedic from './screens/exercises/Orthopedic';
import PulmonaryRehab from './screens/exercises/PulmonaryRehab';
import StrokeRehab from './screens/exercises/StrokeRehab';
import MarchingInPlaceMonitor from './screens/exerciseMonitoring/MarchingInPlaceMonitor';
import ShoulderRollsMonitor from './screens/exerciseMonitoring/ShoulderRollsMonitor';
import ThoracicExpansionArmLiftMonitor from './screens/exerciseMonitoring/ThoracicExpansionArmLiftMonitor';
import WeightShiftMonitor from './screens/exerciseMonitoring/WeightShiftMonitor';
import SitToStandMonitor from './screens/exerciseMonitoring/SitToStandMonitor';
import SeatedShoulderFlexionMonitor from './screens/exerciseMonitoring/SeatedShoulderFlexionMonitor';
import SeatedElbowFlexExtMonitor from './screens/exerciseMonitoring/SeatedElbowFlexExtMonitor';
import SeatedKneeExtensionMonitor from './screens/exerciseMonitoring/SeatedKneeExtensionMonitor';
import AnklePumpsMonitor from './screens/exerciseMonitoring/AnklePumpsMonitor';
import HeelSlidesMonitor from './screens/exerciseMonitoring/HeelSlidesMonitor';
import BedMobilityMonitor from './screens/exerciseMonitoring/BedMobilityMonitor';
import HipExtensionMonitor from './screens/exerciseMonitoring/HipExtensionMonitor';
import PendulumExerciseMonitor from './screens/exerciseMonitoring/PendulumExerciseMonitor';
import SeatedTrunkFlexExtMonitor from './screens/exerciseMonitoring/SeatedTrunkFlexExtMonitor';
import StandingHipAbductionMonitor from './screens/exerciseMonitoring/StandingHipAbductionMonitor';
import StraightLegRaiseMonitor from './screens/exerciseMonitoring/StraightLegRaiseMonitor';
import TandemStandingMonitor from './screens/exerciseMonitoring/TandemStandingMonitor';
import TurnInPlaceMonitor from './screens/exerciseMonitoring/TurnInPlaceMonitor';
import StaticStandingMonitor from './screens/exerciseMonitoring/StaticStandingMonitor';
import AdminDashboard from './screens/admin/AdminDashboard';
import AdminStackNavigator from './screens/admin/AdminStackNavigator';
import ManageProviders from './screens/admin/ManageProviders';
import AdminUserDetailsScreen from './screens/admin/AdminUserDetailsScreen';
import ServiceBookingScreen from './screens/ServiceBookingScreen';
import PatientEquipmentList from "./screens/Bookings/PatientEquipmentList";
import PatientCartScreen from "./screens/Bookings/PatientCartScreen";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import ServiceProviderProfileCompletion from "./screens/ServiceProviderProfileCompletion";
import PatientProfileCompletion from "./screens/PatientProfileCompletion";
import PatientProfileScreen from "./screens/PatientProfileScreen";
import EquipmentDashboardScreen from './screens/Bookings/EquipmentDashboardScreen';
import AddEquipment from './screens/Bookings/AddEquipment';
import CheckoutScreen from "./screens/Bookings/CheckoutScreen";
import EditEquipment from './screens/Bookings/EditEquipment';
import PatientBookingsScreen from "./screens/Bookings/PatientBookingsScreen";
import ProviderBookingsScreen from "./screens/Bookings/ProviderBookingsScreen";
import EquipmentDetailScreen from './screens/Bookings/EquipmentDetailScreen';
import OrderDetailsScreen from "./screens/Bookings/OrderDetailsScreen";
import PaymentScreen from "./screens/Payments/PaymentScreen";
import PaymentSuccess from "./screens/Payments/PaymentSuccess";
import PaymentFailed from "./screens/Payments/PaymentFailed";
import CashOnDeliverySuccess from './screens/Payments/CashOnDeliverySuccess';
import WriteReviewScreen from './screens/Bookings/WriteReviewScreen';
import ProviderBookingDetailsScreen from './screens/Bookings/ProviderBookingDetailsScreen';
import ProviderEquipmentDetailsScreen from './screens/Bookings/ProviderEquipmentDetailsScreen';
import CaregiverListScreen from './screens/CaregiverListScreen';
import CaregiverDetailScreen from './screens/CaregiverDetailScreen';
import CaregiverDashboard from './screens/CaregiverDashboard';
import CaregiverEditProfile from './screens/CaregiverEditProfile';
import RateCaregiverScreen from './screens/RateCaregiverScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import GooglePasswordScreen from './screens/GooglePasswordScreen';
import ProviderApprovalPending from './screens/ProviderApprovalPending';
import ServiceProviderProfileScreen from './screens/ServiceProviderProfileScreen';
import DoctorDashboard from "./screens/DoctorDashboard";
import DoctorProfileCompletion from "./screens/DoctorProfileCompletion";
import ConsultDoctor from "./screens/ConsultDoctor";
import MyConsultations from "./screens/MyConsultations";
import ChatScreen from "./screens/ChatScreen";
import PatientDocuments from "./screens/PatientDocuments";
import MyPatients from "./screens/MyPatients";
import PatientConsultations from "./screens/PatientConsultations";
import PatientPaymentHistory from "./screens/PatientPaymentHistory";
import DoctorPaymentHistory from "./screens/DoctorPaymentHistory";
import ManageDoctors from "./screens/admin/ManageDoctors";
import AdminBookingsScreen from "./screens/admin/AdminBookingsScreen";
import ComplaintsScreen from "./screens/ComplaintsScreen";
import AdminComplaintsScreen from "./screens/admin/AdminComplaintsScreen";
const Stack = createNativeStackNavigator();
const tokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AuthProvider>
          <CartProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
                <Stack.Screen name="LoginScreen" component={LoginScreen} />
                <Stack.Screen name="HomeScreen" component={HomeScreen} />
                <Stack.Screen name="AdminLoginScreen" component={AdminLoginScreen} />
                <Stack.Screen name="AdminUsersScreen" component={AdminUsersScreen} />
                <Stack.Screen name="PatientDashboard" component={PatientDashboard} />
                <Stack.Screen name="ServiceProviderDashboard" component={ServiceProviderDashboard} />
                <Stack.Screen name="ProviderApprovalPending" component={ProviderApprovalPending} />
                <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
                <Stack.Screen name='ExercisesDashboard' component={ExercisesDashboard} />
                <Stack.Screen name="MedicalVideos" component={MedicalVideos} />
                <Stack.Screen name="OtpVerifyScreen" component={OtpVerifyScreen} />
                <Stack.Screen name="TFSanityTest" component={TFSanityTest} />
                <Stack.Screen name="MiniSquatMonitor" component={MiniSquatMonitor} />
                <Stack.Screen name="ExercisesDemo" component={ExercisesDemo} />
                <Stack.Screen name="NeckMobilityMonitor" component={NeckMobilityMonitor} />
                <Stack.Screen name="ExerciseCompleted" component={ExerciseCompleted} />
                <Stack.Screen name="CardiacRehab" component={CardiacRehab} />
                <Stack.Screen name="Icu_General" component={Icu_General} />
                <Stack.Screen name="ElderlyCare" component={Elderlycare} />
                <Stack.Screen name="CommonExercises" component={CommonExercises} />
                <Stack.Screen name="Post_SurgicalRehab" component={Post_SurgicalRehab} />
                <Stack.Screen name="Orthopedic" component={Orthopedic} />
                <Stack.Screen name="PulmonaryRehab" component={PulmonaryRehab} />
                <Stack.Screen name="StrokeRehab" component={StrokeRehab} />
                <Stack.Screen name="MarchingInPlaceMonitor" component={MarchingInPlaceMonitor} />
                <Stack.Screen name="ShoulderRollsMonitor" component={ShoulderRollsMonitor} />
                <Stack.Screen name="ThoracicExpansionArmLiftMonitor" component={ThoracicExpansionArmLiftMonitor} />
                <Stack.Screen name="WeightShiftMonitor" component={WeightShiftMonitor} />
                <Stack.Screen name="SitToStandMonitor" component={SitToStandMonitor} />
                <Stack.Screen name="SeatedShoulderFlexionMonitor" component={SeatedShoulderFlexionMonitor} />
                <Stack.Screen name="SeatedElbowFlexExtMonitor" component={SeatedElbowFlexExtMonitor} />
                <Stack.Screen name="SeatedKneeExtensionMonitor" component={SeatedKneeExtensionMonitor} />
                <Stack.Screen name="AnklePumpsMonitor" component={AnklePumpsMonitor} />
                <Stack.Screen name="HeelSlidesMonitor" component={HeelSlidesMonitor} />
                <Stack.Screen name="BedMobilityMonitor" component={BedMobilityMonitor} />
                <Stack.Screen name="HipExtensionMonitor" component={HipExtensionMonitor} />
                <Stack.Screen name="PendulumExerciseMonitor" component={PendulumExerciseMonitor} />
                <Stack.Screen name="SeatedTrunkFlexExtMonitor" component={SeatedTrunkFlexExtMonitor} />
                <Stack.Screen name="StandingHipAbductionMonitor" component={StandingHipAbductionMonitor} />
                <Stack.Screen name="StraightLegRaiseMonitor" component={StraightLegRaiseMonitor} />
                <Stack.Screen name="TandemStandingMonitor" component={TandemStandingMonitor} />
                <Stack.Screen name="TurnInPlaceMonitor" component={TurnInPlaceMonitor} />
                <Stack.Screen name="StaticStandingMonitor" component={StaticStandingMonitor} />
                <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
                <Stack.Screen name="AdminStackNavigator" component={AdminStackNavigator} />
                <Stack.Screen name="ManageProviders" component={ManageProviders} />
                <Stack.Screen name="AdminUserDetailsScreen" component={AdminUserDetailsScreen} />
                <Stack.Screen name="ManageDoctors" component={ManageDoctors} />
                <Stack.Screen name="AdminBookingsScreen" component={AdminBookingsScreen} />
                <Stack.Screen name="ServiceBookingScreen" component={ServiceBookingScreen} />
                <Stack.Screen name="PatientEquipmentList" component={PatientEquipmentList} />
                <Stack.Screen name="PatientCart" component={PatientCartScreen} />
                <Stack.Screen name="ServiceProviderProfileCompletion" component={ServiceProviderProfileCompletion} />
                <Stack.Screen name="PatientProfileCompletion" component={PatientProfileCompletion} />
                <Stack.Screen name="PatientProfileScreen" component={PatientProfileScreen} />
                <Stack.Screen name="ServiceProviderProfileScreen" component={ServiceProviderProfileScreen} />
                <Stack.Screen name="EquipmentDashboardScreen" component={EquipmentDashboardScreen} />
                <Stack.Screen name="AddEquipment" component={AddEquipment} />
                <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
                <Stack.Screen name="EditEquipment" component={EditEquipment} />
                <Stack.Screen name="PatientBookingsScreen" component={PatientBookingsScreen} />
                <Stack.Screen name="ProviderBookingsScreen" component={ProviderBookingsScreen} />
                <Stack.Screen name="EquipmentDetailScreen" component={EquipmentDetailScreen} />
                <Stack.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} />
                <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
                <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
                <Stack.Screen name="PaymentFailed" component={PaymentFailed} />
                <Stack.Screen name="CashOnDeliverySuccess" component={CashOnDeliverySuccess} />
                <Stack.Screen name="WriteReviewScreen" component={WriteReviewScreen} />
                <Stack.Screen name="ProviderBookingDetailsScreen" component={ProviderBookingDetailsScreen} />
                <Stack.Screen name="ProviderEquipmentDetailsScreen" component={ProviderEquipmentDetailsScreen} />
                <Stack.Screen name="CaregiverListScreen" component={CaregiverListScreen} />
                <Stack.Screen name="CaregiverDetailScreen" component={CaregiverDetailScreen} />
                <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboard} />
                <Stack.Screen name="CaregiverEditProfile" component={CaregiverEditProfile} />
                <Stack.Screen name="RateCaregiverScreen" component={RateCaregiverScreen} />
                <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
                <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
                <Stack.Screen name="GooglePasswordScreen" component={GooglePasswordScreen} />
                <Stack.Screen name="DoctorDashboard" component={DoctorDashboard} />
                <Stack.Screen name="DoctorProfileCompletion" component={DoctorProfileCompletion} />
                <Stack.Screen name="ConsultDoctor" component={ConsultDoctor} />
                <Stack.Screen name="MyConsultations" component={MyConsultations} />
                <Stack.Screen name="ChatScreen" component={ChatScreen} />
                <Stack.Screen name="PatientDocuments" component={PatientDocuments} />
                <Stack.Screen name="MyPatients" component={MyPatients} />
                <Stack.Screen name="PatientConsultations" component={PatientConsultations} />
                <Stack.Screen name="PatientPaymentHistory" component={PatientPaymentHistory} />
                <Stack.Screen name="DoctorPaymentHistory" component={DoctorPaymentHistory} />
                <Stack.Screen name="ComplaintsScreen" component={ComplaintsScreen} />
                <Stack.Screen name="AdminComplaintsScreen" component={AdminComplaintsScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </CartProvider>
        </AuthProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
