import { useEffect } from 'react';

import { currentScheme } from '../theme';

/**
 * Makes the page installable to an iPhone home screen.
 *
 * Safari reads these tags at the moment "Add to Home Screen" is tapped, not at
 * first paint, so injecting them at runtime works — which is the only option
 * here: the page is served inside a host document whose `<head>` this build
 * does not write.
 *
 * `apple-mobile-web-app-capable` is what makes the launched icon open without
 * Safari's chrome, which is the whole difference between a bookmark and
 * something that feels like an app. `black-translucent` puts the page under the
 * status bar, and the app's own safe-area insets already account for it.
 *
 * A theme-colour tag follows the scheme so the status bar and the task
 * switcher's card match the app rather than defaulting to white.
 */
export function useHomeScreenMeta(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const set = (attr: 'name' | 'rel', key: string, value: string, tag: 'meta' | 'link') => {
      let el = document.head.querySelector(`${tag}[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement(tag);
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute(tag === 'meta' ? 'content' : 'href', value);
    };

    set('name', 'apple-mobile-web-app-capable', 'yes', 'meta');
    set('name', 'mobile-web-app-capable', 'yes', 'meta');
    set('name', 'apple-mobile-web-app-status-bar-style', 'black-translucent', 'meta');
    set('name', 'apple-mobile-web-app-title', 'הגענו?', 'meta');
    set('name', 'theme-color', currentScheme().bg, 'meta');

    // The tile Safari uses for the home-screen icon. Inlined by the bundler, so
    // it is the app's real icon rather than a screenshot of the page.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const icon = require('../../assets/icon.png');
    const href = typeof icon === 'string' ? icon : icon?.uri;
    if (href) {
      set('rel', 'apple-touch-icon', href, 'link');
      set('rel', 'icon', href, 'link');
    }
  }, []);
}
