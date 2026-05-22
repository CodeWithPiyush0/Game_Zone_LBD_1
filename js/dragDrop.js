import { triggerSuccessAnimation } from './ticketBurst.js';

export function initDragDrop() {
    const moneyItems = document.querySelectorAll('.money-item');
    const dropzoneArea = document.getElementById('dropzone');
    const dropzoneBg = document.getElementById('dropzone-bg');
    const dropzoneContainer = document.querySelector('.dropzone-container');
    const moneyTray = document.querySelector('.money-tray');
    const checkBtn = document.getElementById('check-btn');
    const questionContent = document.querySelector('.question-content');
    const confetti = document.getElementById('confetti');
    const dropzoneText = document.getElementById('dropzone-text');
    
    const sounds = {
        drop: new Audio('assets/sounds/drop.mp3'),
        note: new Audio('assets/sounds/note.mp3'),
        click: new Audio('assets/sounds/click.mp3'),
        error: new Audio('assets/sounds/error3.mp3'),
        success: new Audio('assets/sounds/success1.mp3') // Used success1.mp3 based on folder contents
    };

    function playSound(name) {
        if (sounds[name]) {
            sounds[name].currentTime = 0;
            sounds[name].play().catch(e => console.log('Audio error:', e));
        }
    }
    
    let currentLevel = 1;
    let targetAmount = 12;
    let requiredItemValue = '2';
    let requiredCount = 6;
    let questionHTML = '<p>Use <span class="highlight">₹2</span> to make <span class="highlight">₹12</span>.</p>';

    function loadLevel(level) {
        currentLevel = level;
        const dynamicNote = document.getElementById('dynamic-note');
        
        if (level === 1) {
            targetAmount = 12;
            requiredItemValue = '2';
            requiredCount = 6;
            questionHTML = '<p>Use <span class="highlight">₹2</span> to make <span class="highlight">₹12</span>.</p>';
            document.querySelector('.target-amount').textContent = '₹12';
        } else if (level === 2) {
            targetAmount = 25;
            requiredItemValue = '5';
            requiredCount = 5;
            questionHTML = '<p>Use <span class="highlight">₹5</span> to make <span class="highlight">₹25</span>.</p>';
            document.querySelector('.target-amount').textContent = '₹25';
        } else if (level === 3) {
            targetAmount = 50;
            requiredItemValue = '10';
            requiredCount = 5;
            questionHTML = '<p>Use <span class="highlight">₹10</span> to make <span class="highlight">₹50</span>.</p>';
            document.querySelector('.target-amount').textContent = '₹50';
        } else if (level === 4) {
            targetAmount = 100;
            requiredItemValue = '50';
            requiredCount = 2;
            questionHTML = '<p>Use <span class="highlight">₹50</span> to make <span class="highlight">₹100</span>.</p>';
            document.querySelector('.target-amount').textContent = '₹100';
        }
        
        // Dynamically swap the second note
        if (level === 4) {
            dynamicNote.setAttribute('data-value', '50');
            dynamicNote.querySelector('img').src = 'assets/images/Money/Fifty_Rupee_Note_Default.png';
            dynamicNote.querySelector('img').alt = '₹50 Note';
        } else {
            dynamicNote.setAttribute('data-value', '20');
            dynamicNote.querySelector('img').src = 'assets/images/Money/Twenty_Rupee_Note_Default.png';
            dynamicNote.querySelector('img').alt = '₹20 Note';
        }
        
        questionContent.innerHTML = questionHTML;
        resetGame(true); // soft reset
    }
    
    // --- Ghost Coin Hint Logic ---
    // Level 1 plays a 3x ghost-coin tutorial 5s after the level becomes playable.
    // Across all levels, 10s of user inactivity replays the ghost animation.
    // A drag attempt cancels the pending tutorial and resets the idle clock.
    const TUTORIAL_START_DELAY = 5000;
    const TUTORIAL_REPEATS = 3;
    const TUTORIAL_INTERVAL = 2800;
    const IDLE_THRESHOLD = 10000;
    const GHOST_ANIM_DURATION = 2400;
    const transitionOverlayEl = document.getElementById('level-transition-overlay');

    let ghostHintActive = false;
    let tutorialPlayed = false;
    let tutorialTimers = [];
    let idleTimer = null;
    let userDragged = false;
    let activeGhostEl = null;
    let activeGhostFromIdle = false;
    let activeGhostTimeout = null;

    function playGhostCoinAnimation(fromIdle = false) {
        if (ghostHintActive) return;
        if (dropzoneBg.classList.contains('success-glow')) return;
        if (dropzoneContainer.classList.contains('shake')) return;

        // Always use the ₹1 coin so the hint teaches the drag motion
        // without revealing which denomination is the correct answer.
        const sourceCoin = document.querySelector('.money-item[data-value="1"]:not(.dropped-coin)');
        if (!sourceCoin) return;

        ghostHintActive = true;
        const ghost = document.createElement('img');
        ghost.src = sourceCoin.querySelector('img').src;
        ghost.className = 'ghost-coin-tutorial';

        const rect = sourceCoin.getBoundingClientRect();
        const gameContainer = document.querySelector('.game-container').getBoundingClientRect();
        const dropzoneRect = document.querySelector('.dropzone-container').getBoundingClientRect();

        const startX = ((rect.left - gameContainer.left) / gameContainer.width) * 100;
        const startY = ((rect.top - gameContainer.top) / gameContainer.height) * 100;

        const tx = (dropzoneRect.left + dropzoneRect.width / 2) - (rect.left + rect.width / 2);
        const ty = (dropzoneRect.top + dropzoneRect.height / 2) - (rect.top + rect.height / 2);

        ghost.style.left = `${startX + 1}%`;
        ghost.style.top = `${startY + 2}%`;
        ghost.style.setProperty('--nudge-tx', `${tx}px`);
        ghost.style.setProperty('--nudge-ty', `${ty}px`);

        document.querySelector('.game-container').appendChild(ghost);

        activeGhostEl = ghost;
        activeGhostFromIdle = fromIdle;
        activeGhostTimeout = setTimeout(() => {
            if (ghost.parentElement) ghost.remove();
            ghostHintActive = false;
            if (activeGhostEl === ghost) {
                activeGhostEl = null;
                activeGhostFromIdle = false;
                activeGhostTimeout = null;
            }
        }, GHOST_ANIM_DURATION);
    }

    function stopActiveGhost() {
        if (!activeGhostEl) return;
        clearTimeout(activeGhostTimeout);
        if (activeGhostEl.parentElement) activeGhostEl.remove();
        activeGhostEl = null;
        activeGhostFromIdle = false;
        activeGhostTimeout = null;
        ghostHintActive = false;
    }

    function cancelTutorialTimers() {
        tutorialTimers.forEach(clearTimeout);
        tutorialTimers = [];
    }

    function startLevel1Tutorial() {
        if (tutorialPlayed || userDragged) return;
        tutorialPlayed = true;

        for (let i = 0; i < TUTORIAL_REPEATS; i++) {
            const delay = TUTORIAL_START_DELAY + i * TUTORIAL_INTERVAL;
            const timer = setTimeout(() => {
                if (userDragged) {
                    cancelTutorialTimers();
                    return;
                }
                playGhostCoinAnimation();
                resetIdleTimer();
            }, delay);
            tutorialTimers.push(timer);
        }
    }

    function tryShowIdleHint() {
        const transitionVisible = !transitionOverlayEl.classList.contains('hidden');
        if (transitionVisible ||
            dropzoneBg.classList.contains('success-glow') ||
            dropzoneContainer.classList.contains('shake')) {
            idleTimer = setTimeout(tryShowIdleHint, 1000);
            return;
        }
        if (ghostHintActive) {
            idleTimer = setTimeout(tryShowIdleHint, 500);
            return;
        }
        playGhostCoinAnimation(true);
        // Once the 10s threshold trips, the hint loops back-to-back at the
        // animation cadence. Any user activity calls resetIdleTimer which
        // clears this and restarts the 10s wait from scratch.
        idleTimer = setTimeout(tryShowIdleHint, TUTORIAL_INTERVAL);
    }

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(tryShowIdleHint, IDLE_THRESHOLD);
    }

    function onUserDragAttempt() {
        // A real drag means the user knows what to do — kill anything in flight,
        // including a tutorial ghost mid-animation.
        userDragged = true;
        cancelTutorialTimers();
        stopActiveGhost();
        resetIdleTimer();
    }

    function onUserActivity() {
        // Generic input (mouse move, touch, click) cancels the idle ghost loop
        // but lets a tutorial ghost finish its animation.
        if (activeGhostFromIdle) stopActiveGhost();
        resetIdleTimer();
    }

    ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'click'].forEach(evt => {
        window.addEventListener(evt, onUserActivity, { passive: true });
    });
    // ------------------------------
    
    let draggedItemValue = null;
    let draggedItemOrigin = null;
    let draggedItemType = null;
    let draggedItemSrc = null;
    
    moneyItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        
        // Touch events
        item.addEventListener('touchstart', handleTouchStart, {passive: false});
        item.addEventListener('touchmove', handleTouchMove, {passive: false});
        item.addEventListener('touchend', handleTouchEnd);
        item.addEventListener('touchcancel', handleTouchEnd);
    });

    function handleDragStart(e) {
        onUserDragAttempt();
        const item = e.currentTarget;
        draggedItemValue = item.getAttribute('data-value');
        draggedItemType = item.classList.contains('note') ? 'note' : 'coin';
        
        if (item.classList.contains('dropped-coin')) {
            draggedItemOrigin = item;
        } else {
            draggedItemOrigin = null; // Came from tray
        }
        
        const img = item.querySelector('img');
        const originalSrc = img.src;
        draggedItemSrc = originalSrc;
        if (!item.classList.contains('dropped-coin')) {
            img.setAttribute('data-original', originalSrc);
            img.src = originalSrc.replace('_Default', '_Glow');
        }
        
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = item.classList.contains('dropped-coin') ? 'move' : 'copy';
            e.dataTransfer.setData('text/plain', draggedItemValue);
        }
    }

    function handleDragEnd(e) {
        const item = e.currentTarget;
        const img = item.querySelector('img');
        if (img && img.getAttribute('data-original')) {
            img.src = img.getAttribute('data-original');
        }
        if (item.classList.contains('dropped-coin')) {
            draggedItemOrigin = null;
        }
        updateDropzoneBackground();
    }

    // --- Touch Logic ---
    let touchClone = null;
    let touchOffsetX = 0;
    let touchOffsetY = 0;

    function handleTouchStart(e) {
        if (e.targetTouches.length !== 1) return;
        const item = e.currentTarget;
        
        const touch = e.targetTouches[0];
        const rect = item.getBoundingClientRect();
        
        touchOffsetX = touch.clientX - rect.left;
        touchOffsetY = touch.clientY - rect.top;
        
        handleDragStart(e);
        
        touchClone = item.cloneNode(true);
        touchClone.style.position = 'fixed';
        touchClone.style.left = `${rect.left}px`;
        touchClone.style.top = `${rect.top}px`;
        touchClone.style.width = `${rect.width}px`;
        touchClone.style.height = `${rect.height}px`;
        touchClone.style.opacity = '0.8';
        touchClone.style.pointerEvents = 'none';
        touchClone.style.zIndex = '9999';
        
        document.body.appendChild(touchClone);
        
        if (droppedCoinsCount === 0 && !draggedItemOrigin) {
            dropzoneBg.classList.add('is-glow');
        }
        
        // Prevent default only after we setup the clone, to prevent scrolling while dragging
        e.preventDefault();
    }

    function handleTouchMove(e) {
        if (!touchClone) return;
        e.preventDefault(); // Stop scrolling
        const touch = e.targetTouches[0];
        touchClone.style.left = `${touch.clientX - touchOffsetX}px`;
        touchClone.style.top = `${touch.clientY - touchOffsetY}px`;
    }

    function handleTouchEnd(e) {
        if (!touchClone) return;
        const item = e.currentTarget;
        const touch = e.changedTouches[0];
        
        touchClone.remove();
        touchClone = null;
        
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        const isDropzone = dropTarget && (dropTarget.closest('.dropzone-container') || dropTarget.id === 'dropzone');
        const isTray = dropTarget && dropTarget.closest('.money-tray');
        
        if (isDropzone) {
            handleDropInDropzone();
        } else if (isTray) {
            handleDropInTray();
        }
        
        // Fire handleDragEnd AFTER drop logic to simulate correct HTML5 drag lifecycle
        // This ensures draggedItemOrigin is not nullified before handleDropInDropzone needs it
        handleDragEnd(e);
        
        updateDropzoneBackground();
    }
    
    function updateDropzoneBackground() {
        if (dropzoneContainer.classList.contains('shake')) return; // Don't override error state
        if (dropzoneContainer.classList.contains('success-pop')) return; // Don't override success animation
        
        // Remove specialized glows
        dropzoneBg.classList.remove('success-glow', 'error-glow');
        
        if (droppedCoinsCount > 0) {
            checkBtn.classList.remove('hidden');
            dropzoneText.classList.add('hidden'); // Hide text when items are inside
        } else {
            checkBtn.classList.add('hidden');
            questionContent.innerHTML = questionHTML;
            dropzoneText.classList.remove('hidden'); // Show text when empty
        }

        if (droppedCoinsCount === 0) {
            dropzoneBg.classList.remove('is-glow');
        } else {
            dropzoneBg.classList.add('is-glow');
        }
    }

    dropzoneContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (droppedCoinsCount === 0 && !draggedItemOrigin) {
            dropzoneBg.classList.add('is-glow');
        }
    });
    
    dropzoneContainer.addEventListener('dragleave', (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        updateDropzoneBackground();
    });
    
    let droppedCoinsCount = 0;
    
    dropzoneContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        handleDropInDropzone();
    });

    function handleDropInDropzone() {
        if (draggedItemOrigin) {
            // Dragged within dropzone, do nothing
            return;
        }

        if (draggedItemValue === requiredItemValue) {
            // Success dropping required item
            
            // Play the material drop sound
            if (draggedItemType === 'note') {
                playSound('note');
            } else {
                playSound('drop');
            }
            
            droppedCoinsCount++;
            questionContent.innerHTML = questionHTML; // Reset any previous error text
            updateDropzoneBackground();
            
            const newCoin = document.createElement('div');
            newCoin.className = `dropped-coin ${draggedItemType === 'note' ? 'note' : 'coin'}`;
            newCoin.draggable = true;
            newCoin.setAttribute('data-value', draggedItemValue); // Required for dragging back
            
            // Add mouse drag events for returning to tray
            newCoin.addEventListener('dragstart', handleDragStart);
            newCoin.addEventListener('dragend', handleDragEnd);
            
            // Add touch events for returning to tray
            newCoin.addEventListener('touchstart', handleTouchStart, {passive: false});
            newCoin.addEventListener('touchmove', handleTouchMove, {passive: false});
            newCoin.addEventListener('touchend', handleTouchEnd);
            newCoin.addEventListener('touchcancel', handleTouchEnd);
            
            const coinImg = document.createElement('img');
            // If the src contains _Glow from the tray, use _Default for the dropped version
            coinImg.src = draggedItemSrc ? draggedItemSrc.replace('_Glow', '_Default') : '';
            newCoin.appendChild(coinImg);
            
            dropzoneArea.appendChild(newCoin);
            updateDropzoneLayout(droppedCoinsCount);
        } else {
            // Incorrect
            playSound('error');
            triggerErrorState();
        }
    }
    
    // Allow dropping back to tray
    moneyTray.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    
    moneyTray.addEventListener('drop', (e) => {
        e.preventDefault();
        handleDropInTray();
    });

    function handleDropInTray() {
        if (draggedItemOrigin) {
            if (draggedItemType === 'note') {
                playSound('note');
            } else {
                playSound('drop');
            }
            draggedItemOrigin.remove();
            droppedCoinsCount--;
            updateDropzoneLayout(droppedCoinsCount);
            draggedItemOrigin = null;
            updateDropzoneBackground();
        }
    }
    
    function updateDropzoneLayout(count) {
        dropzoneArea.className = 'dropzone-area'; // reset
        
        if (count === 1) {
            dropzoneArea.classList.add('layout-1');
        } else if (count === 2) {
            dropzoneArea.classList.add('layout-2');
        } else if (count >= 3) {
            dropzoneArea.classList.add('layout-3');
        }
    }

    // Check button logic
    checkBtn.addEventListener('click', () => {
        resetIdleTimer();

        if (droppedCoinsCount < requiredCount) {
            // Failure: Less coin
            playSound('error');
            questionContent.innerHTML = '<p style="color: #FFD600;">Too few coins! Add more.</p>';
            triggerErrorState();
        } else if (droppedCoinsCount > requiredCount) {
            // Failure: More coin
            playSound('error');
            questionContent.innerHTML = '<p style="color: #FFD600;">Too many coins! Remove some.</p>';
            triggerErrorState();
        } else if (droppedCoinsCount === requiredCount) {
            // Success!
            playSound('success');
            questionContent.innerHTML = '<p>Yay! You have won the <span class="highlight">tickets!</span></p>';
            
            // Apply success CSS glow instead of changing src
            dropzoneBg.classList.remove('is-glow', 'error-glow');
            dropzoneBg.classList.add('success-glow');
            
            triggerSuccessAnimation();
            checkBtn.classList.add('hidden');
            
            // Load next level smoothly 3 seconds after celebration
            setTimeout(() => {
                let nextLevel = currentLevel + 1;
                
                const overlay = document.getElementById('level-transition-overlay');
                const title = document.getElementById('transition-title');
                const subtitle = document.getElementById('transition-subtitle');
                const uiLayer = document.querySelector('.ui-layer');
                const screen0 = document.getElementById('screen-0');
                const playBtnImg = document.querySelector('#play-btn img');
                
                uiLayer.classList.add('level-fade');
                
                setTimeout(() => {
                    if (nextLevel > 4) {
                        // All Levels Completed state
                        title.textContent = `ALL LEVELS COMPLETED!`;
                        subtitle.textContent = ``;
                        overlay.classList.remove('hidden');
                        
                        setTimeout(() => {
                            overlay.classList.add('hidden');
                            uiLayer.classList.remove('level-fade');

                            // Show start screen again with updated play button
                            if (screen0 && playBtnImg) {
                                screen0.classList.remove('hidden');
                                playBtnImg.src = 'assets/images/Play_again_BTN.svg';
                            }

                            // Reset back to level 1 for the next play
                            loadLevel(1);
                            clearTimeout(idleTimer);
                        }, 3000); // 3 seconds to show completion text
                        return; // End execution
                    }
                    
                    // Normal Level Transition
                    let nextTargetAmount = 12;
                    if (nextLevel === 2) nextTargetAmount = 25;
                    if (nextLevel === 3) nextTargetAmount = 50;
                    if (nextLevel === 4) nextTargetAmount = 100;

                    title.textContent = `LEVEL ${nextLevel}`;
                    subtitle.textContent = `Make ₹${nextTargetAmount}`;
                    overlay.classList.remove('hidden');
                    
                    loadLevel(nextLevel);

                    setTimeout(() => {
                        overlay.classList.add('hidden');
                        uiLayer.classList.remove('level-fade');
                        resetIdleTimer();
                    }, 2500); // Keep overlay up for 2.5 seconds
                }, 500); // Wait 500ms for UI to fade out before showing overlay
            }, 3000);
        }
    });

    function resetGame(soft = false) {
        droppedCoinsCount = 0;
        dropzoneArea.innerHTML = '';
        dropzoneArea.className = 'dropzone-area'; // reset layouts
        
        // Remove all glows
        dropzoneBg.classList.remove('is-glow', 'success-glow', 'error-glow');
        
        if (!soft) questionContent.innerHTML = questionHTML;
        checkBtn.classList.add('hidden');
        dropzoneText.classList.remove('hidden'); // Restore text
    }

    function triggerErrorState() {
        // Apply error CSS glow instead of changing src
        dropzoneBg.classList.remove('is-glow', 'success-glow');
        dropzoneBg.classList.add('error-glow');
        
        dropzoneContainer.classList.add('shake');
        setTimeout(() => {
            dropzoneContainer.classList.remove('shake');
            updateDropzoneBackground();
        }, 500);
    }
    
    // Show initial Level 1 transition when game starts
    const overlay = document.getElementById('level-transition-overlay');
    const title = document.getElementById('transition-title');
    const subtitle = document.getElementById('transition-subtitle');
    const uiLayer = document.querySelector('.ui-layer');
    
    uiLayer.classList.add('level-fade');
    title.textContent = `LEVEL 1`;
    subtitle.textContent = `Make ₹12`;
    overlay.classList.remove('hidden');
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        uiLayer.classList.remove('level-fade');

        // Level 1 is now playable. Tutorial fires 5s from here; idle clock starts now.
        if (currentLevel === 1) startLevel1Tutorial();
        resetIdleTimer();
    }, 2000);
}
