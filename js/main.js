// Phase 1: Starter imports and App Initialization

import * as dragDrop from './dragDrop.js';

class GameApp {
    constructor() {
        this.init();
    }

    init() {
        console.log("Arcade Game Initialized - Phase 1");
        
        const playBtn = document.getElementById('play-btn');
        const screen0 = document.getElementById('screen-0');
        
        if (playBtn && screen0) {
            playBtn.addEventListener('click', () => {
                const startSound = new Audio('assets/sounds/start.mp3');
                startSound.play().catch(e => console.log('Audio play failed:', e));
                
                screen0.classList.add('hidden');
                
                // Initialize game logic (and inactivity timers) only after play is clicked
                dragDrop.initDragDrop();
            });
        } else {
            // Fallback if screen 0 is missing
            dragDrop.initDragDrop();
        }
    }
}

// Bootstrap the application
document.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new GameApp();
});
