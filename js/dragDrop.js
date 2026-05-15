import { triggerSuccessAnimation } from './ticketBurst.js';

export function initDragDrop() {
    const moneyItems = document.querySelectorAll('.money-item');
    const dropzoneArea = document.getElementById('dropzone');
    const dropzoneBg = document.getElementById('dropzone-bg');
    const dropzoneContainer = document.querySelector('.dropzone-container');
    const moneyTray = document.querySelector('.money-tray');
    const checkBtn = document.getElementById('check-btn');
    const questionContent = document.querySelector('.question-content');
    
    const originalQuestionHTML = '<p>Use <span class="highlight">₹5</span> to make <span class="highlight">₹25</span></p>';
    
    let draggedItemValue = null;
    let draggedItemOrigin = null;
    
    moneyItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItemValue = item.getAttribute('data-value');
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
        
        if (droppedCoinsCount > 0) {
            checkBtn.classList.remove('hidden');
        } else {
            checkBtn.classList.add('hidden');
            questionContent.innerHTML = originalQuestionHTML;
        }

        if (droppedCoinsCount === 0) {
            dropzoneBg.src = 'assets/images/Default_dropZone.svg';
            dropzoneBg.classList.remove('is-glow');
        } else {
            dropzoneBg.src = 'assets/images/Glow_dropZone.svg';
            dropzoneBg.classList.add('is-glow');
        }
    }

    dropzoneContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (droppedCoinsCount === 0 && !draggedItemOrigin) {
            dropzoneBg.src = 'assets/images/Glow_dropZone.svg';
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
            droppedCoinsCount++;
            questionContent.innerHTML = originalQuestionHTML; // Reset any previous error text
            updateDropzoneBackground();
            
            const newCoin = document.createElement('div');
            newCoin.className = 'dropped-coin';
            newCoin.draggable = true;
            
            // Add drag events for returning to tray
            newCoin.addEventListener('dragstart', (ev) => {
                draggedItemValue = '5';
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
            dropzoneBg.src = 'assets/images/Incorrect_dropZone.svg';
            dropzoneBg.classList.add('is-glow'); // Incorrect_dropZone might also share the viewBox, safely apply it
            dropzoneContainer.classList.add('shake');
            setTimeout(() => {
                dropzoneContainer.classList.remove('shake');
                updateDropzoneBackground();
            }, 500);
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
        if (droppedCoinsCount < 5) {
            // Failure: Less coin
            questionContent.innerHTML = '<p style="color: #FFD600;">Oops! You need <span style="color: #FFD600;">more</span> to make ₹25</p>';
            triggerErrorState();
        } else if (droppedCoinsCount > 5) {
            // Failure: More coin
            questionContent.innerHTML = '<p style="color: #FFD600;">Oops! That is <span style="color: #FFD600;">more</span> than ₹25</p>';
            triggerErrorState();
        } else if (droppedCoinsCount === 5) {
            // Success!
            questionContent.innerHTML = '<p>Yay! You have won the <span class="highlight">tickets!</span></p>';
            dropzoneBg.src = 'assets/images/Success_dropZone.svg';
            dropzoneBg.classList.add('is-glow');
            triggerSuccessAnimation();
            checkBtn.classList.add('hidden');
        }
    });

    function triggerErrorState() {
        dropzoneBg.src = 'assets/images/Incorrect_dropZone.svg';
        dropzoneBg.classList.add('is-glow');
        dropzoneContainer.classList.add('shake');
        setTimeout(() => {
            dropzoneContainer.classList.remove('shake');
            updateDropzoneBackground();
        }, 500);
    }
}
