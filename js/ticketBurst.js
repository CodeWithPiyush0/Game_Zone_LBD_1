export function triggerSuccessAnimation() {
    const gameContainer = document.querySelector('.game-container');
    const dropzoneContainer = document.querySelector('.dropzone-container');
    
    // Play success sound if needed
    // (Assuming sound logic is handled elsewhere or can be added here)

    // Add success pop to dropzone
    dropzoneContainer.classList.add('success-pop');
    setTimeout(() => {
        dropzoneContainer.classList.remove('success-pop');
    }, 600);

    // Create container
    const burstContainer = document.createElement('div');
    burstContainer.className = 'ticket-burst-container';
    gameContainer.appendChild(burstContainer);
    
    const rect = dropzoneContainer.getBoundingClientRect();
    const centerX = (rect.left + rect.width / 2) / window.innerWidth * 100;
    const centerY = (rect.top + rect.height / 2) / window.innerHeight * 100;

    // 1. Initial burst of ticket strips from the center
    const stripAssets = [
        'assets/images/Confetti/ticket-strip.png'
    ];
    
    for (let i = 0; i < 7; i++) {
        const strip = document.createElement('img');
        strip.src = stripAssets[Math.floor(Math.random() * stripAssets.length)];
        strip.className = 'anim-ticket-strip';
        
        // Randomize trajectory
        const angle = (Math.random() * 360) * (Math.PI / 180);
        const distance = 40 + Math.random() * 40; // vw/vh relative distance
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        const rotation = (Math.random() - 0.5) * 180;
        const scale = 0.6 + Math.random() * 0.6;
        const duration = 1.2 + Math.random() * 0.8;
        const delay = Math.random() * 0.15; // Explosive fast stagger
        
        strip.style.left = `${centerX}vw`;
        strip.style.top = `${centerY}vh`;
        strip.style.setProperty('--tx', `${tx}vw`);
        strip.style.setProperty('--ty', `${ty}vh`);
        strip.style.setProperty('--rot', `${rotation}deg`);
        strip.style.setProperty('--scale', scale);
        
        // Layering depth
        strip.style.zIndex = Math.random() > 0.5 ? 50 : 5;
        
        strip.style.animation = `stripBurst ${duration}s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${delay}s forwards`;
        
        burstContainer.appendChild(strip);
    }
    
    // 2. Single Ticket Rain
    const singleTicketAsset = 'assets/images/Confetti/ticket-single.png';
    for (let i = 0; i < 50; i++) {
        const ticket = document.createElement('img');
        ticket.src = singleTicketAsset;
        ticket.className = 'anim-ticket-single';
        
        // Randomize start
        const startX = -10 + Math.random() * 120; // Spread across screen
        const startY = -20 - Math.random() * 40; // Start above screen
        
        // Layering
        ticket.style.zIndex = Math.random() > 0.5 ? 50 : 5;
        
        // Depth
        const scale = 0.3 + Math.random() * 0.7;
        const isBlurred = scale < 0.5 && Math.random() > 0.5;
        if (isBlurred) {
            ticket.style.filter = `blur(${1 + Math.random() * 2}px)`;
        }
        ticket.style.opacity = 0.8 + Math.random() * 0.2;
        
        const fallDuration = 2.5 + Math.random() * 2.5;
        const delay = 0.2 + Math.random() * 1.5; // Start shortly after burst
        
        ticket.style.left = `${startX}vw`;
        ticket.style.top = `${startY}vh`;
        
        // Animation params
        const rotStart = Math.random() * 360;
        const rotEnd = rotStart + 360 + Math.random() * 720;
        const tx = (Math.random() - 0.5) * 30; // Horizontal drift
        
        ticket.style.setProperty('--tx', `${tx}vw`);
        ticket.style.setProperty('--rot-start', `${rotStart}deg`);
        ticket.style.setProperty('--rot-end', `${rotEnd}deg`);
        ticket.style.setProperty('--scale', scale);
        
        ticket.style.animation = `ticketFall ${fallDuration}s ease-in ${delay}s forwards`;
        
        burstContainer.appendChild(ticket);
    }
    
    // Cleanup after 5-6s
    setTimeout(() => {
        if (burstContainer.parentNode) {
            burstContainer.remove();
        }
    }, 5500);
}
