// QA storage — localStorage helpers. Single key, JSON array of comments.
// Comment shape: { id, selector, x, y, text, page, createdAt }

const STORAGE_KEY = 'qa-comments-v1';
const AUTHOR_KEY  = 'qa-author-name';

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

function uid() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        // Legacy migration: backfill missing screen + author fields so older
        // comments don't disappear or show as blank.
        return parsed.map(c => {
            let next = c;
            if (!next.screen) next = { ...next, screen: 'Pre-LBD' };
            if (!next.author) next = { ...next, author: 'Unknown' };
            return next;
        });
    } catch {
        return [];
    }
}

function writeAll(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('[QA] localStorage write failed', e);
    }
}

export function getCommentsForCurrentScreen(screen) {
    const page = location.pathname;
    return readAll().filter(c => c.page === page && c.screen === screen);
}

export function addComment({ selector, x, y, text, screen }) {
    const list = readAll();
    const entry = {
        id: uid(),
        selector,
        x,
        y,
        text,
        page: location.pathname,
        screen: screen || 'Other',
        author: getAuthor() || 'Anonymous',
        createdAt: Date.now(),
    };
    list.push(entry);
    writeAll(list);
    return entry;
}

export function updateComment(id, patch) {
    const list = readAll();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    writeAll(list);
    return list[idx];
}

export function deleteComment(id) {
    writeAll(readAll().filter(c => c.id !== id));
}

export function findCommentById(id) {
    return readAll().find(c => c.id === id) || null;
}
