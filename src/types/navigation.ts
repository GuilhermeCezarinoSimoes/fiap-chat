import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ConversationType } from './chat';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type UsersScreenMode = 'direct' | 'selectMembers';

export type AppStackParamList = {
  Conversations: undefined;
  Users: { mode: UsersScreenMode; selectedIds?: string[]; maxSelectable?: number };
  GroupForm: { groupId?: string; selectedMemberIds?: string[] };
  Chat: { conversationId: string; conversationType: ConversationType };
  GroupMembers: { groupId: string };
  Profile: { uid: string };
  MyProfile: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
