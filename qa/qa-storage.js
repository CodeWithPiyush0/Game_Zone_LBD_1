// QA storage layer.
//   • Author identity stays in localStorage (per-browser tag).
//   • Comments live in Supabase. A small in-memory cache lets the renderers
//     stay synchronous; mutations refresh the cache.
//
// Comment shape: { id, selector, x, y, text, page, screen, author,
//                  parentId, status, createdAt }

import {
    fetchComments,
    insertComment,
    updateCommentRow,
    deleteCommentRow,
} from './qa-supabase.js';

const AUTHOR_KEY = 'qa-author-name';

// ── Author identity (local) ─────────────────────────────────────────
export function getAuthor() {
    try {
        return localStorage.getItem(AUTHOR_KEY) || '';
    } catch {
        return '';
    }
}

export function setAuthor(name) {
    try {
        if (name) localStorage.setItem(AUTHOR_KEY, name);
        else      localStorage.removeItem(AUTHOR_KEY);
    } catch (e) {
        console.warn('[QA] cannot save author', e);
    }
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

export async function updateComment(id, patch) {
    const updated = await updateCommentRow(id, patch);
    if (updated) {
        const idx = cachedComments.findIndex(c => c.id === id);
        if (idx !== -1) cachedComments[idx] = updated;
    }
    return updated;
}

export async function deleteComment(id) {
    const ok = await deleteCommentRow(id);
    if (ok) cachedComments = cachedComments.filter(c => c.id !== id);
    return ok;
}
