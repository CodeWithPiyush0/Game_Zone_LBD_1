// Supabase client + thin CRUD wrappers for QA comments.
// Reads/inserts go directly against the table (allowed by RLS).
// Updates/deletes route through the qa-action Edge Function, which validates
// either the Owner/QA password or the author for self-actions before writing.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://ttxdyyrsyctnqoymytgb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_KoUbyZ1vZnpuvucWRYJVHQ_A1wG4vmY';

export const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/qa-action`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Map a Postgres row (snake_case + ISO timestamp) into the in-app comment
// shape (camelCase + ms epoch) used by the rest of the QA module.
function rowToComment(row) {
    return {
        id:        row.id,
        selector:  row.selector,
        x:         row.x,
        y:         row.y,
        text:      row.text,
        page:      row.page,
        screen:    row.screen,
        author:    row.author,
        parentId:  row.parent_id,
        status:    row.status,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
}

// ── Reads + inserts (direct, RLS-controlled) ────────────────────────
export async function fetchComments({ page, screen } = {}) {
    let q = supabase
        .from('qa_comments')
        .select('*')
        .order('created_at', { ascending: true });
    if (page)   q = q.eq('page', page);
    if (screen) q = q.eq('screen', screen);
    const { data, error } = await q;
    if (error) {
        console.error('[QA] fetchComments failed', error);
        return [];
    }
    return (data || []).map(rowToComment);
}

export async function insertComment({ selector, x, y, text, page, screen, author }) {
    const { data, error } = await supabase
        .from('qa_comments')
        .insert([{ selector, x, y, text, page, screen, author }])
        .select()
        .single();
    if (error) {
        console.error('[QA] insertComment failed', error);
        return null;
    }
    return rowToComment(data);
}

// ── Privileged mutations (via Edge Function) ────────────────────────
async function invokeQAAction(body) {
    try {
        const res = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
        if (!res.ok) {
            console.warn('[QA] action rejected:', data?.error || res.statusText);
            return { ok: false, status: res.status, error: data?.error };
        }
        return { ok: true, data };
    } catch (err) {
        console.error('[QA] Edge function call failed', err);
        return { ok: false, error: err.message };
    }
}

export async function verifyPassword(password) {
    const result = await invokeQAAction({ password, action: 'verify' });
    if (result.ok && result.data?.role) return result.data.role;
    return null;
}

export async function updateCommentRow(id, patch, { password, author } = {}) {
    const result = await invokeQAAction({
        password,
        author,
        action:  'update_comment',
        payload: { id, ...patch },
    });
    if (!result.ok) return null;
    return result.data?.row ? rowToComment(result.data.row) : null;
}

export async function deleteCommentRow(id, { password, author } = {}) {
    const result = await invokeQAAction({
        password,
        author,
        action:  'delete_comment',
        payload: { id },
    });
    return result.ok;
}
