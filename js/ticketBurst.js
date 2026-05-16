export function triggerSuccessAnimation() {
    const gameContainer = document.querySelector('.game-container');
    const dropzoneContainer = document.querySelector('.dropzone-container');

    dropzoneContainer.classList.add('success-pop');
    setTimeout(() => {
        dropzoneContainer.classList.remove('success-pop');
    }, 600);

    const burstContainer = document.createElement('div');
    burstContainer.className = 'ticket-burst-container';
    gameContainer.appendChild(burstContainer);

    const flash = document.createElement('div');
    flash.className = 'success-flash';
    burstContainer.appendChild(flash);
    
    const singleTicketAsset = 'assets/images/Confetti/ticket-single.png';
    const confettiAssets = [
        'assets/images/Confetti/confetti 1.png',
        'assets/images/Confetti/confetti 2-1.png',
        'assets/images/Confetti/confetti 2.png',
        'assets/images/Confetti/confetti 3.png',
        'assets/images/Confetti/confetti 4.png'
    ];
    
    // Create bursts from both bottom corners
    for (let i = 0; i < 90; i++) {
        const particle = document.createElement('img');
        
        const isTicket = Math.random() > 0.4; // 60% tickets, 40% confetti
        particle.src = isTicket ? singleTicketAsset : confettiAssets[Math.floor(Math.random() * confettiAssets.length)];
        particle.className = isTicket ? 'anim-ticket-single' : 'anim-ticket-single anim-confetti';
        
        // Alternate between left and right corners
        const isLeft = i % 2 === 0;
        
        // Start from bottom corners, slightly off screen
        const startX = isLeft ? (-5 + Math.random() * 15) : (90 + Math.random() * 15);
        const startY = 100 + Math.random() * 15;
        
        particle.style.left = `${startX}vw`;
        particle.style.top = `${startY}vh`;
        
        // Target X trajectory
        let tx;
        if (isLeft) {
            tx = 40 + Math.random() * 60; // Shoot right across screen
        } else {
            tx = -40 - Math.random() * 60; // Shoot left across screen
        }
        
        // Peak of arc
        const peakY = -90 - Math.random() * 40; // Fly high up (relative to start)
        
        const scale = 0.5 + Math.random() * 0.7; 
        const duration = 2.5 + Math.random() * 1.5;
        const delay = Math.random() * 0.2; // Rapid explosion
        
        particle.style.zIndex = Math.random() > 0.5 ? 100 : 40;
        if (scale > 0.9) particle.style.filter = `drop-shadow(0 5px 10px rgba(0,0,0,0.5))`;
        
        const rot = (Math.random() - 0.5) * 1080;
        
        particle.style.setProperty('--tx', `${tx}vw`);
        particle.style.setProperty('--peak-y', `${peakY}vh`);
        particle.style.setProperty('--rot', `${rot}deg`);
        particle.style.setProperty('--scale', scale);
        
        particle.style.animation = `cornerBurst ${duration}s linear ${delay}s forwards`;
        burstContainer.appendChild(particle);
    }
    
    // Cleanup
    setTimeout(() => {
        if (burstContainer.parentNode) {
            burstContainer.remove();
        }
    }, 5000);
}
