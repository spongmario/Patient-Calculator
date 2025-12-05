// Provider data structure
let providers = [];
let shiftAssignments = {
    opening: [],
    mid: [],
    close: []
};

// Hard-coded base providers
const BASE_PROVIDERS = [
    { id: 1, name: 'Ryan', patientsPerHour: 2, submitted: true, isBase: true },
    { id: 2, name: 'Lauren', patientsPerHour: 2, submitted: true, isBase: true },
    { id: 3, name: 'Kristy', patientsPerHour: 1.8, submitted: true, isBase: true },
    { id: 4, name: 'Johny', patientsPerHour: 1.9, submitted: true, isBase: true },
    { id: 5, name: 'Mikaela', patientsPerHour: 2, submitted: true, isBase: true },
    { id: 6, name: 'Dan', patientsPerHour: 1.8, submitted: true, isBase: true },
    { id: 7, name: 'Nicole', patientsPerHour: 2.2, submitted: true, isBase: true }
];

// Load data from localStorage
function loadData() {
    const savedProviders = localStorage.getItem('chcProviders');
    const savedAssignments = localStorage.getItem('chcShiftAssignments');
    
    // Always start with base providers
    providers = JSON.parse(JSON.stringify(BASE_PROVIDERS)); // Deep copy
    
    // Load additional providers from localStorage (temporary ones added by user)
    if (savedProviders) {
        const saved = JSON.parse(savedProviders);
        const baseProviderIds = BASE_PROVIDERS.map(p => p.id);
        
        saved.forEach(provider => {
            // Skip "test" provider
            if (provider.name && provider.name.toLowerCase().trim() === 'test') {
                return;
            }
            
            // Check if this is a base provider by ID
            const isBaseProvider = baseProviderIds.includes(provider.id);
            
            if (isBaseProvider) {
                // Update base provider if it was edited (preserve edits but keep isBase flag)
                const baseIndex = providers.findIndex(p => p.id === provider.id);
                if (baseIndex !== -1) {
                    provider.isBase = true; // Ensure isBase flag is set
                    providers[baseIndex] = provider;
                }
            } else {
                // It's a temporary provider, add it
                providers.push(provider);
            }
        });
    }
    
    // Remove any "test" providers that might already be in the providers array
    providers = providers.filter(p => !p.name || p.name.toLowerCase().trim() !== 'test');
    
    // Clean up localStorage by saving the filtered providers (removes test provider)
    saveData();
    
    // Ensure all providers have the submitted property
    providers.forEach(provider => {
        if (provider.submitted === undefined) {
            provider.submitted = false;
        }
    });
    
    if (savedAssignments) {
        shiftAssignments = JSON.parse(savedAssignments);
    }
    
    // Initialize shift assignments for Thursday shifts if they don't exist
    if (!shiftAssignments.thursday1) {
        shiftAssignments.thursday1 = [];
    }
    if (!shiftAssignments.thursday2) {
        shiftAssignments.thursday2 = [];
    }
    if (!shiftAssignments.thursday3) {
        shiftAssignments.thursday3 = [];
    }
    
    renderProviders();
    updateShiftAssignments();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('chcProviders', JSON.stringify(providers));
    localStorage.setItem('chcShiftAssignments', JSON.stringify(shiftAssignments));
}

// Add provider row
function addProviderRow(skipRender = false) {
    const newProvider = {
        id: Date.now(),
        name: '',
        patientsPerHour: 0,
        submitted: false,
        isBase: false // Mark as temporary provider
    };
    providers.unshift(newProvider); // Add to beginning of array
    saveData();
    if (!skipRender) {
        renderProviders(true);
        updateShiftAssignments();
        // Focus on the new name input (first row)
        setTimeout(() => {
            const container = document.getElementById('providersContainer');
            if (container) {
                const firstRow = container.firstElementChild;
                if (firstRow) {
                    const nameInput = firstRow.querySelector('.provider-name-input');
                    if (nameInput) nameInput.focus();
                }
            }
        }, 10);
    }
}

// Delete provider
function deleteProvider(id) {
    providers = providers.filter(p => p.id !== id);
    // Remove from shift assignments
    shiftAssignments.opening = shiftAssignments.opening.filter(pid => pid !== id);
    shiftAssignments.mid = shiftAssignments.mid.filter(pid => pid !== id);
    shiftAssignments.close = shiftAssignments.close.filter(pid => pid !== id);
    
    saveData();
    renderProviders();
    updateShiftAssignments();
}

// Update provider name
function updateProviderName(id, value) {
    const provider = providers.find(p => p.id === id);
    if (provider && !provider.submitted) {
        provider.name = value.trim();
        saveData();
        updateShiftAssignments();
    }
}

// Update provider patients per hour
function updateProviderRate(id, value) {
    const provider = providers.find(p => p.id === id);
    if (provider && !provider.submitted) {
        const rate = parseFloat(value) || 0;
        provider.patientsPerHour = rate;
        saveData();
    }
}

// Submit provider (lock it)
function submitProvider(id) {
    const provider = providers.find(p => p.id === id);
    if (provider) {
        const name = provider.name.trim();
        const rate = provider.patientsPerHour;
        
        if (!name || rate <= 0) {
            alert('Please enter a valid provider name and patients per hour before submitting.');
            return;
        }
        
        provider.submitted = true;
        saveData();
        renderProviders();
    }
}

// Edit provider (unlock it)
function editProvider(id) {
    const provider = providers.find(p => p.id === id);
    if (provider) {
        provider.submitted = false;
        saveData();
        renderProviders();
        // Focus on the name input after editing
        setTimeout(() => {
            const row = document.querySelector(`[data-provider-id="${id}"]`);
            if (row) {
                const nameInput = row.querySelector('.provider-name-input');
                if (nameInput) nameInput.focus();
            }
        }, 50);
    }
}

// Render providers list
function renderProviders(skipAutoAdd = false) {
    const container = document.getElementById('providersContainer');
    if (!container) return; // Safety check
    
    container.innerHTML = '';
    
    // No need to auto-add empty row since we have base providers
    if (providers.length === 0) {
        return; // No providers to render
    }
    
    // Sort providers: base providers first (in original order), then temporary ones
    const sortedProviders = [...providers].sort((a, b) => {
        const aIsBase = a.isBase || false;
        const bIsBase = b.isBase || false;
        if (aIsBase && !bIsBase) return -1;
        if (!aIsBase && bIsBase) return 1;
        if (aIsBase && bIsBase) return a.id - b.id; // Base providers in original order
        return b.id - a.id; // Temporary providers: newest first
    });
    
    sortedProviders.forEach(provider => {
        const providerRow = document.createElement('div');
        providerRow.className = `provider-row ${provider.submitted ? 'submitted' : ''}`;
        providerRow.setAttribute('data-provider-id', provider.id);
        
        const isSubmitted = provider.submitted;
        const disabledAttr = isSubmitted ? 'disabled' : '';
        const readonlyAttr = isSubmitted ? 'readonly' : '';
        
        providerRow.innerHTML = `
            <input type="text" 
                   class="provider-name-input" 
                   placeholder="Provider name" 
                   value="${provider.name}"
                   ${disabledAttr}
                   ${readonlyAttr}
                   onchange="updateProviderName(${provider.id}, this.value)"
                   onblur="updateProviderName(${provider.id}, this.value)">
            <input type="number" 
                   class="provider-rate-input" 
                   placeholder="# per hour" 
                   step="0.1" 
                   min="0"
                   value="${provider.patientsPerHour || ''}"
                   ${disabledAttr}
                   ${readonlyAttr}
                   onchange="updateProviderRate(${provider.id}, this.value)"
                   onblur="updateProviderRate(${provider.id}, this.value)">
            ${isSubmitted 
                ? `<button class="btn btn-small btn-secondary" onclick="editProvider(${provider.id})">Edit</button>`
                : `<button class="btn btn-small btn-primary" onclick="submitProvider(${provider.id})">Submit</button>`
            }
            <button class="btn btn-small btn-danger" onclick="deleteProvider(${provider.id})">Delete</button>
        `;
        container.appendChild(providerRow);
    });
}

// Update shift assignments UI
function updateShiftAssignments() {
    const shiftType = document.getElementById('shiftType').value;
    const isThursday = shiftType === 'thursday';
    
    // Determine which shifts to show
    let shifts, shiftIds, shiftLabels;
    if (isThursday) {
        // Thursday: show 3 shifts all 9-7
        shifts = ['thursday1', 'thursday2', 'thursday3'];
        shiftIds = ['thursdayShift1', 'thursdayShift2', 'thursdayShift3'];
        shiftLabels = ['Shift 1 (9-7)', 'Shift 2 (9-7)', 'Shift 3 (9-7)'];
    } else {
        // Normal: show 3 different shifts
        shifts = ['opening', 'mid', 'close'];
        shiftIds = ['openingShift', 'midShift', 'closeShift'];
        shiftLabels = ['Opening Shift (8-6)', 'Mid Shift (9-7)', 'Close Shift (10-8)'];
    }
    
    // Update the shifts container
    const shiftsContainer = document.getElementById('shiftsContainer');
    shiftsContainer.innerHTML = '';
    
    shifts.forEach((shift, index) => {
        const shiftBox = document.createElement('div');
        shiftBox.className = 'shift-box';
        shiftBox.innerHTML = `<h3>${shiftLabels[index]}</h3><div id="${shiftIds[index]}" class="shift-assignment"></div>`;
        shiftsContainer.appendChild(shiftBox);
        
        const container = document.getElementById(shiftIds[index]);
        container.innerHTML = '';
        
        if (providers.length === 0) {
            container.innerHTML = '<p class="empty-state">Add providers first</p>';
        } else {
            // Create dropdown
            const select = document.createElement('select');
            select.className = 'shift-provider-dropdown';
            select.id = `dropdown-${shift}`;
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Select a provider...';
            select.appendChild(emptyOption);
            
            // Add providers
            providers.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.id;
                option.textContent = provider.name || 'Unnamed Provider';
                const isAssigned = shiftAssignments[shift] && shiftAssignments[shift].includes(provider.id);
                if (isAssigned) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            // Handle dropdown change
            select.addEventListener('change', function() {
                handleShiftProviderChange(shift, parseInt(this.value));
            });
            
            container.appendChild(select);
        }
    });
}

// Handle shift provider dropdown change
function handleShiftProviderChange(shift, providerId) {
    // First, remove this provider from all shifts (to prevent duplicates)
    Object.keys(shiftAssignments).forEach(key => {
        shiftAssignments[key] = shiftAssignments[key].filter(id => id !== providerId);
    });
    
    // If a provider was selected (not empty), add to the selected shift
    if (providerId && !isNaN(providerId)) {
        if (!shiftAssignments[shift]) {
            shiftAssignments[shift] = [];
        }
        shiftAssignments[shift].push(providerId);
    }
    
    saveData();
    updateShiftAssignments(); // Refresh to update other dropdowns
}

// Get shift times based on shift type
function getShiftTimes(isThursday) {
    if (isThursday) {
        return {
            thursday1: { start: 9, end: 19 }, // 9-7pm
            thursday2: { start: 9, end: 19 }, // 9-7pm
            thursday3: { start: 9, end: 19 }  // 9-7pm
        };
    } else {
        return {
            opening: { start: 8, end: 18 }, // 8-6pm
            mid: { start: 9, end: 19 },     // 9-7pm
            close: { start: 10, end: 20 }   // 10-8pm
        };
    }
}

// Calculate remaining hours for a provider
function calculateRemainingHours(currentHour, currentMinute, shiftStart, shiftEnd) {
    const currentTimeDecimal = currentHour + currentMinute / 60;
    
    // If current time is before shift start, return full shift hours
    if (currentTimeDecimal < shiftStart) {
        return shiftEnd - shiftStart;
    }
    
    // If current time is after shift end, return 0
    if (currentTimeDecimal >= shiftEnd) {
        return 0;
    }
    
    // Calculate remaining hours
    const remaining = shiftEnd - currentTimeDecimal;
    return Math.max(0, remaining);
}

// Calculate remaining patients for a provider
// The last hour of the shift always yields 1.8 patients, regardless of rate
function calculateProviderRemainingPatients(provider, remainingHours) {
    if (remainingHours <= 0) {
        return 0;
    }
    
    // If less than 1 hour remaining, they only see 1.8 patients
    if (remainingHours < 1) {
        return 1.8;
    }
    
    // The last hour is always 1.8 patients
    // All hours before the last hour use the provider's rate
    const hoursBeforeLast = remainingHours - 1;
    const patientsFromFullHours = hoursBeforeLast * provider.patientsPerHour;
    const patientsFromLastHour = 1.8;
    
    return patientsFromFullHours + patientsFromLastHour;
}

// Calculate total remaining patients
function calculateRemainingPatients() {
    const shiftType = document.getElementById('shiftType').value;
    const currentTime = document.getElementById('currentTime').value;
    const patientsInLobby = parseInt(document.getElementById('patientsInLobby').value) || 0;
    
    if (!currentTime) {
        alert('Please enter current time.');
        return;
    }
    
    const [hours, minutes] = currentTime.split(':').map(Number);
    const currentHour = hours;
    const currentMinute = minutes;
    
    const isThursday = shiftType === 'thursday';
    const shiftTimes = getShiftTimes(isThursday);
    
    let totalRemaining = patientsInLobby;
    const breakdown = [];
    
    // Calculate for each shift
    let shifts;
    if (isThursday) {
        shifts = [
            { name: 'Shift 1', key: 'thursday1', shiftTimes: shiftTimes.thursday1 },
            { name: 'Shift 2', key: 'thursday2', shiftTimes: shiftTimes.thursday2 },
            { name: 'Shift 3', key: 'thursday3', shiftTimes: shiftTimes.thursday3 }
        ];
    } else {
        shifts = [
            { name: 'Opening', key: 'opening', shiftTimes: shiftTimes.opening },
            { name: 'Mid', key: 'mid', shiftTimes: shiftTimes.mid },
            { name: 'Close', key: 'close', shiftTimes: shiftTimes.close }
        ];
    }
    
    shifts.forEach(shift => {
        const assignedProviders = (shiftAssignments[shift.key] || [])
            .map(id => providers.find(p => p.id === id))
            .filter(p => p !== undefined);
        
        assignedProviders.forEach(provider => {
            const remainingHours = calculateRemainingHours(
                currentHour,
                currentMinute,
                shift.shiftTimes.start,
                shift.shiftTimes.end
            );
            
            const remainingPatients = calculateProviderRemainingPatients(provider, remainingHours);
            totalRemaining += remainingPatients;
            
            if (remainingPatients > 0) {
                breakdown.push({
                    provider: provider.name,
                    shift: shift.name,
                    remainingHours: remainingHours.toFixed(2),
                    remainingPatients: remainingPatients.toFixed(1)
                });
            }
        });
    });
    
    // Display results
    document.getElementById('resultValue').textContent = Math.round(totalRemaining);
    
    const breakdownDiv = document.getElementById('resultBreakdown');
    if (breakdown.length > 0) {
        breakdownDiv.innerHTML = `
            <div class="breakdown-header">Breakdown:</div>
            <div class="breakdown-item">Lobby: ${patientsInLobby} patients</div>
            ${breakdown.map(item => `
                <div class="breakdown-item">
                    ${item.provider} (${item.shift}): ${item.remainingPatients} patients (${item.remainingHours} hrs remaining)
                </div>
            `).join('')}
        `;
    } else {
        breakdownDiv.innerHTML = '<div class="breakdown-item">No providers assigned or all shifts completed.</div>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default time to current time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('currentTime').value = `${hours}:${minutes}`;
    
    loadData();
    
    const calculateBtn = document.getElementById('calculateBtn');
    const addProviderBtn = document.getElementById('addProviderRow');
    const shiftTypeSelect = document.getElementById('shiftType');
    
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateRemainingPatients);
    }
    
    if (addProviderBtn) {
        addProviderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addProviderRow();
        });
    } else {
        console.error('Add Provider button not found!');
    }
    
    // Update shift assignments when shift type changes
    if (shiftTypeSelect) {
        shiftTypeSelect.addEventListener('change', () => {
            updateShiftAssignments();
        });
    }
});

