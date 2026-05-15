// Phase 1: Starter imports and App Initialization

import * as dragDrop from './dragDrop.js';

class GameApp {
    constructor() {
        this.init();
    }

    init() {
        console.log("Arcade Game Initialized - Phase 1");
        dragDrop.initDragDrop();
    }
}

// Bootstrap the application
document.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new GameApp();
});
