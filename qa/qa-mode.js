// QA Mode — Figma-style click-to-comment tool.
// Activated ONLY when the URL has ?qa=true. Otherwise this file does nothing.
// To remove: delete the /qa/ folder and the single <script> tag in index.html.

import {
    getCommentsForCurrentScreen,
    addComment,
    updateComment,
    deleteComment,
    findCommentById,
    getAuthor,
    setAuthor,
    refreshComments,
} from './qa-storage.js';
import { createPopupModule } from './qa-popup.js';
import { createSidebarModule } from './qa-sidebar.js';

function isQAActive() {
    return new URLSearchParams(location.search).get('qa') === 'true';
}

// Auto-detect which logical screen the player is currently viewing.
// All checks are best-effort against the game's existing DOM; if none match,
// the comment is tagged "Other".
function detectScreen() {
    if (document.querySelector('.level-intro-overlay')) return 'Cinematic Intro';

    const transOverlay = document.getElementById('level-transition-overlay');
    if (transOverlay && !transOverlay.classList.contains('hidden')) {
        const title = document.getElementById('transition-title');
        if (title && /all\s*levels/i.test(title.textContent || '')) return 'All Levels Done';
        return 'Level Transition';
    }

    const screen0 = document.getElementById('screen-0');
    if (screen0 && !screen0.classList.contains('hidden')) return 'Pre-LBD';

    const target = document.querySelector('.target-amount');
    if (target) {
        const t = (target.textContent || '').trim();
        if (t === '₹12')  return 'Level 1';
        if (t === '₹25')  return 'Level 2';
        if (t === '₹50')  return 'Level 3';
        if (t === '₹100') return 'Level 4';
    }
    return 'Other';
}

// Best-effort CSS selector — display purpose only, not used to resolve elements.
function bestSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    if (el.id) return `#${el.id}`;
    if (el.classList && el.classList.length) {
        const classes = Array.from(el.classList)
            .filter(c => !c.startsWith('qa-') && c !== 'qa-hovered')
            .slice(0, 2);
        if (classes.length) return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
    }
    return el.tagName.toLowerCase();
}

function injectStylesheet() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'qa/qa-mode.css';
    document.head.appendChild(link);
}

// Centered modal that collects the QA tester's name. Returns a Promise that
// resolves with the entered name (string), or null if cancelled (rename mode only).
function showNameModal({ initialName = '', isRename = false } = {}) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'qa-name-modal';
        modal.innerHTML = `
            <div class="qa-name-modal__card" role="dialog" aria-modal="true">
                <h3 class="qa-name-modal__title"></h3>
                <p class="qa-name-modal__sub"></p>
                <input class="qa-name-modal__input" type="text" placeholder="e.g. Piyush" maxlength="40" />
                <div class="qa-name-modal__actions">
                    ${isRename ? '<button class="qa-name-modal__btn qa-name-modal__btn--cancel" type="button">Cancel</button>' : ''}
                    <button class="qa-name-modal__btn qa-name-modal__btn--ok" type="button"></button>
                </div>
            </div>
        `;
        modal.querySelector('.qa-name-modal__title').textContent =
            isRename ? 'Change Name' : 'Welcome, QA Tester';
        modal.querySelector('.qa-name-modal__sub').textContent =
            isRename
                ? 'Update your name. Existing comments keep their old author.'
                : 'Enter your name so each comment is tagged with who wrote it.';
        modal.querySelector('.qa-name-modal__btn--ok').textContent =
            isRename ? 'Save' : 'Start';

        document.body.appendChild(modal);

        const input    = modal.querySelector('.qa-name-modal__input');
        const okBtn    = modal.querySelector('.qa-name-modal__btn--ok');
        const cancelBtn = modal.querySelector('.qa-name-modal__btn--cancel');

        input.value = initialName;

        function submit() {
            const name = input.value.trim();
            if (!name) {
                input.classList.add('qa-name-modal__input--err');
                input.focus();
                return;
            }
            modal.remove();
            resolve(name);
        }
        function cancel() {
            modal.remove();
            resolve(null);
        }

        okBtn.addEventListener('click', submit);
        if (cancelBtn) cancelBtn.addEventListener('click', cancel);

        input.addEventListener('input', () => input.classList.remove('qa-name-modal__input--err'));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape' && isRename) cancel();
        });

        // Focus + select after the paint so the input is ready for typing.
        setTimeout(() => { input.focus(); input.select(); }, 50);
    });
}

async function init() {
    if (!isQAActive()) return;

    injectStylesheet();
    document.body.setAttribute('data-qa', 'true');

    // ── UI containers ───────────────────────────────────────────────
    const pinsContainer = document.createElement('div');
    pinsContainer.className = 'qa-pins';
    document.body.appendChild(pinsContainer);

    let popup;    // initialised below
    let sidebar;  // initialised below
    let lastHovered = null;
    let currentScreen = detectScreen();
    let frozenIntroRef = null; // the .level-intro-overlay we're holding still
    // OFF by default — game plays normally. Turn ON via the sidebar's
    // "+ Comment" button to start intercepting clicks.
    let interceptEnabled = false;

    function freezeOverlay(el) {
        if (!el || el === frozenIntroRef) return;
        frozenIntroRef = el;
        el.classList.add('qa-intro-frozen');
    }

    function clearFrozenOverlay() {
        if (!frozenIntroRef) return;
        frozenIntroRef.classList.remove('qa-intro-frozen');
        if (frozenIntroRef.parentElement) {
            frozenIntroRef.parentElement.removeChild(frozenIntroRef);
        }
        frozenIntroRef = null;
    }

    // Watches body for the cinematic intro overlay being added or removed.
    // While in comment mode: freeze any new intro, and re-attach the frozen
    // one if level-intro.js's 3.7s cleanup tries to take it away.
    const introObserver = new MutationObserver((mutations) => {
        if (!interceptEnabled) return;
        for (const m of mutations) {
            m.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                if (node.classList && node.classList.contains('level-intro-overlay')) {
                    freezeOverlay(node);
                }
            });
            m.removedNodes.forEach((node) => {
                if (node === frozenIntroRef) {
                    document.body.appendChild(frozenIntroRef);
                }
            });
        }
    });
    introObserver.observe(document.body, { childList: true });

    function setInterceptEnabled(on) {
        interceptEnabled = on;
        document.body.classList.toggle('qa-intercept-on', on);

        if (on) {
            // If an intro is already on screen when QA enters comment mode,
            // freeze it right away (the observer above will catch later ones).
            const existing = document.querySelector('.level-intro-overlay');
            if (existing) freezeOverlay(existing);
        } else {
            // Drop the frozen overlay so gameplay underneath becomes visible again.
            clearFrozenOverlay();
        }

        if (!on && lastHovered) {
            lastHovered.classList.remove('qa-hovered');
            lastHovered = null;
        }
        if (!on) popup.close();
    }

    function isQAUI(el) {
        if (!el) return false;
        if (popup && popup.isInside(el)) return true;
        if (sidebar && sidebar.isInside(el)) return true;
        if (pinsContainer.contains(el)) return true;
        if (el.closest && el.closest('.qa-name-modal')) return true;
        return false;
    }

    // ── Pins ────────────────────────────────────────────────────────
    function renderPins() {
        pinsContainer.innerHTML = '';
        getCommentsForCurrentScreen(currentScreen).forEach((c, idx) => {
            const pin = document.createElement('button');
            pin.className = 'qa-pin';
            pin.type = 'button';
            pin.dataset.id = c.id;
            pin.style.left = c.x + 'px';
            pin.style.top  = c.y + 'px';
            pin.textContent = String(idx + 1);
            pin.title = c.text;
            pin.addEventListener('click', (e) => {
                e.stopPropagation();
                popup.open({
                    x: c.x,
                    y: c.y,
                    selector: c.selector,
                    existingText: c.text,
                    editId: c.id,
                });
            });
            pinsContainer.appendChild(pin);
        });
    }

    function flashPin(id) {
        const pin = pinsContainer.querySelector(`.qa-pin[data-id="${id}"]`);
        if (!pin) return;
        pin.classList.remove('qa-pin--focus');
        void pin.offsetWidth;
        pin.classList.add('qa-pin--focus');
    }

    // ── Wire popup + sidebar ────────────────────────────────────────
    popup = createPopupModule({
        onSave: async ({ selector, x, y, text, editId }) => {
            if (editId) {
                await updateComment(editId, { text });
            } else {
                // Tag the new comment with whichever screen is detected right now.
                await addComment({ selector, x, y, text, screen: currentScreen });
            }
            renderPins();
            sidebar.render(currentScreen);
        },
    });

    sidebar = createSidebarModule({
        onItemClick: (id) => {
            const c = findCommentById(id);
            if (!c) return;
            flashPin(id);
            popup.open({
                x: c.x,
                y: c.y,
                selector: c.selector,
                existingText: c.text,
                editId: c.id,
            });
        },
        onDelete: async (id) => {
            await deleteComment(id);
            renderPins();
            sidebar.render(currentScreen);
            popup.close();
        },
        onInspectToggle: setInterceptEnabled,
        onRenameAuthor: async () => {
            const newName = await showNameModal({ initialName: getAuthor(), isRename: true });
            if (newName) {
                setAuthor(newName);
                sidebar.setAuthor(newName);
            }
        },
    });

    // Pull the current set of comments from Supabase before first render.
    // If the network call fails the wrappers log + return [] so the UI still loads.
    await refreshComments();

    renderPins();
    sidebar.render(currentScreen);
    sidebar.setAuthor(getAuthor() || '—');

    // First-time tester: collect their name so every new comment is tagged.
    if (!getAuthor()) {
        showNameModal().then((name) => {
            setAuthor(name);
            sidebar.setAuthor(name);
        });
    }

    // Background sync — pick up comments posted by other reviewers without
    // requiring a page reload. 10s is plenty for a QA workflow; cheap because
    // it's a single SELECT scoped to this page.
    setInterval(async () => {
        await refreshComments();
        renderPins();
        sidebar.render(currentScreen);
    }, 10000);

    // Poll the DOM for screen changes (cheap; runs only while QA is active).
    // When the player advances a level or the cinematic intro shows/hides,
    // re-render pins + sidebar to match the new context.
    setInterval(() => {
        const detected = detectScreen();
        if (detected !== currentScreen) {
            currentScreen = detected;
            renderPins();
            sidebar.render(currentScreen);
        }
    }, 500);

    // ── Event interception (capture phase on document) ──────────────
    // Anything not inside QA UI gets its propagation stopped so game
    // handlers never see it. Drag-initiating events also get preventDefault
    // so native drag never starts.
    const BLOCKED = [
        'mousedown', 'mouseup', 'mousemove',
        'touchstart', 'touchmove', 'touchend',
        'dragstart', 'click',
    ];
    const DRAG_INITIATORS = new Set(['mousedown', 'touchstart', 'dragstart']);

    BLOCKED.forEach((evt) => {
        document.addEventListener(evt, (e) => {
            if (!interceptEnabled) return;        // play mode: let the game handle it
            if (isQAUI(e.target)) return;         // QA UI handles itself

            e.stopPropagation();
            if (DRAG_INITIATORS.has(evt)) e.preventDefault();

            if (evt === 'click') {
                popup.open({
                    x: e.clientX,
                    y: e.clientY,
                    selector: bestSelector(e.target),
                });
            }
        }, { capture: true, passive: false }); // capture + active so preventDefault works on touch events
    });

    // Hover highlight — only while in comment mode.
    document.addEventListener('mouseover', (e) => {
        if (!interceptEnabled) return;
        if (isQAUI(e.target)) return;
        if (lastHovered) lastHovered.classList.remove('qa-hovered');
        lastHovered = e.target;
        if (lastHovered && lastHovered !== document.body && lastHovered !== document.documentElement) {
            lastHovered.classList.add('qa-hovered');
        }
    }, true);

    document.addEventListener('mouseout', (e) => {
        if (e.target && e.target.classList) {
            e.target.classList.remove('qa-hovered');
        }
        if (lastHovered === e.target) lastHovered = null;
    }, true);

    // ESC closes the popup.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') popup.close();
    });

    // Surface a tiny diagnostic for QA testers.
    console.info('[QA] Mode active. Play normally; press "+ Comment" in the sidebar to drop pins.');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
