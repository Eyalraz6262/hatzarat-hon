import { registerRootComponent } from 'expo';
import { I18nManager } from 'react-native';

import App from './App';
import { installNotificationHandler } from './src/services/notifications/NotificationService';
import { registerBackgroundTasks } from './src/services/geofencing/backgroundTasks';

/**
 * Entry point. Order here is load-bearing.
 *
 * 1. RTL is permitted, but not decided here. The language is not known yet —
 *    the stored preference is on disk and reading it is asynchronous — so
 *    forcing a direction at this point would force it from the default, which
 *    is Hebrew, for everyone. `App` sets it once the language is resolved.
 *    Our own components never wait for that: they take direction from the
 *    language directly, so the very first frame of the very first launch is
 *    already correct.
 * 2. Background tasks are defined at module scope — NOT inside a component. The
 *    OS may spin up a fresh JS context to deliver a geofence event with no UI
 *    mounted at all; the task must already be defined when that happens.
 * 3. Only then does the React app get registered.
 */
I18nManager.allowRTL(true);

installNotificationHandler();
registerBackgroundTasks();

registerRootComponent(App);
