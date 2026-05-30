// QA comment popup — factory that returns { open, close, isInside }.
// open() handles both new-comment and edit-existing modes via editId.

const POPUP_W = 280;
const POPUP_H = 180;

export function createPopupModule({ onSave }) {
    let popupEl = null;
    let editingId = null;

    function close() {
        if (popupEl && popupEl.parentElement) {
            popupEl.parentElement.removeChild(popupEl);
        }
        popupEl = null;
        editingId = null;
    }

    function open({ x, y, selector, existingText, editId }) {
        close();

        popupEl = document.createElement('div');
        popupEl.className = 'qa-popup';
        popupEl.innerHTML = `
            <div class="qa-popup__label">Comment on: <code></code></div>
            <textarea class="qa-popup__text" placeholder="Type your comment..."></textarea>
            <div class="qa-popup__actions">
                <button class="qa-btn qa-btn--cancel" type="button">Cancel</button>
                <button class="qa-btn qa-btn--save"   type="button">Save</button>
            </div>
        `;
        popupEl.querySelector('code').textContent = selector || '(unknown)';

        // Position near click, flipped if it would overflow the viewport.
        let px = x + 12;
        let py = y + 12;
        if (px + POPUP_W > window.innerWidth  - 8) px = x - POPUP_W - 12;
        if (py + POPUP_H > window.innerHeight - 8) py = y - POPUP_H - 12;
        if (px < 8) px = 8;
        if (py < 8) py = 8;
        popupEl.style.left = px + 'px';
        popupEl.style.top  = py + 'px';

        document.body.appendChild(popupEl);

        const ta = popupEl.querySelector('.qa-popup__text');
        if (existingText) ta.value = existingText;
        editingId = editId || null;

        popupEl.querySelector('.qa-btn--cancel').addEventListener('click', close);
        popupEl.querySelector('.qa-btn--save').addEventListener('click', () => {
            const text = ta.value.trim();
            if (!text) { close(); return; }
            onSave({ selector, x, y, text, editId: editingId });
            close();
        });

        // Cmd/Ctrl+Enter to save
        ta.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                const text = ta.value.trim();
                if (text) {
                    onSave({ selector, x, y, text, editId: editingId });
                    close();
                }
            }
        });

        ta.focus();
    }

    function isInside(el) {
        return !!(popupEl && el && popupEl.contains(el));
    }

    return { open, close, isInside };
}
