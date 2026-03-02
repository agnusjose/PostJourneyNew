import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminDashboard from "./AdminDashboard";
import AdminUsersScreen from "./AdminUsersScreen";
import AdminUserDetailsScreen from "./AdminUserDetailsScreen";
import AdminBookingsScreen from "./AdminBookingsScreen";
import ManageProviders from "./ManageProviders";
import ManageDoctors from "./ManageDoctors";
import AdminPendingApprovalsScreen from "./AdminPendingApprovalsScreen";
import AdminComplaintsScreen from "./AdminComplaintsScreen";

const Stack = createNativeStackNavigator();

export default function AdminStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="AdminUsersScreen" component={AdminUsersScreen} />
      <Stack.Screen name="AdminUserDetailsScreen" component={AdminUserDetailsScreen} />
      <Stack.Screen name="AdminBookingsScreen" component={AdminBookingsScreen} />
      <Stack.Screen name="ManageProviders" component={ManageProviders} />
      <Stack.Screen name="ManageDoctors" component={ManageDoctors} />
      <Stack.Screen name="AdminPendingApprovalsScreen" component={AdminPendingApprovalsScreen} />
      <Stack.Screen name="AdminComplaintsScreen" component={AdminComplaintsScreen} />
    </Stack.Navigator>
  );
}
