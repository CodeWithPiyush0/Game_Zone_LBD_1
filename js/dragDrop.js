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
        item.addEventListener('dragstart', (e) => {
            draggedItemValue = item.getAttribute('data-value');
            draggedItemType = item.classList.contains('note') ? 'note' : 'coin';
            draggedItemOrigin = null; // Came from tray
            
            const img = item.querySelector('img');
            const originalSrc = img.src;
            img.setAttribute('data-original', originalSrc);
            img.src = originalSrc.replace('_Default', '_Glow');
            
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', draggedItemValue);
        });
        
        item.addEventListener('dragend', (e) => {
            const img = item.querySelector('img');
            if (img.getAttribute('data-original')) {
                img.src = img.getAttribute('data-original');
            }
            // Revert hover glow if drag ended without dropping
            updateDropzoneBackground();
        });
    });
    
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
            
            // Add drag events for returning to tray
            newCoin.addEventListener('dragstart', (ev) => {
                draggedItemValue = '5';
                draggedItemType = 'coin';
                draggedItemOrigin = newCoin;
                ev.dataTransfer.effectAllowed = 'move';
                // Don't need glow logic for returning to tray
            });
            
            newCoin.addEventListener('dragend', () => {
                draggedItemOrigin = null;
            });
            
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
    });
    
    // Allow dropping back to tray
    moneyTray.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    
    moneyTray.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItemOrigin) {
            playSound('drop');
            draggedItemOrigin.remove();
            droppedCoinsCount--;
            updateDropzoneLayout(droppedCoinsCount);
            draggedItemOrigin = null;
            updateDropzoneBackground();
        }
    });
    
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
