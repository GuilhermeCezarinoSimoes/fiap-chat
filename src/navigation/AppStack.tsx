import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { MyProfileScreen } from '../screens/MyProfileScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { colors } from '../theme/colors';
import type { AppStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
      <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuários' }} />
      <Stack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: '' }} />
      <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: 'Meu perfil' }} />
    </Stack.Navigator>
  );
}
