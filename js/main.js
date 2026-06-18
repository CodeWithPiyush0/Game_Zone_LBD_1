// Phase 1: Starter imports and App Initialization

import * as dragDrop from './dragDrop.js';
import { playLevelIntro } from './level-intro.js';

const INITIAL_LEVEL = 1;
const INITIAL_TARGET = 12;

// Re-trigger the gold-glow attention pop on the TARGET amount.
// Removes + re-adds the class with a reflow in between so the animation restarts.
function popTarget() {
    const el = document.querySelector('.target-amount');
    if (!el) return;
    el.classList.remove('attention-pop');
    void el.offsetWidth;
    el.classList.add('attention-pop');
}

class GameApp {
    constructor() {
        this.init();
    }

    init() {
        console.log("Arcade Game Initialized - Phase 1");

        // Looping background music — kicked off inside the Play click handler
        // so it counts as a user gesture and the browser actually plays it.
        const bgMusic = new Audio('assets/sounds/BG_Music4.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.40;
        bgMusic.playbackRate = 1.0;

        // Shared mute state. dragDrop.js reads this in its playSound() to
        // gate the SFX; bgMusic.muted is synced directly.
        window.gameMuted = false;

        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                window.gameMuted = !window.gameMuted;
                bgMusic.muted = window.gameMuted;
                muteBtn.classList.toggle('muted', window.gameMuted);
                muteBtn.setAttribute('aria-pressed', window.gameMuted ? 'true' : 'false');
            });
        }

        // One-shot, idempotent wrapper the cinematic intro invokes on completion.
        let gameStarted = false;
        window.startGame = () => {
            if (gameStarted) return;
            gameStarted = true;
            dragDrop.initDragDrop();
        };

        // Pause everything when the tab is hidden (switched away or browser
        // minimised). Resumes when it comes back. Music pauses in-place;
        // CSS animations across the whole page freeze via .game-paused.
        let bgWasPlayingBeforeHide = false;
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                bgWasPlayingBeforeHide = !bgMusic.paused;
                if (bgWasPlayingBeforeHide) bgMusic.pause();
                document.body.classList.add('game-paused');
            } else {
                document.body.classList.remove('game-paused');
                if (bgWasPlayingBeforeHide) {
                    bgMusic.play().catch(() => {});
                }
            }
        });

        const playBtn = document.getElementById('play-btn');
        const screen0 = document.getElementById('screen-0');

        if (playBtn && screen0) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!window.gameMuted) {
                    const startSound = new Audio('assets/sounds/start.mp3');
                    startSound.play().catch(err => console.log('Audio play failed:', err));
                }

                // Start BG music if it hasn't already (calling play() on an
                // already-playing element is a safe no-op). Its .muted property
                // is kept in sync by the mute toggle above.
                bgMusic.play().catch(err => console.log('BG music play failed:', err));

                screen0.classList.add('hidden');

                // Cinematic intro plays, then triggers window.startGame() at the end.
                playLevelIntro(INITIAL_LEVEL, INITIAL_TARGET).then(popTarget);
            });
        } else {
            // Fallback if screen 0 is missing — go straight into the intro.
            playLevelIntro(INITIAL_LEVEL, INITIAL_TARGET).then(popTarget);
        }
    }
}

// Bootstrap the application
document.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new GameApp();
});
