// Phase 1: Starter imports and App Initialization

import * as dragDrop from './dragDrop.js';
import { playLevelIntro } from './level-intro.js';

const INITIAL_LEVEL = 1;
const INITIAL_TARGET = 12;

class GameApp {
    constructor() {
        this.init();
    }

    init() {
        console.log("Arcade Game Initialized - Phase 1");

        // Looping background music — kicked off inside the Play click handler
        // so it counts as a user gesture and the browser actually plays it.
        const bgMusic = new Audio('assets/sounds/BG_Music2.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.40;
        bgMusic.playbackRate = 0.85;

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
                playLevelIntro(INITIAL_LEVEL, INITIAL_TARGET);
            });
        } else {
            // Fallback if screen 0 is missing — go straight into the intro.
            playLevelIntro(INITIAL_LEVEL, INITIAL_TARGET);
        }
    }
}

// Bootstrap the application
document.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new GameApp();
});
