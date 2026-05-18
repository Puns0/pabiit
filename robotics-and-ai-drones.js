document.addEventListener("DOMContentLoaded", () => {
    
    // --- GSAP ANIMATIONS ---
    gsap.registerPlugin(ScrollTrigger);

    // Animate elements with .gs-reveal stagger per slide
    const slidesElements = document.querySelectorAll('.slide');
    slidesElements.forEach((slide) => {
        const revealElements = slide.querySelectorAll('.gs-reveal');
        if (revealElements.length > 0) {
            gsap.to(revealElements, {
                scrollTrigger: {
                    trigger: slide,
                    scroller: "#scrollContainer",
                    start: "top 75%",
                    toggleActions: "play none none reverse",
                },
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: "power3.out"
            });
        }
    });

    // --- NAVIGATION DOTS & PROGRESS BAR ---
    const slides = document.querySelectorAll('.slide');
    const navDotsContainer = document.getElementById('navDots');
    const scrollContainer = document.getElementById('scrollContainer');
    const progressBar = document.getElementById('progressBar');

    // Generate dots
    slides.forEach((slide, index) => {
        const dot = document.createElement('div');
        dot.className = 'nav-dot';
        if (index === 0) dot.classList.add('active');
        
        // Click to scroll to slide
        dot.addEventListener('click', () => {
            slide.scrollIntoView({ behavior: 'smooth' });
        });
        
        navDotsContainer.appendChild(dot);
    });

    const navDots = document.querySelectorAll('.nav-dot');

    // Update active dot and progress bar on scroll
    scrollContainer.addEventListener('scroll', () => {
        const scrollPosition = scrollContainer.scrollTop;
        const windowHeight = window.innerHeight;
        const totalHeight = scrollContainer.scrollHeight - windowHeight;
        
        // Progress bar
        const scrollPercentage = (scrollPosition / totalHeight) * 100;
        progressBar.style.width = scrollPercentage + '%';

        // Active dot
        let currentSlideIndex = Math.round(scrollPosition / windowHeight);
        
        navDots.forEach((dot, index) => {
            if (index === currentSlideIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    });


    // --- WAYPOINT MAP LOGIC (Slide 4) ---
    const wpCanvas = document.getElementById('waypointCanvas');
    if (wpCanvas) {
        const wpCtx = wpCanvas.getContext('2d');
        const waypoints = [];
        let drone = { active: false, currentTarget: 0, x: null, y: null };
        let wpAnimId;

        // Resize canvas to fit container
        function resizeWpCanvas() {
            wpCanvas.width = wpCanvas.parentElement.clientWidth;
            wpCanvas.height = 300; // Fixed height for demo
            drawWpMap();
        }

        function drawWpMap() {
            wpCtx.clearRect(0, 0, wpCanvas.width, wpCanvas.height);
            
            // Draw Grid
            wpCtx.strokeStyle = '#e2e8f0';
            wpCtx.lineWidth = 1;
            for(let x=0; x<wpCanvas.width; x+=40) { wpCtx.beginPath(); wpCtx.moveTo(x,0); wpCtx.lineTo(x,wpCanvas.height); wpCtx.stroke(); }
            for(let y=0; y<wpCanvas.height; y+=40) { wpCtx.beginPath(); wpCtx.moveTo(0,y); wpCtx.lineTo(wpCanvas.width,y); wpCtx.stroke(); }

            // Draw Paths
            if (waypoints.length > 1) {
                wpCtx.beginPath();
                wpCtx.moveTo(waypoints[0].x, waypoints[0].y);
                for (let i = 1; i < waypoints.length; i++) {
                    wpCtx.lineTo(waypoints[i].x, waypoints[i].y);
                }
                wpCtx.strokeStyle = '#94a3b8';
                wpCtx.setLineDash([5, 5]);
                wpCtx.lineWidth = 2;
                wpCtx.stroke();
                wpCtx.setLineDash([]);
            }

            // Draw Waypoints
            waypoints.forEach((p, index) => {
                wpCtx.beginPath();
                wpCtx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                wpCtx.fillStyle = '#0ea5e9'; // Primary color
                wpCtx.fill();
                wpCtx.strokeStyle = '#fff';
                wpCtx.lineWidth = 2;
                wpCtx.stroke();
                
                wpCtx.fillStyle = '#334155';
                wpCtx.font = "12px sans-serif";
                wpCtx.fillText(`WP ${index+1}`, p.x + 10, p.y - 10);
            });

            // Draw Drone
            if (drone.active && drone.x !== null) {
                wpCtx.beginPath();
                wpCtx.moveTo(drone.x, drone.y - 12);
                wpCtx.lineTo(drone.x + 12, drone.y + 12);
                wpCtx.lineTo(drone.x - 12, drone.y + 12);
                wpCtx.closePath();
                wpCtx.fillStyle = '#ef4444'; // Alert color
                wpCtx.fill();
            }
        }

        // Add waypoint on click
        wpCanvas.addEventListener('click', (e) => {
            if (drone.active || waypoints.length >= 6) return;
            const rect = wpCanvas.getBoundingClientRect();
            waypoints.push({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            drawWpMap();
        });

        // Buttons
        document.getElementById('clearWaypoints').addEventListener('click', () => {
            waypoints.length = 0;
            drone = { active: false, currentTarget: 0, x: null, y: null };
            cancelAnimationFrame(wpAnimId);
            drawWpMap();
        });

        document.getElementById('launchDrone').addEventListener('click', () => {
            if (waypoints.length < 2 || drone.active) return;
            drone.active = true;
            drone.currentTarget = 1;
            drone.x = waypoints[0].x;
            drone.y = waypoints[0].y;
            animateDrone();
        });

        function animateDrone() {
            if (!drone.active) return;
            
            const target = waypoints[drone.currentTarget];
            const dx = target.x - drone.x;
            const dy = target.y - drone.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const speed = 2.5;

            if (dist < speed) {
                drone.x = target.x;
                drone.y = target.y;
                drone.currentTarget++;
                if (drone.currentTarget >= waypoints.length) {
                    drone.active = false; // Reached end
                }
            } else {
                drone.x += (dx / dist) * speed;
                drone.y += (dy / dist) * speed;
            }
            
            drawWpMap();
            if (drone.active) {
                wpAnimId = requestAnimationFrame(animateDrone);
            }
        }

        window.addEventListener('resize', resizeWpCanvas);
        resizeWpCanvas(); // Init
    }

    // --- RADAR LOGIC (Slide 12) ---
    const rCanvas = document.getElementById('radarCanvas');
    if (rCanvas) {
        const rCtx = rCanvas.getContext('2d');
        let rAngle = 0;
        let mousePos = { x: null, y: null };
        let blipAlpha = 0;

        function resizeRadarCanvas() {
            rCanvas.width = rCanvas.parentElement.clientWidth;
            rCanvas.height = rCanvas.parentElement.clientHeight - 60; // Subtract header/footer
        }

        rCanvas.addEventListener('mousemove', (e) => {
            const rect = rCanvas.getBoundingClientRect();
            mousePos.x = e.clientX - rect.left;
            mousePos.y = e.clientY - rect.top;
        });

        rCanvas.addEventListener('mouseleave', () => {
            mousePos.x = null;
            mousePos.y = null;
        });

        function drawRadar() {
            const cx = rCanvas.width / 2;
            const cy = rCanvas.height / 2;
            // INCREASED RADAR RADIUS
            const radius = Math.min(cx, cy) - 5;

            // Fade trail
            rCtx.fillStyle = 'rgba(5, 5, 5, 0.1)';
            rCtx.fillRect(0, 0, rCanvas.width, rCanvas.height);

            // Grid lines
            rCtx.strokeStyle = 'rgba(14, 165, 233, 0.2)'; // Primary color faint
            rCtx.lineWidth = 1;
            rCtx.beginPath(); rCtx.arc(cx, cy, radius * 0.33, 0, Math.PI * 2); rCtx.stroke();
            rCtx.beginPath(); rCtx.arc(cx, cy, radius * 0.66, 0, Math.PI * 2); rCtx.stroke();
            rCtx.beginPath(); rCtx.arc(cx, cy, radius, 0, Math.PI * 2); rCtx.stroke();
            rCtx.beginPath(); rCtx.moveTo(cx, cy - radius); rCtx.lineTo(cx, cy + radius); rCtx.stroke();
            rCtx.beginPath(); rCtx.moveTo(cx - radius, cy); rCtx.lineTo(cx + radius, cy); rCtx.stroke();

            // Sweeper
            rCtx.save();
            rCtx.translate(cx, cy);
            rCtx.rotate(rAngle);
            const gradient = rCtx.createConicGradient(0, 0, 0);
            gradient.addColorStop(0, 'rgba(14, 165, 233, 0)');
            gradient.addColorStop(0.1, 'rgba(14, 165, 233, 0.5)');
            gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
            
            rCtx.beginPath();
            rCtx.moveTo(0, 0);
            rCtx.arc(0, 0, radius, 0, Math.PI / 4);
            rCtx.fillStyle = gradient;
            rCtx.fill();
            rCtx.restore();

            // Target Detection
            if (mousePos.x !== null && mousePos.y !== null) {
                const dx = mousePos.x - cx;
                const dy = mousePos.y - cy;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist <= radius) {
                    let mAngle = Math.atan2(dy, dx);
                    if (mAngle < 0) mAngle += Math.PI * 2;
                    let sAngle = rAngle % (Math.PI * 2);
                    
                    // If sweeper passes over mouse
                    if (Math.abs(sAngle - mAngle) < 0.15) {
                        blipAlpha = 1.0;
                    }

                    if (blipAlpha > 0) {
                        // Draw Blip
                        rCtx.beginPath();
                        rCtx.arc(mousePos.x, mousePos.y, 5, 0, Math.PI * 2);
                        rCtx.fillStyle = `rgba(239, 68, 68, ${blipAlpha})`; // Alert color
                        rCtx.fill();
                        
                        // Draw crosshair box
                        rCtx.strokeStyle = `rgba(239, 68, 68, ${blipAlpha})`;
                        rCtx.lineWidth = 1;
                        rCtx.strokeRect(mousePos.x - 15, mousePos.y - 15, 30, 30);
                        
                        blipAlpha -= 0.015;
                    }
                }
            }

            rAngle += 0.03;
            requestAnimationFrame(drawRadar);
        }

        window.addEventListener('resize', resizeRadarCanvas);
        resizeRadarCanvas(); // Init
        drawRadar(); // Start loop
    }
});
