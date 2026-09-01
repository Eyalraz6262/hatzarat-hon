import { registerRootComponent } from 'expo';
import { I18nManager } from 'react-native';

import App from './App';
import { isRTL } from './src/i18n';
import { installNotificationHandler } from './src/services/notifications/NotificationService';
import { registerBackgroundTasks } from './src/services/geofencing/backgroundTasks';

/**
 * Entry point. Order here is load-bearing.
 *
 * 1. RTL is configured before the first render so native views (TextInput caret,
 *    Alert button order) lay out correctly. Our own components additionally take
 *    direction from the i18n module, so the UI is correct even on the very first
 *    launch, before the native flag has taken effect.
 * 2. Background tasks are defined at module scope — NOT inside a component. The
 *    OS may spin up a fresh JS context to deliver a geofence event with no UI
 *    mounted at all; the task must already be defined when that happens.
 * 3. Only then does the React app get registered.
 */
I18nManager.allowRTL(true);
I18nManager.forceRTL(isRTL());

installNotificationHandler();
registerBackgroundTasks();

registerRootComponent(App);
