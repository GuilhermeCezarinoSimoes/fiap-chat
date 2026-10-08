/// <reference types="node" />
import fs from 'node:fs';
import type { ExpoConfig } from 'expo/config';

// google-services.json (Android/FCM) e GoogleService-Info.plist (iOS) são
// arquivos de configuração do cliente. No EAS Build podem ser fornecidos como
// variáveis de ambiente do tipo "file".
const androidGoogleServices = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const iosGoogleServices = process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist';

const config: ExpoConfig = {
  name: 'FIAP Chat',
  slug: 'fiap-chat',
  owner: 'guilhermecezarinosimeos',
  scheme: 'fiapchat',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'br.com.fiap.chat',
    googleServicesFile: fs.existsSync(iosGoogleServices) ? iosGoogleServices : undefined,
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      NSPhotoLibraryUsageDescription: 'Precisamos acessar suas fotos para definir a imagem do perfil ou do grupo.',
      NSCameraUsageDescription: 'Precisamos acessar a câmera para tirar a foto do perfil ou do grupo.',
    },
  },
  android: {
    package: 'br.com.fiap.chat',
    googleServicesFile: fs.existsSync(androidGoogleServices) ? androidGoogleServices : undefined,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['POST_NOTIFICATIONS'],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-image',
    [
      'expo-notifications',
      {
        color: '#ED145B',
        defaultChannel: 'messages',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Precisamos acessar suas fotos para definir a imagem do perfil ou do grupo.',
        cameraPermission: 'Precisamos acessar a câmera para tirar a foto do perfil ou do grupo.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'ffff2cc4-1ee9-4e67-b7ff-c3c4ecf8e8ef',
    },
  },
};

export default config;
