// QA storage layer.
//   • Identity (name, role, and the Owner/QA password) is per-browser in localStorage.
//   • Comments live in Supabase. A small cache lets the renderer stay synchronous;
//     mutations refresh the cache after the network round-trip.
//
// Comment shape: { id, selector, x, y, text, page, screen, author,
//                  parentId, status, createdAt }

import {
    fetchComments,
    insertComment,
    updateCommentRow,
    deleteCommentRow,
    verifyPassword,
} from './qa-supabase.js';

// localStorage keys
const AUTHOR_KEY    = 'qa-author-name';
const ROLE_KEY      = 'qa-role';      // 'owner' | 'qa' | 'other'
const PASSWORD_KEY  = 'qa-password';  // raw password for power roles (used to sign privileged calls)

// ── Author identity ─────────────────────────────────────────────────
export function getAuthor() {
    try { return localStorage.getItem(AUTHOR_KEY) || ''; } catch { return ''; }
}

export function setAuthor(name) {
    try {
        if (name) localStorage.setItem(AUTHOR_KEY, name);
        else      localStorage.removeItem(AUTHOR_KEY);
    } catch (e) { console.warn('[QA] cannot save author', e); }
}

// ── Role identity ───────────────────────────────────────────────────
export function getRole() {
    try { return localStorage.getItem(ROLE_KEY) || ''; } catch { return ''; }
}

export function setRole(role) {
    try {
        if (role) localStorage.setItem(ROLE_KEY, role);
        else      localStorage.removeItem(ROLE_KEY);
    } catch (e) { console.warn('[QA] cannot save role', e); }
}

// ── Password (Owner/QA only) ────────────────────────────────────────
function getPassword() {
    try { return localStorage.getItem(PASSWORD_KEY) || ''; } catch { return ''; }
}

export function setPassword(pwd) {
    try {
        if (pwd) localStorage.setItem(PASSWORD_KEY, pwd);
        else     localStorage.removeItem(PASSWORD_KEY);
    } catch (e) { console.warn('[QA] cannot save password', e); }
}

export function clearSession() {
    setAuthor('');
    setRole('');
    setPassword('');
}

export const isPowerRole = (role) => role === 'owner' || role === 'qa';

// Re-export verifyPassword so the modal can call it directly.
export { verifyPassword };

// ── Permission helpers ──────────────────────────────────────────────
// Can the current session edit / delete this comment?
//   • Owner & QA: anything
//   • Other: only their own (matching author)
export function canEditComment(comment) {
    const role = getRole();
    if (isPowerRole(role)) return true;
    return comment && comment.author === getAuthor();
}

// Status changes are restricted to Owner/QA regardless of authorship.
export function canChangeStatus() {
    return isPowerRole(getRole());
}

// ── Comment cache + Supabase sync ───────────────────────────────────
let cachedComments = [];

export async function refreshComments() {
    cachedComments = await fetchComments({ page: location.pathname });
    return cachedComments;
}

export function getCommentsForCurrentScreen(screen) {
    return cachedComments.filter(c => c.screen === screen);
}

export function findCommentById(id) {
    return cachedComments.find(c => c.id === id) || null;
}

export async function addComment({ selector, x, y, text, screen }) {
    const entry = await insertComment({
        selector,
        x,
        y,
        text,
        page: location.pathname,
        screen: screen || 'Other',
        author: getAuthor() || 'Anonymous',
    });
    if (entry) cachedComments.push(entry);
    return entry;
}

// Updates go through the Edge Function, carrying either the Owner/QA password
// or the current author (for self-edits).
export async function updateComment(id, patch) {
    const updated = await updateCommentRow(id, patch, {
        password: isPowerRole(getRole()) ? getPassword() : undefined,
        author:   getAuthor() || undefined,
    });
    if (updated) {
        const idx = cachedComments.findIndex(c => c.id === id);
        if (idx !== -1) cachedComments[idx] = updated;
    }
    return updated;
}

export async function deleteComment(id) {
    const ok = await deleteCommentRow(id, {
        password: isPowerRole(getRole()) ? getPassword() : undefined,
        author:   getAuthor() || undefined,
    });
    if (ok) cachedComments = cachedComments.filter(c => c.id !== id);
    return ok;
}
