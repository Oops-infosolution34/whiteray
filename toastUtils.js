//created by harminder
/**
 * Toast utility with built-in deduplication.
 *
 * React-toastify will NOT show a new toast if a toast with the same
 * toastId is already visible on screen. This prevents stacking when
 * a user clicks a button multiple times rapidly.
 *
 * Each toast type gets its own stable ID so:
 *  - Multiple errors don't stack (only 1 error toast visible at a time)
 *  - Multiple warnings don't stack (only 1 warning toast visible at a time)
 *  - Success + error CAN coexist (they have different IDs)
 */
import { toast as _toast } from 'react-toastify';

export const toast = {
  success: (msg, options = {}) =>
    _toast.success(msg, { toastId: 'toast-success', ...options }),

  error: (msg, options = {}) =>
    _toast.error(msg, { toastId: 'toast-error', ...options }),

  warn: (msg, options = {}) =>
    _toast.warn(msg, { toastId: 'toast-warn', ...options }),

  info: (msg, options = {}) =>
    _toast.info(msg, { toastId: 'toast-info', ...options }),
};
