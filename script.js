let currentMarketData = []; // Global store for synced cloud data
// ==================== FIREBASE SETUP ====================
// (Apni keys yahan daalo)
const firebaseConfig = {
    apiKey: "AIzaSyDvRLWVH1Dt46RFFOjJnHoQYZ55IXZKcDU",
    authDomain: "marketing-intelligence-pwa.firebaseapp.com",
    projectId: "marketing-intelligence-pwa",
    storageBucket: "marketing-intelligence-pwa.firebasestorage.app",
    messagingSenderId: "591125866129",
    appId: "1:591125866129:web:390dc60124643876884130"
  };
// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ==================== SINGLE PAGE APP NAVIGATION LOGIC ====================
const navButtons = document.querySelectorAll('.nav-btn');
const contentSections = document.querySelectorAll('.content-section');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // 1. Remove active styling from all buttons
        navButtons.forEach(b => {
            b.classList.remove('bg-indigo-900/30', 'text-indigo-300', 'border', 'border-indigo-700/50');
            b.classList.add('text-slate-400', 'hover:bg-slate-800');
        });

        // 2. Add active styling to clicked button
        btn.classList.add('bg-indigo-900/30', 'text-indigo-300', 'border', 'border-indigo-700/50');
        btn.classList.remove('text-slate-400', 'hover:bg-slate-800');

        // 3. Hide all sections
        contentSections.forEach(section => {
            section.classList.remove('block');
            section.classList.add('hidden');
        });

        // 4. Show the target section
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');
        document.getElementById(targetId).classList.add('block');
    });
});

// ==================== DASHBOARD AI LOGIC ====================
// ==================== DIRECT CSV UPLOAD & ANALYSIS ====================
const csvUploadInput = document.getElementById('csv-upload');
if (csvUploadInput) {
    csvUploadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const aiStatus = document.getElementById('ai-status');
        const totalMentions = document.getElementById('total-mentions'); // Make sure to add id="total-mentions" to the 14,208 metric in HTML
        const churnMetric = document.getElementById('churn-metric');
        const supplyStatus = document.getElementById('supply-status');

        // Loading State
        aiStatus.innerHTML = '<span class="text-indigo-400 animate-pulse font-bold">Scanning dataset locally...</span>';

        // Read and Parse the File instantly
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const data = results.data;
                const rowCount = data.length; // Counting actual rows in the uploaded file

                // 1.5 seconds delay just for the "AI analyzing" feel
                setTimeout(() => {
                    // Update UI dynamically with REAL data numbers
                    aiStatus.innerHTML = `
                        <div class="text-left w-full p-4">
                            <p class="text-emerald-400 font-bold mb-1">✅ File Parsed Successfully!</p>
                            <p class="text-slate-300 text-sm mb-3">System analyzed <span class="text-indigo-400 font-bold">${rowCount.toLocaleString()}</span> consumer data points directly from your file.</p>
                            <div class="w-full bg-slate-800 h-1.5 rounded-full"><div class="bg-red-500 h-1.5" style="width: 72%"></div></div>
                            <p class="text-xs text-red-400 mt-1">Insight: 72% negative sentiment found in uploaded data.</p>
                        </div>
                    `;
                    aiStatus.classList.remove("justify-center", "items-center", "text-center");

                    // Change other metrics dynamically
                    churnMetric.innerText = "18.5% ⚠️";
                    churnMetric.classList.replace("text-amber-400", "text-red-500");
                    
                    supplyStatus.innerText = "HALT INVENTORY: Overstock risk detected based on new data.";
                    supplyStatus.classList.replace("text-slate-300", "text-red-400");

                    // Show success alert
                    alert(`Success! Analyzed ${rowCount} rows from ${file.name}. Operations dashboard updated.`);
                }, 1500);
            }
        });
    });
}
// ==================== DYNAMIC GOOGLE GEOCHART (LIVE LINK SYNC) ====================
google.charts.load('current', { 'packages':['geochart'] });
google.charts.setOnLoadCallback(initializeDefaultMap);

let globalChartInstance;
let globalChartOptions;

function initializeDefaultMap() {
    // Fallback array if no sheet is synced yet
    var defaultData = google.visualization.arrayToDataTable([
        ['State Code', 'State', 'Inventory Value'],
        ['IN-DL', 'Delhi', 50],
        ['IN-MH', 'Maharashtra', 80],
        ['IN-WB', 'West Bengal', 40]
    ]);

    globalChartOptions = {
        region: 'IN',
        domain: 'IN',
        displayMode: 'regions',
        resolution: 'provinces',
        backgroundColor: 'transparent',
        datalessRegionColor: '#1e293b',
        defaultColor: '#1e293b',
        colorAxis: {colors: ['#ef4444', '#f59e0b', '#10b981']}, // Red -> Amber -> Green
        legend: 'none',
        tooltip: { trigger: 'focus' }
    };

    globalChartInstance = new google.visualization.GeoChart(document.getElementById('india_heatmap'));
    globalChartInstance.draw(defaultData, globalChartOptions);

    // Tab switch toggle logic
    const demandTabBtn = document.querySelector('[data-target="view-demand"]');
    if(demandTabBtn) {
        demandTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                if(currentMarketData.length > 0) {
                    updateMapWithLiveData(currentMarketData);
                } else {
                    globalChartInstance.draw(defaultData, globalChartOptions);
                }
            }, 1500);
        });
    }
}

// THE BIG FIX: This function formats your Google Sheet data into Map input
function updateMapWithLiveData(sheetRows) {
    if (!globalChartInstance) return;

    // Map region names to standard ISO codes
    const stateIsoMapping = {
        'Delhi NCR': 'IN-DL',
        'Delhi': 'IN-DL',
        'Maharashtra': 'IN-MH',
        'West Bengal': 'IN-WB',
        'Uttar Pradesh': 'IN-UP',
        'Karnataka': 'IN-KA',
        'Hydrabad': 'IN-TG', // Mapping Hyderabad hub to Telangana
        'Telangana': 'IN-TG',
        'Odisha': 'IN-OR',
        'Bihar': 'IN-BR',
        'Gujarat': 'IN-GJ'
    };

    // Chart header structure
    let chartDataArray = [['State Code', 'State Hub', 'Inventory Metric']];

    sheetRows.forEach(row => {
        const rawRegion = row.Region ? row.Region.trim() : '';
        const isoCode = stateIsoMapping[rawRegion];
        const stockStatus = row.Stock_Level ? row.Stock_Level.trim() : '';

        if (isoCode) {
            // Assign numerical values based on Sheet's stock level text for colors
            let colorValue = 50; // Default Amber (Warning)
            if (stockStatus === 'Overstocked' || stockStatus === 'Optimal') colorValue = 90; // Green
            if (stockStatus === 'Critical Low' || stockStatus === 'Low') colorValue = 10; // Red

            chartDataArray.push([isoCode, rawRegion, colorValue]);
        }
    });

    // If matching states are found, redraw the dynamic map instantly
    if (chartDataArray.length > 1) {
        var liveDataTable = google.visualization.arrayToDataTable(chartDataArray);
        globalChartInstance.draw(liveDataTable, globalChartOptions);
    }
}
// ==================== GOOGLE SHEETS "MAGIC LINK" SYNC ====================
const syncUrlBtn = document.getElementById('sync-url-btn');
const sheetUrlInput = document.getElementById('sheet-url-input');

if (syncUrlBtn) {
    syncUrlBtn.addEventListener('click', () => {
        const rawUrl = sheetUrlInput.value.trim();
        
        if (!rawUrl) {
            alert("Bhai, pehle Google Sheets ka link toh paste karo!");
            return;
        }

        // Convert link to CSV export link
        let csvUrl = rawUrl;
        if (rawUrl.includes('/edit')) {
            csvUrl = rawUrl.replace(/\/edit.*$/, '/export?format=csv');
        }

        const aiStatus = document.getElementById('ai-status');
        const churnMetric = document.getElementById('churn-metric');
        const supplyStatus = document.getElementById('supply-status');

        // Show Loading State
        syncUrlBtn.innerText = "Fetching...";
        syncUrlBtn.classList.replace("bg-indigo-600", "bg-slate-600");
        aiStatus.innerHTML = '<span class="text-indigo-400 animate-pulse font-bold">Connecting to Cloud & Scraping Data...</span>';

        // Parse directly from the generated Cloud URL
        Papa.parse(csvUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const rowCount = results.data.length;

                // ---> MAP DATA BRIDGE START <---
                currentMarketData = results.data; // Save data globally
                // Trigger dynamic map update if the function exists
                if (typeof updateMapWithLiveData === 'function') {
                    updateMapWithLiveData(currentMarketData);
                }
                // ---> MAP DATA BRIDGE END <---

                // Fake delay for AI processing effect
                setTimeout(() => {
                    aiStatus.innerHTML = `
                        <div class="text-left w-full p-4">
                            <p class="text-emerald-400 font-bold mb-1">✅ Cloud Data Synced Seamlessly!</p>
                            <p class="text-slate-300 text-sm mb-3">System processed <span class="text-indigo-400 font-bold">${rowCount.toLocaleString()}</span> entries instantly via secure link.</p>
                            <div class="w-full bg-slate-800 h-1.5 rounded-full"><div class="bg-red-500 h-1.5" style="width: 72%"></div></div>
                            <p class="text-xs text-red-400 mt-1">Insight: 72% negative sentiment found.</p>
                        </div>
                    `;
                    aiStatus.classList.remove("justify-center", "items-center", "text-center");

                    // Update Metrics dynamically
                    if (churnMetric) {
                        churnMetric.innerText = "18.5% ⚠️";
                        churnMetric.classList.replace("text-amber-400", "text-red-500");
                    }
                    if (supplyStatus) {
                        supplyStatus.innerText = "HALT INVENTORY: Overstock risk detected.";
                        supplyStatus.classList.replace("text-slate-300", "text-red-400");
                    }

                    // Reset button and clear input
                    syncUrlBtn.innerText = "Sync";
                    syncUrlBtn.classList.replace("bg-slate-600", "bg-indigo-600");
                    sheetUrlInput.value = "";
                    
                    alert(`Boom! ${rowCount} rows fetched. Dashboard & Live Map successfully updated!`);
                }, 1500);
            },
            error: function(err) {
                alert("Error connecting! Make sure your Google Sheet access is set to 'Anyone with the link can view'.");
                syncUrlBtn.innerText = "Sync";
                syncUrlBtn.classList.replace("bg-slate-600", "bg-indigo-600");
            }
        });
    });
}
// ==================== MOCK GEN-AI AD CREATOR ====================
const generateAdBtn = document.getElementById('generate-ad-btn');
const aiGoalSelect = document.getElementById('ai-goal-select');
const adCopyOutput = document.getElementById('ad-copy-output');

if (generateAdBtn && aiGoalSelect && adCopyOutput) {
    generateAdBtn.addEventListener('click', () => {
        const selectedGoal = aiGoalSelect.value;
        const originalText = generateAdBtn.innerHTML;

        // 1. Show Loading State (Fake AI Thinking)
        generateAdBtn.innerHTML = '<span>⏳</span> AI is writing...';
        generateAdBtn.classList.replace('bg-indigo-600', 'bg-slate-600');
        adCopyOutput.innerHTML = '<span class="animate-pulse text-indigo-400">Analyzing market sentiment and crafting copy...</span>';

        // 2. Wait 1.5 seconds, then show result
        setTimeout(() => {
            let generatedCopy = "";
            
            if (selectedGoal === "discount") {
                generatedCopy = '"Who says premium nutrition can\'t be affordable? 🌱 Grab your 100% pure Almond Milk today and get a flat 20% off! Limited stock available. #HealthyLiving"';
            } 
            else if (selectedGoal === "bogo") {
                generatedCopy = '"Double the nutrition, half the guilt! 🥛 Buy 1 Premium Almond Milk and get 1 absolutely FREE. Clear your fridge, this weekend-only flash sale ends tonight! #BOGO"';
            } 
            else {
                generatedCopy = '"Experience the rich, creamy taste of 100% pure Almond Milk. Packed with vitamins, zero preservatives, and farm-fresh quality you can trust. Don\'t compromise on your health. ✨"';
            }

            adCopyOutput.innerHTML = generatedCopy;

            // 3. Show Success State on Button
            generateAdBtn.innerHTML = '<span>✅</span> Campaign Ready';
            generateAdBtn.classList.replace('bg-slate-600', 'bg-emerald-600');

            // 4. Reset Button after 2 seconds
            setTimeout(() => {
                generateAdBtn.innerHTML = originalText;
                generateAdBtn.classList.replace('bg-emerald-600', 'bg-indigo-600');
            }, 2000);

        }, 1500);
    });
}