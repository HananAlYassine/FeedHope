// ============================================================
//  Notification bridge
//  --------------------------------------------------------------
//  Every page in the app uses either axios or window.fetch to
//  trigger backend actions. After ANY non-GET response, dispatch
//  the events the sidebars listen for (`notifUpdated` and
//  `notification-read`) so the unread badge / list refresh
//  instantly without waiting for the 3-second silent poll.
//
//  This file is imported for its side effects from index.js — it
//  installs the interceptors once at app startup, so every Donor /
//  Receiver / Volunteer / Admin page is covered automatically.
// ============================================================

import axios from 'axios';

// Same target endpoints as the sidebars: notifications and
// unread-count routes are read-only, so we never want to
// re-dispatch when the sidebar refetches its own count (that
// would create an event loop).
const isReadEndpoint = (urlOrConfig) => {
    try {
        const url = typeof urlOrConfig === 'string'
            ? urlOrConfig
            : (urlOrConfig?.url || urlOrConfig?.responseURL || '');
        // GETs are already excluded upstream — this guards against
        // any future POST/PUT to a read-only counter endpoint.
        return /\/notifications\/(all|unread-count)/.test(url) ||
               /\/notifications\/?(\?|$)/.test(url);
    } catch {
        return false;
    }
};

const dispatchNotifEvent = () => {
    try {
        // Sidebars in this codebase listen for both names — fire
        // both so we don't have to remember which role uses which.
        window.dispatchEvent(new Event('notifUpdated'));
        window.dispatchEvent(new Event('notification-read'));
    } catch {
        /* SSR / older browsers — ignore */
    }
};

// ── 1. axios response interceptor ─────────────────────────────
// Fires after any non-GET request resolves successfully. We only
// care about successful mutations — a 4xx/5xx didn't actually
// change server state.
axios.interceptors.response.use(
    (response) => {
        try {
            const method = (response?.config?.method || '').toUpperCase();
            if (method && method !== 'GET' && !isReadEndpoint(response.config)) {
                dispatchNotifEvent();
            }
        } catch {
            /* never let our hook break the actual request */
        }
        return response;
    },
    (error) => Promise.reject(error)
);

// ── 2. fetch() wrapper ────────────────────────────────────────
// Some pages still use the native fetch API. Patch it once at
// startup so those calls also dispatch the event.
if (typeof window !== 'undefined' && window.fetch && !window.fetch.__notifBridgePatched) {
    const originalFetch = window.fetch.bind(window);
    const patchedFetch = async (input, init = {}) => {
        const response = await originalFetch(input, init);
        try {
            const method = (init?.method || (typeof input === 'object' ? input.method : 'GET') || 'GET').toUpperCase();
            const url = typeof input === 'string' ? input : (input?.url || '');
            if (response.ok && method !== 'GET' && !isReadEndpoint(url)) {
                dispatchNotifEvent();
            }
        } catch {
            /* never let our hook break the actual response */
        }
        return response;
    };
    patchedFetch.__notifBridgePatched = true;
    window.fetch = patchedFetch;
}
