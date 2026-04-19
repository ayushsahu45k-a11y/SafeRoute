import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => {}),
  removeItem: vi.fn(() => {}),
  clear: vi.fn(() => {}),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock geolocation
global.navigator.geolocation = {
  getCurrentPosition: vi.fn(() => {}),
  watchPosition: vi.fn(() => {}),
  clearWatch: vi.fn(() => {}),
};

// Mock Notification
Object.defineProperty(window, 'Notification', {
  value: {
    requestPermission: vi.fn(() => Promise.resolve('granted')),
    permission: 'default',
  },
});

// Mock fetch
global.fetch = vi.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);