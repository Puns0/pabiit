$file = "d:\Projects\PABIT\public\robotics-and-ai-drones.html"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# ============================================================
# SLIDE 15 (Applications of AI Drones) - Convert to vertical cards
# ============================================================
# Change cards from horizontal flex to vertical flex-col
# Old pattern: flex card with inline-styled 220x220 image-container + text beside it
# New pattern: flex-col card with img-card-top on top + text below

# Replace the 4 app cards on slide 15
# Card 1: Agriculture
$c = $c.Replace(
    '<div class="app-card shadow-sm border rounded-lg bg-white overflow-hidden hover-lift flex gs-reveal align-center">
                        <div class="image-container" style="width: 220px; height: 220px; flex-shrink: 0;">
                            <img src="drone-agriculture.jpg" alt="Drone in agriculture" class="responsive-img object-cover w-full h-full" onerror="this.outerHTML=''<div class=\''placeholder w-full h-full bg-green-50\''><i class=\''fas fa-leaf text-green-600 text-xl mb-1\''></i><p class=\''text-xs\''>Agri Drone</p><code>drone-agri...</code></div>''" />
                        </div>
                        <div class="p-3" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">Precision Agriculture</h3>
                            <p class="text-gray-600 text-xs">Crop health monitoring &amp; disease detection via multispectral AI Vision. Automatically determining optimal irrigation. <br><em class="text-gray-400" style="font-size: 0.7rem;">Note: Spraying is automation; knowing *where* to spray is AI.</em></p>
                        </div>
                    </div>',
    '<div class="app-card shadow-sm border rounded-lg bg-white overflow-hidden hover-lift flex-col gs-reveal">
                        <div class="img-card-top image-container">
                            <img src="drone-agriculture.jpg" alt="Drone in agriculture" class="responsive-img object-cover w-full h-full" onerror="this.outerHTML=''<div class=\''placeholder h-full bg-green-50\''><i class=\''fas fa-leaf text-green-600 text-xl mb-1\''></i><p class=\''text-xs\''>Agri Drone</p><code>drone-agriculture.jpg</code></div>''" />
                        </div>
                        <div class="p-4" style="flex: 1;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">Precision Agriculture</h3>
                            <p class="text-gray-600 text-xs">Crop health monitoring &amp; disease detection via multispectral AI Vision. Automatically determining optimal irrigation. <br><em class="text-gray-400" style="font-size: 0.7rem;">Note: Spraying is automation; knowing *where* to spray is AI.</em></p>
                        </div>
                    </div>'
)

# Card 2: Disaster Management
$c = $c.Replace(
    '<div class="app-card shadow-sm border rounded-lg bg-white overflow-hidden hover-lift flex gs-reveal align-center">
                        <div class="image-container" style="width: 220px; height: 220px; flex-shrink: 0;">
                            <img src="drone-disaster.jpg" alt="Drone in disaster management" class="responsive-img object-cover w-full h-full" onerror="this.outerHTML=''<div class=\''placeholder w-full h-full bg-red-50\''><i class=\''fas fa-medkit text-red-600 text-xl mb-1\''></i><p class=\''text-xs\''>Disaster</p><code>drone-disaster...</code></div>''" />
                        </div>
                        <div class="p-3" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">Disaster Management</h3>
                            <p class="text-gray-600 text-xs">Autonomous search and rescue in unmapped, hazardous areas. Using thermal imaging combined with AI survivor detection algorithms to find humans in rubble.</p>
                        </div>
                    </div>',
    '<div class="app-card shadow-sm border rounded-lg bg-white overflow-hidden hover-lift flex-col gs-reveal">
                        <div class="img-card-top image-container">
                            <img src="drone-disaster.jpg" alt="Drone in disaster management" class="responsive-img object-cover w-full h-full" onerror="this.outerHTML=''<div class=\''placeholder h-full bg-red-50\''><i class=\''fas fa-medkit text-red-600 text-xl mb-1\''></i><p class=\''text-xs\''>Disaster</p><code>drone-disaster.jpg</code></div>''" />
                        </div>
                        <div class="p-4" style="flex: 1;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">Disaster Management</h3>
                            <p class="text-gray-600 text-xs">Autonomous search and rescue in unmapped, hazardous areas. Using thermal imaging combined with AI survivor detection algorithms to find humans in rubble.</p>
                        </div>
                    </div>'
)

# Card 3: Delivery
$c = $c.Replace(
    '<div class="app-card shadow-sm border rounded-lg bg-white overflow-hidden hover-lift flex gs-reveal align-center">
                        <div class="image-container" style="width: 220px; height: 220px; flex-shrink: 0;">
                            <img src="drone-delivery.jpg" alt="Drone delivery" class="responsive-img object-cover w-full h-full" onerror="this.outerHTML=''<div class=\''placeholder w-full h-full bg-blue-50\''><i class=\''fas fa-box-open text-blue-600 text-xl mb-1\''></i><p class=\''text-xs\''>Delivery</p><code>drone-delivery...</code></div>''" />
                        </div>
                        <div class="p-3" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">Delivery Logistics</h3>
                            <p class="text-gray-600 text-xs">Autonomous medical and package delivery over dense urban areas. AI is required to identify safe drop zones and avoid moving obstacles like birds and power lines.</p>
                        </div>
                    </div>',
    '<div class="app-card shadow-sm border rounded-lg bg-white overflow-hidden hover-lift flex-col gs-reveal">
                        <div class="img-card-top image-container">
                            <img src="drone-delivery.jpg" alt="Drone delivery" class="responsive-img object-cover w-full h-full" onerror="this.outerHTML=''<div class=\''placeholder h-full bg-blue-50\''><i class=\''fas fa-box-open text-blue-600 text-xl mb-1\''></i><p class=\''text-xs\''>Delivery</p><code>drone-delivery.jpg</code></div>''" />
                        </div>
                        <div class="p-4" style="flex: 1;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">Delivery Logistics</h3>
                            <p class="text-gray-600 text-xs">Autonomous medical and package delivery over dense urban areas. AI is required to identify safe drop zones and avoid moving obstacles like birds and power lines.</p>
                        </div>
                    </div>'
)

# Card 4: Infrastructure Inspection
$c = $c.Replace(
    '<div class="app-card shadow-sm border rounded-lg bg-white overflow-hidden hover-lift flex gs-reveal align-center">
                        <div class="image-container" style="width: 220px; height: 220px; flex-shrink: 0;">
                            <img src="drone-inspection.jpg" alt="Infrastructure inspection" class="responsive-img object-cover w-full h-full" onerror="this.outerHTML=''<div class=\''placeholder w-full h-full bg-orange-50\''><i class=\''fas fa-bridge text-orange-600 text-xl mb-1\''></i><p class=\''text-xs\''>Inspection</p><code>drone-inspect...</code></div>''" />
                        </div>
                        <div class="p-3" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">Infrastructure Inspection</h3>
                            <p class="text-gray-600 text-xs">AI-based micro-crack or corrosion detection on massive bridges, high-voltage power lines, and oil pipelines, replacing dangerous human labor.</p>
                        </div>
                    </div>',
    '<div class="app-card shadow-sm border rounded-lg bg-white overflow-hidden hover-lift flex-col gs-reveal">
                        <div class="img-card-top image-container">
                            <img src="drone-inspection.jpg" alt="Infrastructure inspection" class="responsive-img object-cover w-full h-full" onerror="this.outerHTML=''<div class=\''placeholder h-full bg-orange-50\''><i class=\''fas fa-bridge text-orange-600 text-xl mb-1\''></i><p class=\''text-xs\''>Inspection</p><code>drone-inspection.jpg</code></div>''" />
                        </div>
                        <div class="p-4" style="flex: 1;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">Infrastructure Inspection</h3>
                            <p class="text-gray-600 text-xs">AI-based micro-crack or corrosion detection on massive bridges, high-voltage power lines, and oil pipelines, replacing dangerous human labor.</p>
                        </div>
                    </div>'
)

# ============================================================
# SLIDE 9 (Real-World AI Robots) - Convert to vertical cards
# ============================================================
# All 4 cards use: class="card ... flex" with inline style="width: 180px; height: 180px; flex-shrink: 0;"
# Convert to: class="card ... flex-col" with img-card-top

$c = $c.Replace(
    '<div class="card shadow-sm border rounded-xl overflow-hidden bg-white hover-lift flex gs-reveal">
                        <div class="image-container" style="width: 180px; height: 180px; flex-shrink: 0;">',
    '<div class="card shadow-sm border rounded-xl overflow-hidden bg-white hover-lift flex-col gs-reveal">
                        <div class="img-card-top image-container">'
)

# Fix the text divs for slide 9 (they had flex:1 inline)
$c = $c.Replace(
    '<div class="p-4" style="flex: 1;">
                            <h3 class="text-primary-dark mb-1 font-bold">Spot',
    '<div class="p-4 flex-1">
                            <h3 class="text-primary-dark mb-1 font-bold">Spot'
)
$c = $c.Replace(
    '<div class="p-4" style="flex: 1;">
                            <h3 class="text-alert mb-1 font-bold">Da Vinci',
    '<div class="p-4 flex-1">
                            <h3 class="text-alert mb-1 font-bold">Da Vinci'
)
$c = $c.Replace(
    '<div class="p-4" style="flex: 1;">
                            <h3 class="text-secondary mb-1 font-bold">Perseverance',
    '<div class="p-4 flex-1">
                            <h3 class="text-secondary mb-1 font-bold">Perseverance'
)
$c = $c.Replace(
    '<div class="p-4" style="flex: 1;">
                            <h3 class="text-gray-800 mb-1 font-bold">Atlas',
    '<div class="p-4 flex-1">
                            <h3 class="text-gray-800 mb-1 font-bold">Atlas'
)

# ============================================================
# SLIDE 18 (Healthcare) - Convert to vertical cards
# ============================================================
# These use: style="width: 200px; height: 200px; flex-shrink: 0;"
$c = $c.Replace(
    '<div class="card shadow-sm border rounded-xl overflow-hidden bg-white hover-lift flex gs-reveal">
                        <div class="image-container" style="width: 200px; height: 200px; flex-shrink: 0;">',
    '<div class="card shadow-sm border rounded-xl overflow-hidden bg-white hover-lift flex-col gs-reveal">
                        <div class="img-card-top image-container">'
)

# Fix the text divs for slide 18 (they had flex:1 + flex-direction inline)
$c = $c.Replace(
    '<div class="p-4" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                            <h3 class="text-alert mb-1 font-bold" style="font-size: 1.2rem;">Surgical',
    '<div class="p-4 flex-1">
                            <h3 class="text-alert mb-1 font-bold" style="font-size: 1.2rem;">Surgical'
)
$c = $c.Replace(
    '<div class="p-4" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                            <h3 class="text-secondary mb-1 font-bold" style="font-size: 1.2rem;">Rehabilitation',
    '<div class="p-4 flex-1">
                            <h3 class="text-secondary mb-1 font-bold" style="font-size: 1.2rem;">Rehabilitation'
)
$c = $c.Replace(
    '<div class="p-4" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                            <h3 class="text-primary mb-1 font-bold" style="font-size: 1.2rem;">Hospital',
    '<div class="p-4 flex-1">
                            <h3 class="text-primary mb-1 font-bold" style="font-size: 1.2rem;">Hospital'
)
$c = $c.Replace(
    '<div class="p-4" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">AI-Powered',
    '<div class="p-4 flex-1">
                            <h3 class="text-gray-800 mb-1 font-bold" style="font-size: 1.2rem;">AI-Powered'
)

[System.IO.File]::WriteAllText($file, $c, (New-Object System.Text.UTF8Encoding $true))
Write-Host "Done! All image cards converted to vertical layout."
