// QA sidebar — collapsible list of comments for the current screen.
// Hosts: comment-mode toggle, per-item view/delete, footer with identity + role-switch.

import { getCommentsForCurrentScreen, canEditComment } from './qa-storage.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(ts) {
    const d = new Date(ts);
    const pad = n => n < 10 ? '0' + n : '' + n;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ROLE_LABEL = { owner: 'Owner', qa: 'QA', other: 'Other' };

export function createSidebarModule({ onItemClick, onDelete, onInspectToggle, onSwitchRole }) {
    let sidebarEl = null;
    let collapsed = false;
    let inspectOn = false;

    function build() {
        sidebarEl = document.createElement('div');
        sidebarEl.className = 'qa-sidebar';
        sidebarEl.innerHTML = `
            <div class="qa-sidebar__header">
                <span class="qa-sidebar__title">QA <span class="qa-sidebar__screen">—</span></span>
                <div class="qa-sidebar__actions">
                    <button class="qa-sidebar__inspect" type="button" aria-pressed="false" title="Toggle comment mode">+ Comment</button>
                    <button class="qa-sidebar__toggle"  type="button" aria-label="Collapse">−</button>
                </div>
            </div>
            <div class="qa-sidebar__hint">Press "+ Comment", then click any element. Toggle off to keep playing.</div>
            <ul class="qa-sidebar__list"></ul>
            <div class="qa-sidebar__empty">No comments on this screen yet.</div>
            <div class="qa-sidebar__footer">
                <span class="qa-sidebar__footer-label">Tester:</span>
                <strong class="qa-sidebar__author">—</strong>
                <span class="qa-sidebar__role-tag" hidden>—</span>
                <button class="qa-sidebar__rename" type="button" title="Switch role" aria-label="Switch role">↺</button>
            </div>
        `;
        document.body.appendChild(sidebarEl);

        sidebarEl.querySelector('.qa-sidebar__toggle').addEventListener('click', () => {
            collapsed = !collapsed;
            sidebarEl.classList.toggle('qa-sidebar--collapsed', collapsed);
            sidebarEl.querySelector('.qa-sidebar__toggle').textContent = collapsed ? '+' : '−';
        });

        const inspectBtn = sidebarEl.querySelector('.qa-sidebar__inspect');
        inspectBtn.addEventListener('click', () => {
            inspectOn = !inspectOn;
            inspectBtn.setAttribute('aria-pressed', String(inspectOn));
            inspectBtn.textContent = inspectOn ? '✕ Stop' : '+ Comment';
            sidebarEl.classList.toggle('qa-sidebar--inspecting', inspectOn);
            if (typeof onInspectToggle === 'function') onInspectToggle(inspectOn);
        });

        sidebarEl.querySelector('.qa-sidebar__rename').addEventListener('click', () => {
            if (typeof onSwitchRole === 'function') onSwitchRole();
        });
    }

    function setIdentity({ name, role } = {}) {
        if (!sidebarEl) build();
        const nameEl = sidebarEl.querySelector('.qa-sidebar__author');
        const roleEl = sidebarEl.querySelector('.qa-sidebar__role-tag');
        if (nameEl) nameEl.textContent = name || '—';
        if (roleEl) {
            const label = ROLE_LABEL[role];
            if (label) {
                roleEl.textContent = label;
                roleEl.hidden = false;
                roleEl.classList.remove('qa-role-tag--owner', 'qa-role-tag--qa', 'qa-role-tag--other');
                roleEl.classList.add(`qa-role-tag--${role}`);
            } else {
                roleEl.hidden = true;
            }
        }
    }

    function render(screen) {
        if (!sidebarEl) build();

        const screenEl = sidebarEl.querySelector('.qa-sidebar__screen');
        if (screenEl) screenEl.textContent = screen || '—';

        const list  = sidebarEl.querySelector('.qa-sidebar__list');
        const empty = sidebarEl.querySelector('.qa-sidebar__empty');
        const items = screen ? getCommentsForCurrentScreen(screen) : [];

        list.innerHTML = '';
        empty.style.display = items.length ? 'none' : 'block';

        items.forEach((c, idx) => {
            const editable = canEditComment(c);
            const li = document.createElement('li');
            li.className = 'qa-sidebar__item';
            li.dataset.id = c.id;
            li.innerHTML = `
                <div class="qa-sidebar__row">
                    <span class="qa-sidebar__num">${idx + 1}</span>
                    ${editable ? '<button class="qa-sidebar__del" type="button" title="Delete">×</button>' : ''}
                </div>
                <div class="qa-sidebar__text"></div>
                <div class="qa-sidebar__meta"></div>
            `;
            li.querySelector('.qa-sidebar__text').textContent = c.text;
            li.querySelector('.qa-sidebar__meta').textContent =
                `${c.author || 'Unknown'} · ${fmtDate(c.createdAt)}`;

            const delBtn = li.querySelector('.qa-sidebar__del');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                });
            }
            li.addEventListener('click', () => onItemClick(c.id));

            list.appendChild(li);
        });
    }

    function isInside(el) {
        return !!(sidebarEl && el && sidebarEl.contains(el));
    }

    function destroy() {
        if (sidebarEl) sidebarEl.remove();
        sidebarEl = null;
    }

    return { render, isInside, destroy, setIdentity };
}
