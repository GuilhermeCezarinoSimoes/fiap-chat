/** Perfil completo armazenado em Firestore: users/{uid}. */
export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  /** Data no formato ISO AAAA-MM-DD. */
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

/** Dados públicos mínimos em Firestore: userDirectory/{uid}. */
export type UserDirectoryEntry = {
  uid: string;
  name: string;
  nameLower: string;
  photoUrl: string;
  updatedAt: number;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  phoneNumber: string;
  /** Data digitada pelo usuário no formato DD/MM/AAAA. */
  birthDate: string;
  photoUri: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};
