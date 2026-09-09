import { create } from 'zustand';

import { PermissionsService } from '../services/permissions/PermissionsService';
import type { PermissionsSnapshot } from '../types';

type PermissionsState = {
  snapshot: PermissionsSnapshot;
  locationServicesEnabled: boolean;
  /** False until the first refresh completes, so the UI can hold the splash. */
  ready: boolean;

  refresh: () => Promise<PermissionsSnapshot>;
  requestForeground: () => Promise<void>;
  requestBackground: () => Promise<void>;
  requestNotifications: () => Promise<void>;
};

const EMPTY: PermissionsSnapshot = {
  foregroundLocation: 'unknown',
  backgroundLocation: 'unknown',
  notifications: 'unknown',
};

export const usePermissionsStore = create<PermissionsState>((set) => ({
  snapshot: EMPTY,
  locationServicesEnabled: true,
  ready: false,

  async refresh() {
    const [snapshot, locationServicesEnabled] = await Promise.all([
      PermissionsService.snapshot(),
      PermissionsService.areLocationServicesEnabled(),
    ]);
    set({ snapshot, locationServicesEnabled, ready: true });
    return snapshot;
  },

  async requestForeground() {
    await PermissionsService.requestForegroundLocation();
    await usePermissionsStore.getState().refresh();
  },

  async requestBackground() {
    await PermissionsService.requestBackgroundLocation();
    await usePermissionsStore.getState().refresh();
  },

  async requestNotifications() {
    await PermissionsService.requestNotifications();
    await usePermissionsStore.getState().refresh();
  },
}));
