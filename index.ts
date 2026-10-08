import { registerRootComponent } from 'expo';

import App from './src/App';

// registerRootComponent chama AppRegistry.registerComponent('main', () => App)
// e prepara o ambiente tanto no Expo Go quanto em builds nativos.
registerRootComponent(App);
