// Supabase client + thin CRUD wrappers for QA comments.
// Loaded as an ES module via esm.sh — no bundler needed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://ttxdyyrsyctnqoymytgb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_KoUbyZ1vZnpuvucWRYJVHQ_A1wG4vmY';

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

export async function updateCommentRow(id, patch) {
    const { data, error } = await supabase
        .from('qa_comments')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
    if (error) {
        console.error('[QA] updateComment failed', error);
        return null;
    }
    return data ? rowToComment(data) : null;
}

export async function deleteCommentRow(id) {
    const { error } = await supabase
        .from('qa_comments')
        .delete()
        .eq('id', id);
    if (error) {
        console.error('[QA] deleteComment failed', error);
        return false;
    }
    return true;
}
