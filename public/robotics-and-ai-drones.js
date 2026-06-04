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
            for (let x = 0; x < wpCanvas.width; x += 40) { wpCtx.beginPath(); wpCtx.moveTo(x, 0); wpCtx.lineTo(x, wpCanvas.height); wpCtx.stroke(); }
            for (let y = 0; y < wpCanvas.height; y += 40) { wpCtx.beginPath(); wpCtx.moveTo(0, y); wpCtx.lineTo(wpCanvas.width, y); wpCtx.stroke(); }

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
                wpCtx.fillText(`WP ${index + 1}`, p.x + 10, p.y - 10);
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
            const dist = Math.sqrt(dx * dx + dy * dy);
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
            for (let x = 0; x < aiCanvas.width; x += 20) { aiCtx.beginPath(); aiCtx.moveTo(x, 0); aiCtx.lineTo(x, aiCanvas.height); aiCtx.stroke(); }
            for (let y = 0; y < aiCanvas.height; y += 20) { aiCtx.beginPath(); aiCtx.moveTo(0, y); aiCtx.lineTo(aiCanvas.width, y); aiCtx.stroke(); }

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
                aiCtx.fillText(`WP ${index + 1}`, p.x + 10, p.y - 10);
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
                let end = waypoints[i + 1];
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
                fullPath.unshift({ x: waypoints[0].x, y: waypoints[0].y });
            }
            return fullPath;
        }

        function astar(start, end, obstacles, cols, rows, gridSize) {
            const startCol = Math.floor(start.x / gridSize);
            const startRow = Math.floor(start.y / gridSize);
            const endCol = Math.floor(end.x / gridSize);
            const endRow = Math.floor(end.y / gridSize);

            let openSet = [{ c: startCol, r: startRow, g: 0, h: 0, f: 0, parent: null }];
            let closedSet = new Set();
            let safeRadius = 15; // Drone radius + buffer

            function heuristic(aCol, aRow, bCol, bRow) {
                return Math.abs(aCol - bCol) + Math.abs(aRow - bRow);
            }

            let bestEndNode = null;
            let attempts = 0;

            while (openSet.length > 0 && attempts < 2000) {
                attempts++;
                // Sort by lowest f
                openSet.sort((a, b) => a.f - b.f);
                let current = openSet.shift();

                if (current.c === endCol && current.r === endRow) {
                    bestEndNode = current;
                    break;
                }

                closedSet.add(`${current.c},${current.r}`);

                let neighbors = [
                    { c: current.c + 1, r: current.r }, { c: current.c - 1, r: current.r },
                    { c: current.c, r: current.r + 1 }, { c: current.c, r: current.r - 1 },
                    { c: current.c + 1, r: current.r + 1 }, { c: current.c - 1, r: current.r - 1 },
                    { c: current.c + 1, r: current.r - 1 }, { c: current.c - 1, r: current.r + 1 }
                ];

                for (let n of neighbors) {
                    if (n.c < 0 || n.c >= cols || n.r < 0 || n.r >= rows) continue;
                    if (closedSet.has(`${n.c},${n.r}`)) continue;

                    let cx = n.c * gridSize + gridSize / 2;
                    let cy = n.r * gridSize + gridSize / 2;

                    let collision = false;
                    for (let obs of obstacles) {
                        if (AABBIntersect(cx, cy, safeRadius, obs)) {
                            collision = true;
                            break;
                        }
                    }
                    if (collision) continue;

                    let tempG = current.g + ((n.c !== current.c && n.r !== current.r) ? 1.414 : 1);

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
            while (curr) {
                // If it's the start or end node, use exact coordinates, else grid center
                if (!curr.parent) path.push({ x: start.x, y: start.y });
                else if (curr.c === endCol && curr.r === endRow) path.push({ x: end.x, y: end.y });
                else path.push({ x: curr.c * gridSize + gridSize / 2, y: curr.r * gridSize + gridSize / 2 });
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
            const dist = Math.sqrt(dx * dx + dy * dy);
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
                const dist = Math.sqrt(dx * dx + dy * dy);

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

    // --- MISSILE WARFARE SIMULATION (Slide 21) ---
    const missileCanvas = document.getElementById('missileCanvas');
    if (missileCanvas) {
        const mCtx = missileCanvas.getContext('2d');
        const missileStatusEl = document.getElementById('missileStatus');
        const launchBtnIndPak = document.getElementById('launchMissileIndPak');
        const launchBtnME = document.getElementById('launchMissileME');

        // Load satellite map image
        const satMapImg = new Image();
        satMapImg.src = 'satel_map.png';
        let satMapLoaded = false;
        satMapImg.onload = () => {
            satMapLoaded = true;
            drawMissileScene();
        };

        // Locations
        const LOC = {
            india: { x: 0.72, y: 0.52, name: 'INDIA' },
            pakistan: { x: 0.60, y: 0.33, name: 'PAKISTAN' },
            iran: { x: 0.35, y: 0.28, name: 'IRAN' },
            israel: { x: 0.08, y: 0.34, name: 'ISRAEL' },
            uae: { x: 0.36, y: 0.52, name: 'UAE' },
            saudi: { x: 0.23, y: 0.55, name: 'SAUDI ARABIA' },
            kuwait: { x: 0.28, y: 0.40, name: 'KUWAIT' }
        };

        // State
        let simState = {
            active: false,
            phase: 'idle', // 'idle', 'running', 'done'
            missiles: [],
            explodeParticles: [],
            screenShake: 0,
            flashAlpha: 0,
            frame: 0
        };

        let missileAnimId;

        function resizeMissileCanvas() {
            missileCanvas.width = missileCanvas.parentElement.clientWidth;
            missileCanvas.height = missileCanvas.parentElement.clientHeight;
            drawMissileScene();
        }

        function getPixelPos(loc) {
            return {
                x: missileCanvas.width * loc.x,
                y: missileCanvas.height * loc.y
            };
        }

        // Quadratic bezier for arc trajectory
        function getMissilePos(startLoc, endLoc, t) {
            const start = getPixelPos(startLoc);
            const end = getPixelPos(endLoc);
            const cpX = (start.x + end.x) / 2;
            const cpY = Math.min(start.y, end.y) - missileCanvas.height * 0.35;

            const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cpX + t * t * end.x;
            const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cpY + t * t * end.y;
            return { x, y };
        }

        function getMissileAngle(startLoc, endLoc, t) {
            const dt = 0.001;
            const t2 = Math.min(t + dt, 1);
            const p1 = getMissilePos(startLoc, endLoc, t);
            const p2 = getMissilePos(startLoc, endLoc, t2);
            return Math.atan2(p2.y - p1.y, p2.x - p1.x);
        }

        function drawMissileScene() {
            mCtx.clearRect(0, 0, missileCanvas.width, missileCanvas.height);

            let shakeX = 0, shakeY = 0;
            if (simState.screenShake > 0) {
                shakeX = (Math.random() - 0.5) * simState.screenShake * 12;
                shakeY = (Math.random() - 0.5) * simState.screenShake * 12;
            }

            mCtx.save();
            mCtx.translate(shakeX, shakeY);

            if (satMapLoaded) {
                mCtx.drawImage(satMapImg, 0, 0, missileCanvas.width, missileCanvas.height);
                mCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                mCtx.fillRect(0, 0, missileCanvas.width, missileCanvas.height);
            } else {
                mCtx.fillStyle = '#111';
                mCtx.fillRect(0, 0, missileCanvas.width, missileCanvas.height);
            }

            // Draw all markers
            let activeSources = new Set();
            let activeTargets = new Set();

            if (simState.active) {
                simState.missiles.forEach(m => {
                    activeSources.add(m.source);
                    activeTargets.add(m.target);
                });
            }

            activeSources.forEach(loc => {
                const pt = getPixelPos(loc);
                mCtx.beginPath();
                mCtx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
                mCtx.fillStyle = 'rgba(34, 197, 94, 0.8)';
                mCtx.fill();
                mCtx.strokeStyle = '#22c55e';
                mCtx.lineWidth = 2;
                mCtx.stroke();

                const pulseR = 6 + Math.sin(Date.now() / 300) * 4;
                mCtx.beginPath();
                mCtx.arc(pt.x, pt.y, pulseR, 0, Math.PI * 2);
                mCtx.strokeStyle = `rgba(34, 197, 94, ${0.5 - Math.sin(Date.now() / 300) * 0.3})`;
                mCtx.lineWidth = 1.5;
                mCtx.stroke();

                mCtx.font = "bold 11px 'Courier New', monospace";
                mCtx.fillStyle = '#22c55e';
                mCtx.fillText(loc.name, pt.x + 12, pt.y - 6);
                mCtx.font = "10px 'Courier New', monospace";
                mCtx.fillStyle = '#86efac';
                mCtx.fillText('LAUNCH', pt.x + 12, pt.y + 6);
            });

            activeTargets.forEach(loc => {
                const pt = getPixelPos(loc);
                const crossSize = 10;
                mCtx.strokeStyle = '#ef4444';
                mCtx.lineWidth = 1.5;
                mCtx.beginPath();
                mCtx.moveTo(pt.x - crossSize, pt.y); mCtx.lineTo(pt.x - 4, pt.y);
                mCtx.moveTo(pt.x + 4, pt.y); mCtx.lineTo(pt.x + crossSize, pt.y);
                mCtx.moveTo(pt.x, pt.y - crossSize); mCtx.lineTo(pt.x, pt.y - 4);
                mCtx.moveTo(pt.x, pt.y + 4); mCtx.lineTo(pt.x, pt.y + crossSize);
                mCtx.stroke();

                mCtx.beginPath();
                mCtx.arc(pt.x, pt.y, crossSize + 3, 0, Math.PI * 2);
                mCtx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
                mCtx.stroke();

                mCtx.font = "bold 11px 'Courier New', monospace";
                mCtx.fillStyle = '#ef4444';
                mCtx.fillText(loc.name, pt.x + 16, pt.y - 6);
                mCtx.font = "10px 'Courier New', monospace";
                mCtx.fillStyle = '#fca5a5';
                mCtx.fillText('TARGET', pt.x + 16, pt.y + 6);
            });

            // Draw missiles
            simState.missiles.forEach(m => {
                if (m.phase === 'flying' || m.phase === 'launching') {
                    // Trajectory preview
                    mCtx.beginPath();
                    mCtx.setLineDash([4, 6]);
                    mCtx.strokeStyle = 'rgba(250, 204, 21, 0.2)';
                    mCtx.lineWidth = 1;
                    for (let t = 0; t <= 1; t += 0.05) {
                        const p = getMissilePos(m.source, m.target, t);
                        if (t === 0) mCtx.moveTo(p.x, p.y);
                        else mCtx.lineTo(p.x, p.y);
                    }
                    mCtx.stroke();
                    mCtx.setLineDash([]);
                }

                // Smoke trail
                m.smokeTrail.forEach((s) => {
                    mCtx.beginPath();
                    mCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                    mCtx.fillStyle = `rgba(${s.color}, ${s.alpha})`;
                    mCtx.fill();
                });

                if (m.phase === 'flying') {
                    const pos = getMissilePos(m.source, m.target, m.progress);
                    const angle = getMissileAngle(m.source, m.target, m.progress);

                    mCtx.save();
                    mCtx.translate(pos.x, pos.y);
                    mCtx.rotate(angle);

                    const mLen = 16;
                    const mW = 3;

                    mCtx.beginPath();
                    mCtx.moveTo(mLen, 0);
                    mCtx.lineTo(-mLen / 2, -mW);
                    mCtx.lineTo(-mLen / 2, mW);
                    mCtx.closePath();
                    mCtx.fillStyle = '#e2e8f0';
                    mCtx.fill();

                    // flame
                    const flameLen = 6 + Math.random() * 6;
                    mCtx.beginPath();
                    mCtx.moveTo(-mLen / 2, -2);
                    mCtx.lineTo(-mLen / 2 - flameLen, 0);
                    mCtx.lineTo(-mLen / 2, 2);
                    mCtx.closePath();
                    mCtx.fillStyle = `hsl(${30 + Math.random() * 20}, 100%, ${55 + Math.random() * 20}%)`;
                    mCtx.fill();
                    mCtx.restore();
                }

                if (m.phase === 'exploding' || m.phase === 'done') {
                    const t = m.explodeTime;
                    const targetPt = getPixelPos(m.target);

                    if (t < 60) {
                        const swAlpha = Math.max(0, 1 - t / 60);
                        mCtx.beginPath();
                        mCtx.arc(targetPt.x, targetPt.y, m.shockwaveRadius, 0, Math.PI * 2);
                        mCtx.strokeStyle = `rgba(255, 255, 255, ${swAlpha * 0.5})`;
                        mCtx.lineWidth = 2 + (1 - swAlpha) * 3;
                        mCtx.stroke();
                    }

                    if (t < 90) {
                        const fireAlpha = Math.max(0, 1 - t / 90);
                        const fireR = 10 + t;

                        const fireGrad = mCtx.createRadialGradient(targetPt.x, targetPt.y, 0, targetPt.x, targetPt.y, fireR);
                        fireGrad.addColorStop(0, `rgba(255, 255, 200, ${fireAlpha})`);
                        fireGrad.addColorStop(0.3, `rgba(255, 200, 50, ${fireAlpha * 0.9})`);
                        fireGrad.addColorStop(0.6, `rgba(255, 80, 0, ${fireAlpha * 0.7})`);
                        fireGrad.addColorStop(1, `rgba(180, 30, 0, 0)`);
                        mCtx.beginPath();
                        mCtx.arc(targetPt.x, targetPt.y, fireR, 0, Math.PI * 2);
                        mCtx.fillStyle = fireGrad;
                        mCtx.fill();
                    }

                    if (t > 20 && t < 150) {
                        const smokeAlpha = Math.min(1, (t - 20) / 30) * Math.max(0, 1 - (t - 20) / 130);
                        for (let i = 0; i < 4; i++) {
                            const smokeY = targetPt.y - i * 12 - (t - 20) * 0.4;
                            const smokeR = 8 + i * 4 + Math.sin(t / 10 + i) * 2;
                            const sAlpha = smokeAlpha * (1 - i / 4) * 0.3;
                            mCtx.beginPath();
                            mCtx.arc(targetPt.x + Math.sin(t / 10 + i * 2) * 4, smokeY, smokeR, 0, Math.PI * 2);
                            mCtx.fillStyle = `rgba(80, 80, 80, ${sAlpha})`;
                            mCtx.fill();
                        }
                    }
                }
            });

            // Shared particles
            simState.explodeParticles.forEach(p => {
                if (p.alpha <= 0) return;
                mCtx.beginPath();
                mCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                mCtx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
                mCtx.fill();
            });

            if (simState.flashAlpha > 0) {
                mCtx.fillStyle = `rgba(255, 255, 255, ${simState.flashAlpha})`;
                mCtx.fillRect(-20, -20, missileCanvas.width + 40, missileCanvas.height + 40);
            }

            mCtx.restore();
        }

        function createExplosionParticles(targetLoc) {
            const target = getPixelPos(targetLoc);
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 4;
                const type = Math.random();
                let color;
                if (type < 0.3) color = '255, 220, 50';
                else if (type < 0.6) color = '255, 100, 20';
                else if (type < 0.8) color = '255, 50, 10';
                else color = '120, 120, 120';

                simState.explodeParticles.push({
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - Math.random() * 2,
                    r: 1 + Math.random() * 2,
                    alpha: 0.8 + Math.random() * 0.2,
                    decay: 0.01 + Math.random() * 0.015,
                    color: color,
                    gravity: 0.05
                });
            }
        }

        function startScenario(scenario) {
            if (simState.active) return;

            simState.active = true;
            simState.phase = 'running';
            simState.frame = 0;
            simState.explodeParticles = [];
            simState.screenShake = 0;
            simState.flashAlpha = 0;
            simState.missiles = [];

            missileStatusEl.textContent = 'STRIKE INITIATED';
            missileStatusEl.style.color = '#facc15';
            launchBtnIndPak.style.opacity = '0.4';
            launchBtnIndPak.style.pointerEvents = 'none';
            launchBtnME.style.opacity = '0.4';
            launchBtnME.style.pointerEvents = 'none';

            if (scenario === 'ind-pak') {
                simState.missiles.push({
                    source: LOC.india, target: LOC.pakistan,
                    progress: 0, phase: 'launching', launchDelay: 20, explodeTime: 0,
                    smokeTrail: [], shockwaveRadius: 0
                });
            } else if (scenario === 'me') {
                simState.missiles.push({
                    source: LOC.iran, target: LOC.israel,
                    progress: 0, phase: 'launching', launchDelay: 10, explodeTime: 0,
                    smokeTrail: [], shockwaveRadius: 0
                });
                simState.missiles.push({
                    source: LOC.iran, target: LOC.uae,
                    progress: 0, phase: 'launching', launchDelay: 40, explodeTime: 0,
                    smokeTrail: [], shockwaveRadius: 0
                });
                simState.missiles.push({
                    source: LOC.iran, target: LOC.saudi,
                    progress: 0, phase: 'launching', launchDelay: 70, explodeTime: 0,
                    smokeTrail: [], shockwaveRadius: 0
                });
                simState.missiles.push({
                    source: LOC.israel, target: LOC.iran,
                    progress: 0, phase: 'launching', launchDelay: 120, explodeTime: 0,
                    smokeTrail: [], shockwaveRadius: 0
                });
                simState.missiles.push({
                    source: LOC.kuwait, target: LOC.iran,
                    progress: 0, phase: 'launching', launchDelay: 150, explodeTime: 0,
                    smokeTrail: [], shockwaveRadius: 0
                });
            }

            function animateMissiles() {
                if (!simState.active) return;
                simState.frame++;

                let allDone = true;
                let anyImpact = false;

                simState.missiles.forEach(m => {
                    if (m.phase === 'launching') {
                        allDone = false;
                        m.launchDelay--;
                        if (m.launchDelay <= 0) {
                            m.phase = 'flying';
                        }
                    }

                    if (m.phase === 'flying') {
                        allDone = false;
                        m.progress += 0.005; // flight speed

                        const pos = getMissilePos(m.source, m.target, m.progress);
                        const angle = getMissileAngle(m.source, m.target, m.progress);
                        m.smokeTrail.push({
                            x: pos.x - Math.cos(angle) * 10 + (Math.random() - 0.5) * 4,
                            y: pos.y - Math.sin(angle) * 10 + (Math.random() - 0.5) * 4,
                            r: 1.5 + Math.random() * 2,
                            alpha: 0.5,
                            color: '200, 200, 200'
                        });

                        if (m.progress >= 1) {
                            m.phase = 'exploding';
                            m.explodeTime = 0;
                            createExplosionParticles(m.target);
                            simState.flashAlpha = 0.6;
                            simState.screenShake = 0.8;
                            anyImpact = true;
                        }
                    }

                    if (m.phase === 'exploding') {
                        allDone = false;
                        m.explodeTime++;
                        m.shockwaveRadius += 3;
                        if (m.explodeTime > 180) {
                            m.phase = 'done';
                        }
                    }

                    // Fade smoke trail
                    m.smokeTrail.forEach(s => {
                        s.alpha -= 0.008;
                        s.r += 0.1;
                    });
                    m.smokeTrail = m.smokeTrail.filter(s => s.alpha > 0);
                });

                if (anyImpact) {
                    missileStatusEl.textContent = 'IMPACT DETECTED';
                    missileStatusEl.style.color = '#ef4444';
                }

                simState.flashAlpha = Math.max(0, simState.flashAlpha - 0.04);
                simState.screenShake = Math.max(0, simState.screenShake - 0.015);

                simState.explodeParticles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += p.gravity;
                    p.alpha -= p.decay;
                    p.vx *= 0.98;
                    p.vy *= 0.98;
                });

                if (allDone && simState.explodeParticles.every(p => p.alpha <= 0)) {
                    simState.active = false;
                    simState.phase = 'idle';
                    missileStatusEl.textContent = 'STANDBY';
                    missileStatusEl.style.color = '#22c55e';
                    launchBtnIndPak.style.opacity = '1';
                    launchBtnIndPak.style.pointerEvents = 'auto';
                    launchBtnME.style.opacity = '1';
                    launchBtnME.style.pointerEvents = 'auto';
                }

                drawMissileScene();

                if (simState.active) {
                    missileAnimId = requestAnimationFrame(animateMissiles);
                } else {
                    idleLoop();
                }
            }

            cancelAnimationFrame(missileAnimId);
            missileAnimId = requestAnimationFrame(animateMissiles);
        }

        if (launchBtnIndPak) {
            launchBtnIndPak.addEventListener('click', () => {
                startScenario('ind-pak');
            });
        }
        if (launchBtnME) {
            launchBtnME.addEventListener('click', () => {
                startScenario('me');
            });
        }

        function idleLoop() {
            if (!simState.active) {
                drawMissileScene();
                missileAnimId = requestAnimationFrame(idleLoop);
            }
        }

        window.addEventListener('resize', resizeMissileCanvas);
        resizeMissileCanvas();
        idleLoop();
    }

    // --- DRONE INTERCEPTION SIMULATION (Slide 22) ---
    const intCanvas = document.getElementById('interceptionCanvas');
    if (intCanvas) {
        const intCtx = intCanvas.getContext('2d');
        const intStatusEl = document.getElementById('interceptionStatus');
        const launchIntBtn = document.getElementById('launchInterceptionBtn');

        const LOC = {
            india: { x: 0.72, y: 0.52, name: 'INDIA' },
            pakistan: { x: 0.60, y: 0.33, name: 'PAKISTAN' }
        };

        let intState = {
            active: false,
            frame: 0,
            drone: null,
            interceptor: null,
            explodeParticles: [],
            explodeTime: 0,
            flashAlpha: 0,
            screenShake: 0
        };

        let intAnimId;

        function resizeIntCanvas() {
            intCanvas.width = intCanvas.parentElement.clientWidth;
            intCanvas.height = intCanvas.parentElement.clientHeight;
            drawIntScene();
        }

        function getIntPixelPos(loc) {
            return {
                x: intCanvas.width * loc.x,
                y: intCanvas.height * loc.y
            };
        }

        function getIntMissilePos(startLoc, endLoc, t, arcHeight = 0.25) {
            const start = getIntPixelPos(startLoc);
            const end = getIntPixelPos(endLoc);
            const cpX = (start.x + end.x) / 2;
            const cpY = Math.min(start.y, end.y) - intCanvas.height * arcHeight;

            const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cpX + t * t * end.x;
            const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cpY + t * t * end.y;
            return { x, y };
        }

        function getIntAngle(startLoc, endLoc, t) {
            const dt = 0.001;
            const t2 = Math.min(t + dt, 1);
            const p1 = getIntMissilePos(startLoc, endLoc, t);
            const p2 = getIntMissilePos(startLoc, endLoc, t2);
            return Math.atan2(p2.y - p1.y, p2.x - p1.x);
        }

        function getStraightPos(startLoc, targetPixel, t) {
            const start = getIntPixelPos(startLoc);
            const x = start.x + (targetPixel.x - start.x) * t;
            const y = start.y + (targetPixel.y - start.y) * t;
            return { x, y };
        }

        function drawIntScene() {
            intCtx.clearRect(0, 0, intCanvas.width, intCanvas.height);

            let shakeX = 0, shakeY = 0;
            if (intState.screenShake > 0) {
                shakeX = (Math.random() - 0.5) * intState.screenShake * 12;
                shakeY = (Math.random() - 0.5) * intState.screenShake * 12;
            }

            intCtx.save();
            intCtx.translate(shakeX, shakeY);

            if (window.satMapImgLoaded2) {
                intCtx.drawImage(window.satMapImg2, 0, 0, intCanvas.width, intCanvas.height);
                intCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                intCtx.fillRect(0, 0, intCanvas.width, intCanvas.height);
            } else {
                intCtx.fillStyle = '#111';
                intCtx.fillRect(0, 0, intCanvas.width, intCanvas.height);
            }

            // Draw markers
            [LOC.india, LOC.pakistan].forEach(loc => {
                const pt = getIntPixelPos(loc);
                intCtx.beginPath();
                intCtx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
                intCtx.fillStyle = loc.name === 'PAKISTAN' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)';
                intCtx.fill();
                intCtx.strokeStyle = loc.name === 'PAKISTAN' ? '#ef4444' : '#22c55e';
                intCtx.lineWidth = 2;
                intCtx.stroke();

                intCtx.font = "bold 11px 'Courier New', monospace";
                intCtx.fillStyle = intCtx.strokeStyle;
                intCtx.fillText(loc.name, pt.x + 12, pt.y - 6);
            });

            // Drone Trail
            if (intState.drone) {
                intState.drone.smokeTrail.forEach(s => {
                    intCtx.beginPath();
                    intCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                    intCtx.fillStyle = `rgba(${s.color}, ${s.alpha})`;
                    intCtx.fill();
                });
            }

            // Interceptor Trail
            if (intState.interceptor) {
                intState.interceptor.smokeTrail.forEach(s => {
                    intCtx.beginPath();
                    intCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                    intCtx.fillStyle = `rgba(${s.color}, ${s.alpha})`;
                    intCtx.fill();
                });
            }

            // Draw Drone
            if (intState.drone && intState.drone.phase === 'flying') {
                const pos = getIntMissilePos(intState.drone.source, intState.drone.target, intState.drone.progress);
                const angle = getIntAngle(intState.drone.source, intState.drone.target, intState.drone.progress);
                
                intCtx.save();
                intCtx.translate(pos.x, pos.y);
                intCtx.rotate(angle);
                
                intCtx.beginPath();
                intCtx.moveTo(12, 0);
                intCtx.lineTo(-8, -6);
                intCtx.lineTo(-4, 0);
                intCtx.lineTo(-8, 6);
                intCtx.closePath();
                intCtx.fillStyle = '#ef4444';
                intCtx.fill();
                intCtx.restore();
                
                // Drone target reticle
                intCtx.beginPath();
                intCtx.arc(pos.x, pos.y, 20, 0, Math.PI*2);
                intCtx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
                intCtx.setLineDash([4, 4]);
                intCtx.stroke();
                intCtx.setLineDash([]);
            }

            // Draw Interceptor
            if (intState.interceptor && intState.interceptor.phase === 'flying') {
                const targetPixel = getIntMissilePos(intState.drone.source, intState.drone.target, 0.65);
                const pos = getStraightPos(intState.interceptor.source, targetPixel, intState.interceptor.progress);
                const startPixel = getIntPixelPos(intState.interceptor.source);
                const angle = Math.atan2(targetPixel.y - startPixel.y, targetPixel.x - startPixel.x);
                
                intCtx.save();
                intCtx.translate(pos.x, pos.y);
                intCtx.rotate(angle);
                intCtx.beginPath();
                intCtx.moveTo(10, 0);
                intCtx.lineTo(-6, -2);
                intCtx.lineTo(-6, 2);
                intCtx.closePath();
                intCtx.fillStyle = '#3b82f6';
                intCtx.fill();
                
                intCtx.beginPath();
                intCtx.moveTo(-6, -1);
                intCtx.lineTo(-14 - Math.random()*5, 0);
                intCtx.lineTo(-6, 1);
                intCtx.fillStyle = '#60a5fa';
                intCtx.fill();
                intCtx.restore();
            }

            // Explosion
            if (intState.explodeTime > 0) {
                const t = intState.explodeTime;
                const targetPixel = getIntMissilePos(LOC.pakistan, LOC.india, 0.65);
                
                if (t < 40) {
                    const swAlpha = Math.max(0, 1 - t / 40);
                    intCtx.beginPath();
                    intCtx.arc(targetPixel.x, targetPixel.y, t * 3, 0, Math.PI * 2);
                    intCtx.strokeStyle = `rgba(59, 130, 246, ${swAlpha})`;
                    intCtx.lineWidth = 4;
                    intCtx.stroke();
                }
                
                if (t < 60) {
                    const fireAlpha = Math.max(0, 1 - t / 60);
                    intCtx.beginPath();
                    intCtx.arc(targetPixel.x, targetPixel.y, 20 + t, 0, Math.PI * 2);
                    intCtx.fillStyle = `rgba(255, 150, 50, ${fireAlpha})`;
                    intCtx.fill();
                }
            }
            
            // Particles
            intState.explodeParticles.forEach(p => {
                if (p.alpha <= 0) return;
                intCtx.beginPath();
                intCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                intCtx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
                intCtx.fill();
            });

            if (intState.flashAlpha > 0) {
                intCtx.fillStyle = `rgba(255, 255, 255, ${intState.flashAlpha})`;
                intCtx.fillRect(-20, -20, intCanvas.width + 40, intCanvas.height + 40);
            }

            intCtx.restore();
        }

        function createIntExplosionParticles(target) {
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 6;
                let color = Math.random() < 0.5 ? '255, 200, 50' : '59, 130, 246';
                intState.explodeParticles.push({
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - Math.random() * 2,
                    r: 2 + Math.random() * 3,
                    alpha: 1,
                    decay: 0.02 + Math.random() * 0.02,
                    color: color,
                    gravity: 0.05
                });
            }
        }

        function startIntScenario() {
            if (intState.active) return;

            intState.active = true;
            intState.frame = 0;
            intState.explodeParticles = [];
            intState.screenShake = 0;
            intState.flashAlpha = 0;
            intState.explodeTime = 0;

            intState.drone = { source: LOC.pakistan, target: LOC.india, progress: 0, phase: 'flying', smokeTrail: [] };
            intState.interceptor = null;

            intStatusEl.textContent = 'THREAT DETECTED';
            intStatusEl.style.color = '#ef4444';
            launchIntBtn.style.opacity = '0.4';
            launchIntBtn.style.pointerEvents = 'none';

            function animateInt() {
                if (!intState.active) return;
                intState.frame++;

                if (intState.drone && intState.drone.phase === 'flying') {
                    intState.drone.progress += 0.003;

                    const pos = getIntMissilePos(intState.drone.source, intState.drone.target, intState.drone.progress);
                    const angle = getIntAngle(intState.drone.source, intState.drone.target, intState.drone.progress);
                    intState.drone.smokeTrail.push({
                        x: pos.x - Math.cos(angle) * 10 + (Math.random() - 0.5) * 4,
                        y: pos.y - Math.sin(angle) * 10 + (Math.random() - 0.5) * 4,
                        r: 1.5 + Math.random() * 2,
                        alpha: 0.5,
                        color: '150, 150, 150'
                    });

                    let interceptT = 0.65;
                    let interceptFrame = interceptT / 0.003;
                    let interceptorFlightFrames = 80;
                    
                    if (intState.frame === Math.floor(interceptFrame - interceptorFlightFrames)) {
                        intState.interceptor = { 
                            source: LOC.india, 
                            progress: 0, 
                            phase: 'flying', 
                            smokeTrail: [] 
                        };
                        intStatusEl.textContent = 'INTERCEPTOR LAUNCHED';
                        intStatusEl.style.color = '#3b82f6';
                    }
                }

                if (intState.interceptor && intState.interceptor.phase === 'flying') {
                    intState.interceptor.progress += (1 / 80);
                    
                    const targetPixel = getIntMissilePos(intState.drone.source, intState.drone.target, 0.65);
                    const pos = getStraightPos(intState.interceptor.source, targetPixel, intState.interceptor.progress);
                    const startPixel = getIntPixelPos(intState.interceptor.source);
                    const angle = Math.atan2(targetPixel.y - startPixel.y, targetPixel.x - startPixel.x);

                    intState.interceptor.smokeTrail.push({
                        x: pos.x - Math.cos(angle) * 10 + (Math.random() - 0.5) * 2,
                        y: pos.y - Math.sin(angle) * 10 + (Math.random() - 0.5) * 2,
                        r: 1.5 + Math.random() * 2,
                        alpha: 0.7,
                        color: '200, 220, 255'
                    });

                    if (intState.interceptor.progress >= 1) {
                        intState.interceptor.phase = 'done';
                        intState.drone.phase = 'destroyed';
                        intState.explodeTime = 1;
                        createIntExplosionParticles(targetPixel);
                        intState.flashAlpha = 0.8;
                        intState.screenShake = 1.0;
                        intStatusEl.textContent = 'THREAT NEUTRALIZED';
                        intStatusEl.style.color = '#22c55e';
                    }
                }

                // Update trails
                if (intState.drone) {
                    intState.drone.smokeTrail.forEach(s => { s.alpha -= 0.01; s.r += 0.1; });
                    intState.drone.smokeTrail = intState.drone.smokeTrail.filter(s => s.alpha > 0);
                }
                if (intState.interceptor) {
                    intState.interceptor.smokeTrail.forEach(s => { s.alpha -= 0.01; s.r += 0.1; });
                    intState.interceptor.smokeTrail = intState.interceptor.smokeTrail.filter(s => s.alpha > 0);
                }

                // Update particles
                intState.explodeParticles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += p.gravity;
                    p.alpha -= p.decay;
                    p.vx *= 0.98;
                    p.vy *= 0.98;
                });

                if (intState.explodeTime > 0) {
                    intState.explodeTime++;
                    if (intState.explodeTime > 150 && intState.explodeParticles.every(p => p.alpha <= 0)) {
                        intState.active = false;
                        intStatusEl.textContent = 'STANDBY';
                        intStatusEl.style.color = '#22c55e';
                        launchIntBtn.style.opacity = '1';
                        launchIntBtn.style.pointerEvents = 'auto';
                    }
                }

                intState.flashAlpha = Math.max(0, intState.flashAlpha - 0.04);
                intState.screenShake = Math.max(0, intState.screenShake - 0.015);

                drawIntScene();

                if (intState.active) {
                    intAnimId = requestAnimationFrame(animateInt);
                } else {
                    intIdleLoop();
                }
            }

            cancelAnimationFrame(intAnimId);
            intAnimId = requestAnimationFrame(animateInt);
        }

        if (launchIntBtn) {
            launchIntBtn.addEventListener('click', startIntScenario);
        }

        function intIdleLoop() {
            if (!intState.active) {
                drawIntScene();
                intAnimId = requestAnimationFrame(intIdleLoop);
            }
        }

        window.satMapImg2 = new Image();
        window.satMapImg2.src = 'satel_map.png';
        window.satMapImgLoaded2 = false;
        window.satMapImg2.onload = () => {
            window.satMapImgLoaded2 = true;
            resizeIntCanvas();
        };

        window.addEventListener('resize', resizeIntCanvas);
        resizeIntCanvas();
        intIdleLoop();
    }

});
