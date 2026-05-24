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
                const startSound = new Audio('assets/sounds/start.mp3');
                startSound.play().catch(err => console.log('Audio play failed:', err));

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
