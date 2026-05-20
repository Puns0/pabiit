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


    // --- AI WAYPOINT LOGIC (Slide 6) ---
    const aiCanvas = document.getElementById('aiWaypointCanvas');
    if (aiCanvas) {
        const aiCtx = aiCanvas.getContext('2d');
        const aiWaypoints = [];
        const aiObstacles = [];
        let aiMode = 'waypoint'; // 'waypoint' or 'obstacle'
        let aiDrone = { active: false, currentTarget: 0, path: [], pathIndex: 0, x: null, y: null };
        let aiAnimId;
        
        const modeWpBtn = document.getElementById('modeWaypoint');
        const modeObsBtn = document.getElementById('modeObstacle');
        
        modeWpBtn.addEventListener('click', () => {
            aiMode = 'waypoint';
            modeWpBtn.classList.add('btn-primary');
            modeWpBtn.classList.remove('btn-outline');
            modeObsBtn.classList.add('btn-outline');
            modeObsBtn.classList.remove('btn-primary');
        });
        
        modeObsBtn.addEventListener('click', () => {
            aiMode = 'obstacle';
            modeObsBtn.classList.add('btn-primary');
            modeObsBtn.classList.remove('btn-outline');
            modeWpBtn.classList.add('btn-outline');
            modeWpBtn.classList.remove('btn-primary');
        });

        function resizeAICanvas() {
            aiCanvas.width = aiCanvas.parentElement.clientWidth;
            aiCanvas.height = 300;
            drawAIMap();
        }

        function drawAIMap() {
            aiCtx.clearRect(0, 0, aiCanvas.width, aiCanvas.height);
            
            // Draw Grid
            aiCtx.strokeStyle = '#e2e8f0';
            aiCtx.lineWidth = 1;
            for(let x=0; x<aiCanvas.width; x+=20) { aiCtx.beginPath(); aiCtx.moveTo(x,0); aiCtx.lineTo(x,aiCanvas.height); aiCtx.stroke(); }
            for(let y=0; y<aiCanvas.height; y+=20) { aiCtx.beginPath(); aiCtx.moveTo(0,y); aiCtx.lineTo(aiCanvas.width,y); aiCtx.stroke(); }

            // Draw Obstacles
            aiCtx.fillStyle = '#64748b'; // Slate gray
            aiObstacles.forEach(obs => {
                aiCtx.fillRect(obs.x, obs.y, obs.w, obs.h);
                aiCtx.strokeStyle = '#334155';
                aiCtx.lineWidth = 2;
                aiCtx.strokeRect(obs.x, obs.y, obs.w, obs.h);
            });

            // Draw Paths
            if (aiDrone.path && aiDrone.path.length > 0) {
                aiCtx.beginPath();
                aiCtx.moveTo(aiDrone.path[0].x, aiDrone.path[0].y);
                for (let i = 1; i < aiDrone.path.length; i++) {
                    aiCtx.lineTo(aiDrone.path[i].x, aiDrone.path[i].y);
                }
                aiCtx.strokeStyle = '#0ea5e9';
                aiCtx.setLineDash([5, 5]);
                aiCtx.lineWidth = 2;
                aiCtx.stroke();
                aiCtx.setLineDash([]);
            } else if (aiWaypoints.length > 1 && !aiDrone.active) {
                // Just draw naive lines if path not calculated yet
                aiCtx.beginPath();
                aiCtx.moveTo(aiWaypoints[0].x, aiWaypoints[0].y);
                for (let i = 1; i < aiWaypoints.length; i++) {
                    aiCtx.lineTo(aiWaypoints[i].x, aiWaypoints[i].y);
                }
                aiCtx.strokeStyle = '#94a3b8';
                aiCtx.setLineDash([5, 5]);
                aiCtx.lineWidth = 2;
                aiCtx.stroke();
                aiCtx.setLineDash([]);
            }

            // Draw Waypoints
            aiWaypoints.forEach((p, index) => {
                aiCtx.beginPath();
                aiCtx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                aiCtx.fillStyle = '#0ea5e9';
                aiCtx.fill();
                aiCtx.strokeStyle = '#fff';
                aiCtx.lineWidth = 2;
                aiCtx.stroke();
                
                aiCtx.fillStyle = '#334155';
                aiCtx.font = "12px sans-serif";
                aiCtx.fillText(`WP ${index+1}`, p.x + 10, p.y - 10);
            });

            // Draw Drone
            if (aiDrone.active && aiDrone.x !== null) {
                aiCtx.beginPath();
                aiCtx.moveTo(aiDrone.x, aiDrone.y - 12);
                aiCtx.lineTo(aiDrone.x + 12, aiDrone.y + 12);
                aiCtx.lineTo(aiDrone.x - 12, aiDrone.y + 12);
                aiCtx.closePath();
                aiCtx.fillStyle = '#0ea5e9'; // AI Drone is primary colored
                aiCtx.fill();
                aiCtx.strokeStyle = '#fff';
                aiCtx.lineWidth = 2;
                aiCtx.stroke();
            }
        }

        aiCanvas.addEventListener('click', (e) => {
            if (aiDrone.active) return;
            const rect = aiCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (aiMode === 'waypoint') {
                if (aiWaypoints.length < 6) {
                    aiWaypoints.push({ x, y });
                }
            } else if (aiMode === 'obstacle') {
                // Place a 40x80 obstacle stick centered on click
                aiObstacles.push({ x: x - 20, y: y - 40, w: 40, h: 80 });
            }
            drawAIMap();
        });

        document.getElementById('clearAIWaypoints').addEventListener('click', () => {
            aiWaypoints.length = 0;
            aiObstacles.length = 0;
            aiDrone = { active: false, currentTarget: 0, path: [], pathIndex: 0, x: null, y: null };
            cancelAnimationFrame(aiAnimId);
            drawAIMap();
        });

        document.getElementById('launchAIDrone').addEventListener('click', () => {
            if (aiWaypoints.length < 2 || aiDrone.active) return;
            aiDrone.active = true;
            aiDrone.currentTarget = 1;
            aiDrone.x = aiWaypoints[0].x;
            aiDrone.y = aiWaypoints[0].y;
            
            // Calculate full path avoiding obstacles
            aiDrone.path = calculateAStarPath(aiWaypoints, aiObstacles, aiCanvas.width, aiCanvas.height);
            aiDrone.pathIndex = 0;
            
            animateAIDrone();
        });
        
        function AABBIntersect(x, y, r, obs) {
            return (x + r > obs.x && x - r < obs.x + obs.w && 
                    y + r > obs.y && y - r < obs.y + obs.h);
        }

        function calculateAStarPath(waypoints, obstacles, width, height) {
            let fullPath = [];
            const gridSize = 10;
            const cols = Math.ceil(width / gridSize);
            const rows = Math.ceil(height / gridSize);
            
            for (let i = 0; i < waypoints.length - 1; i++) {
                let start = waypoints[i];
                let end = waypoints[i+1];
                let subPath = astar(start, end, obstacles, cols, rows, gridSize);
                if (subPath.length > 0) {
                    if (i > 0) subPath.shift(); // remove duplicate start point
                    fullPath = fullPath.concat(subPath);
                } else {
                    // fallback to straight line if blocked
                    fullPath.push(end);
                }
            }
            // Ensure first point is start
            if (fullPath.length > 0 && (fullPath[0].x !== waypoints[0].x || fullPath[0].y !== waypoints[0].y)) {
                fullPath.unshift({x: waypoints[0].x, y: waypoints[0].y});
            }
            return fullPath;
        }

        function astar(start, end, obstacles, cols, rows, gridSize) {
            const startCol = Math.floor(start.x / gridSize);
            const startRow = Math.floor(start.y / gridSize);
            const endCol = Math.floor(end.x / gridSize);
            const endRow = Math.floor(end.y / gridSize);
            
            let openSet = [{c: startCol, r: startRow, g: 0, h: 0, f: 0, parent: null}];
            let closedSet = new Set();
            let safeRadius = 15; // Drone radius + buffer
            
            function heuristic(aCol, aRow, bCol, bRow) {
                return Math.abs(aCol - bCol) + Math.abs(aRow - bRow);
            }
            
            let bestEndNode = null;
            let attempts = 0;
            
            while(openSet.length > 0 && attempts < 2000) {
                attempts++;
                // Sort by lowest f
                openSet.sort((a,b) => a.f - b.f);
                let current = openSet.shift();
                
                if (current.c === endCol && current.r === endRow) {
                    bestEndNode = current;
                    break;
                }
                
                closedSet.add(`${current.c},${current.r}`);
                
                let neighbors = [
                    {c: current.c+1, r: current.r}, {c: current.c-1, r: current.r},
                    {c: current.c, r: current.r+1}, {c: current.c, r: current.r-1},
                    {c: current.c+1, r: current.r+1}, {c: current.c-1, r: current.r-1},
                    {c: current.c+1, r: current.r-1}, {c: current.c-1, r: current.r+1}
                ];
                
                for (let n of neighbors) {
                    if (n.c < 0 || n.c >= cols || n.r < 0 || n.r >= rows) continue;
                    if (closedSet.has(`${n.c},${n.r}`)) continue;
                    
                    let cx = n.c * gridSize + gridSize/2;
                    let cy = n.r * gridSize + gridSize/2;
                    
                    let collision = false;
                    for (let obs of obstacles) {
                        if (AABBIntersect(cx, cy, safeRadius, obs)) {
                            collision = true;
                            break;
                        }
                    }
                    if (collision) continue;
                    
                    let tempG = current.g + ((n.c!==current.c && n.r!==current.r) ? 1.414 : 1);
                    
                    let existing = openSet.find(o => o.c === n.c && o.r === n.r);
                    if (!existing) {
                        n.g = tempG;
                        n.h = heuristic(n.c, n.r, endCol, endRow);
                        n.f = n.g + n.h;
                        n.parent = current;
                        openSet.push(n);
                    } else if (tempG < existing.g) {
                        existing.g = tempG;
                        existing.f = existing.g + existing.h;
                        existing.parent = current;
                    }
                }
            }
            
            let path = [];
            let curr = bestEndNode;
            while(curr) {
                // If it's the start or end node, use exact coordinates, else grid center
                if (!curr.parent) path.push({x: start.x, y: start.y});
                else if (curr.c === endCol && curr.r === endRow) path.push({x: end.x, y: end.y});
                else path.push({x: curr.c * gridSize + gridSize/2, y: curr.r * gridSize + gridSize/2});
                curr = curr.parent;
            }
            return path.reverse();
        }

        function animateAIDrone() {
            if (!aiDrone.active) return;
            
            if (aiDrone.pathIndex >= aiDrone.path.length) {
                aiDrone.active = false;
                drawAIMap();
                return;
            }
            
            const target = aiDrone.path[aiDrone.pathIndex];
            const dx = target.x - aiDrone.x;
            const dy = target.y - aiDrone.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const speed = 2.5;

            if (dist < speed) {
                aiDrone.x = target.x;
                aiDrone.y = target.y;
                aiDrone.pathIndex++;
            } else {
                aiDrone.x += (dx / dist) * speed;
                aiDrone.y += (dy / dist) * speed;
            }
            
            drawAIMap();
            if (aiDrone.active) {
                aiAnimId = requestAnimationFrame(animateAIDrone);
            }
        }

        window.addEventListener('resize', resizeAICanvas);
        resizeAICanvas();
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
