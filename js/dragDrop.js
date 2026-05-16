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
        error: new Audio('assets/sounds/error.mp3'),
        success: new Audio('assets/sounds/success1.mp3') // Used success1.mp3 based on folder contents
    };

    function playSound(name) {
        if (sounds[name]) {
            sounds[name].currentTime = 0;
            sounds[name].play().catch(e => console.log('Audio error:', e));
        }
    }
    
    const originalQuestionHTML = '<p>Use <span class="highlight">₹5</span> to make <span class="highlight">₹25</span></p>';
    
    let draggedItemValue = null;
    let draggedItemOrigin = null;
    let draggedItemType = null;
    
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
        
        handleDragEnd(e);
        
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
            questionContent.innerHTML = originalQuestionHTML;
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

        if (draggedItemValue === '5') {
            // Success dropping 5 coin
            
            // Play the material drop sound
            if (draggedItemType === 'note') {
                playSound('note');
            } else {
                playSound('drop');
            }
            
            droppedCoinsCount++;
            questionContent.innerHTML = originalQuestionHTML; // Reset any previous error text
            updateDropzoneBackground();
            
            const newCoin = document.createElement('div');
            newCoin.className = 'dropped-coin';
            newCoin.draggable = true;
            newCoin.setAttribute('data-value', '5'); // Required for dragging back
            
            // Add mouse drag events for returning to tray
            newCoin.addEventListener('dragstart', handleDragStart);
            newCoin.addEventListener('dragend', handleDragEnd);
            
            // Add touch events for returning to tray
            newCoin.addEventListener('touchstart', handleTouchStart, {passive: false});
            newCoin.addEventListener('touchmove', handleTouchMove, {passive: false});
            newCoin.addEventListener('touchend', handleTouchEnd);
            newCoin.addEventListener('touchcancel', handleTouchEnd);
            
            const coinImg = document.createElement('img');
            coinImg.src = 'assets/images/Money/Five_Rupee_Default.png';
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
            playSound('drop');
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
        playSound('click');
        
        if (droppedCoinsCount < 5) {
            // Failure: Less coin
            playSound('error');
            questionContent.innerHTML = '<p style="color: #FFD600;">Too few coins, add more</p>';
            triggerErrorState();
        } else if (droppedCoinsCount > 5) {
            // Failure: More coin
            playSound('error');
            questionContent.innerHTML = '<p style="color: #FFD600;">Too many coins, remove some</p>';
            triggerErrorState();
        } else if (droppedCoinsCount === 5) {
            // Success!
            playSound('success');
            questionContent.innerHTML = '<p>Yay! You have won the <span class="highlight">tickets!</span></p>';
            
            // Apply success CSS glow instead of changing src
            dropzoneBg.classList.remove('is-glow', 'error-glow');
            dropzoneBg.classList.add('success-glow');
            
            triggerSuccessAnimation();
            checkBtn.classList.add('hidden');
            
            // Reset game after celebration
            setTimeout(() => {
                resetGame();
            }, 6000);
        }
    });

    function resetGame() {
        droppedCoinsCount = 0;
        dropzoneArea.innerHTML = '';
        dropzoneArea.className = 'dropzone-area'; // reset layouts
        
        // Remove all glows
        dropzoneBg.classList.remove('is-glow', 'success-glow', 'error-glow');
        
        questionContent.innerHTML = originalQuestionHTML;
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
}
