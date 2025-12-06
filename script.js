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
    { id: 2, name: 'Kristy', patientsPerHour: 1.8, submitted: true, isBase: true },
    { id: 3, name: 'Mikaela', patientsPerHour: 2, submitted: true, isBase: true },
    { id: 4, name: 'Dan', patientsPerHour: 1.8, submitted: true, isBase: true },
    { id: 5, name: 'Johny', patientsPerHour: 1.9, submitted: true, isBase: true },
    { id: 6, name: 'Nicole', patientsPerHour: 2.2, submitted: true, isBase: true },
    { id: 7, name: 'Lauren', patientsPerHour: 2, submitted: true, isBase: true }
];

// Get the desired order for providers based on BASE_PROVIDERS
function getProviderOrder() {
    const order = {};
    BASE_PROVIDERS.forEach((provider, index) => {
        order[provider.name.toLowerCase()] = index;
    });
    return order;
}

// Sort providers according to BASE_PROVIDERS order
function sortProvidersByBaseOrder(providersList) {
    const order = getProviderOrder();
    return [...providersList].sort((a, b) => {
        const aIsBase = a.isBase || false;
        const bIsBase = b.isBase || false;
        
        // Base providers first
        if (aIsBase && !bIsBase) return -1;
        if (!aIsBase && bIsBase) return 1;
        
        // Both are base providers - sort by BASE_PROVIDERS order
        if (aIsBase && bIsBase) {
            const aOrder = order[a.name.toLowerCase()] !== undefined ? order[a.name.toLowerCase()] : 999;
            const bOrder = order[b.name.toLowerCase()] !== undefined ? order[b.name.toLowerCase()] : 999;
            return aOrder - bOrder;
        }
        
        // Both are temporary - newest first
        return b.id - a.id;
    });
}

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
    const provider = providers.find(p => p.id === id);
    const providerName = provider ? provider.name || 'this provider' : 'this provider';
    
    // Don't confirm for base providers, just show a message
    if (provider && provider.isBase) {
        if (!confirm(`Are you sure you want to remove ${providerName} from the list? This will also remove them from all shift assignments.`)) {
            return;
        }
    } else {
        if (!confirm(`Are you sure you want to delete ${providerName}? This will also remove them from all shift assignments.`)) {
            return;
        }
    }
    
    providers = providers.filter(p => p.id !== id);
    // Remove from shift assignments
    shiftAssignments.opening = shiftAssignments.opening.filter(pid => pid !== id);
    shiftAssignments.mid = shiftAssignments.mid.filter(pid => pid !== id);
    shiftAssignments.close = shiftAssignments.close.filter(pid => pid !== id);
    
    // Also remove from Thursday shifts
    if (shiftAssignments.thursday1) {
        shiftAssignments.thursday1 = shiftAssignments.thursday1.filter(pid => pid !== id);
    }
    if (shiftAssignments.thursday2) {
        shiftAssignments.thursday2 = shiftAssignments.thursday2.filter(pid => pid !== id);
    }
    if (shiftAssignments.thursday3) {
        shiftAssignments.thursday3 = shiftAssignments.thursday3.filter(pid => pid !== id);
    }
    
    saveData();
    renderProviders();
    updateShiftAssignments();
    calculateRemainingPatients();
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
    
    // Sort providers: base providers first (in BASE_PROVIDERS order), then temporary ones
    const sortedProviders = sortProvidersByBaseOrder(providers);
    
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
            // Show assigned providers with remove buttons
            const assignedProviders = (shiftAssignments[shift] || [])
                .map(id => providers.find(p => p.id === id))
                .filter(p => p !== undefined);
            
            if (assignedProviders.length > 0) {
                const assignedList = document.createElement('div');
                assignedList.className = 'assigned-providers-list';
                
                assignedProviders.forEach(provider => {
                    const providerItem = document.createElement('div');
                    providerItem.className = 'assigned-provider-item';
                    providerItem.innerHTML = `
                        <span class="assigned-provider-name">${provider.name || 'Unnamed Provider'}</span>
                        <button class="btn btn-small btn-danger remove-provider-btn" onclick="removeProviderFromShift('${shift}', ${provider.id})" title="Remove from shift">×</button>
                    `;
                    assignedList.appendChild(providerItem);
                });
                
                container.appendChild(assignedList);
            }
            
            // Create dropdown to add providers
            const select = document.createElement('select');
            select.className = 'shift-provider-dropdown';
            select.id = `dropdown-${shift}`;
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Select a provider...';
            select.appendChild(emptyOption);
            
            // Add providers that aren't already assigned to this shift (sorted by BASE_PROVIDERS order)
            const sortedProviders = sortProvidersByBaseOrder(providers);
            sortedProviders.forEach(provider => {
                const isAssigned = shiftAssignments[shift] && shiftAssignments[shift].includes(provider.id);
                if (!isAssigned) {
                    const option = document.createElement('option');
                    option.value = provider.id;
                    option.textContent = provider.name || 'Unnamed Provider';
                    select.appendChild(option);
                }
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
    // Automatically recalculate remaining patients
    calculateRemainingPatients();
}

// Remove a provider from a specific shift
function removeProviderFromShift(shift, providerId) {
    if (shiftAssignments[shift]) {
        shiftAssignments[shift] = shiftAssignments[shift].filter(id => id !== providerId);
        saveData();
        updateShiftAssignments();
        // Automatically recalculate remaining patients
        calculateRemainingPatients();
    }
}

// Clear all shift assignments
function clearAllShifts() {
    if (!confirm('Are you sure you want to clear all shift assignments? This action cannot be undone.')) {
        return;
    }
    
    shiftAssignments.opening = [];
    shiftAssignments.mid = [];
    shiftAssignments.close = [];
    shiftAssignments.thursday1 = [];
    shiftAssignments.thursday2 = [];
    shiftAssignments.thursday3 = [];
    
    saveData();
    updateShiftAssignments();
    calculateRemainingPatients();
}

// Set current time to now
function setCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeInput = document.getElementById('currentTime');
    if (timeInput) {
        timeInput.value = `${hours}:${minutes}`;
        calculateRemainingPatients();
        // Visual feedback
        timeInput.focus();
        setTimeout(() => timeInput.blur(), 300);
    }
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
// The last hour of the shift always yields 2 patients, regardless of rate
function calculateProviderRemainingPatients(provider, remainingHours) {
    if (remainingHours <= 0) {
        return 0;
    }
    
    // If less than 1 hour remaining, they only see 2 patients
    if (remainingHours < 1) {
        return 2;
    }
    
    // The last hour is always 2 patients
    // All hours before the last hour use the provider's rate
    const hoursBeforeLast = remainingHours - 1;
    const patientsFromFullHours = hoursBeforeLast * provider.patientsPerHour;
    const patientsFromLastHour = 2;
    
    return patientsFromFullHours + patientsFromLastHour;
}

// Get the latest shift end time based on shift type
function getLatestShiftEndTime(isThursday) {
    if (isThursday) {
        return 19; // 7pm for Thursday shifts
    } else {
        return 20; // 8pm for normal shifts
    }
}

// Calculate total remaining patients
function calculateRemainingPatients() {
    const shiftType = document.getElementById('shiftType').value;
    const currentTime = document.getElementById('currentTime').value;
    const patientsInLobby = parseInt(document.getElementById('patientsInLobby').value) || 0;
    
    // If no time is set yet, don't calculate (will update automatically once time is set)
    if (!currentTime) {
        return;
    }
    
    const [hours, minutes] = currentTime.split(':').map(Number);
    const currentHour = hours;
    const currentMinute = minutes;
    
    // Debug: Log the time values to help troubleshoot
    console.log('Time input value:', currentTime);
    console.log('Parsed hours:', currentHour, 'minutes:', currentMinute);
    
    const isThursday = shiftType === 'thursday';
    const latestShiftEnd = getLatestShiftEndTime(isThursday);
    const currentTimeDecimal = currentHour + currentMinute / 60;
    
    console.log('Current time decimal:', currentTimeDecimal, 'Latest shift end:', latestShiftEnd);
    console.log('Is after closing?', currentTimeDecimal >= latestShiftEnd);
    
    // Format time for display
    const displayHour = currentHour === 0 ? 12 : (currentHour > 12 ? currentHour - 12 : currentHour);
    const ampm = currentHour >= 12 ? 'PM' : 'AM';
    const displayTime = `${displayHour}:${String(currentMinute).padStart(2, '0')} ${ampm}`;
    
    // Check if current time is after the clinic closes
    if (currentTimeDecimal >= latestShiftEnd) {
        const closingTime = latestShiftEnd === 19 ? '7:00 PM' : '8:00 PM';
        const resultBox = document.getElementById('result');
        if (resultBox) {
            resultBox.classList.add('closed');
        }
        const resultValue = document.getElementById('resultValue');
        if (resultValue) {
            resultValue.textContent = 'CLOSED';
        }
        // Hide Rickey message when closed
        const rickeyMessage = document.getElementById('rickeyMessage');
        if (rickeyMessage) {
            rickeyMessage.style.display = 'none';
        }
        const resultBreakdown = document.getElementById('resultBreakdown');
        if (resultBreakdown) {
            resultBreakdown.innerHTML = `
                <div class="breakdown-header" style="color: #ffeb3b; font-weight: bold;">⚠️ Clinic Closed</div>
                <div class="breakdown-item" style="margin-top: 10px;">
                    Current time: ${displayTime} (${currentHour}:${String(currentMinute).padStart(2, '0')})<br>
                    The clinic closed at ${closingTime}. No remaining patient capacity calculations are available after closing time.
                </div>
            `;
        }
        return;
    }
    
    // Remove closed class if clinic is open
    const resultBox = document.getElementById('result');
    resultBox.classList.remove('closed');
    
    const shiftTimes = getShiftTimes(isThursday);
    
    let totalProviderCapacity = 0;
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
    
    // Check if any providers are assigned to any shift
    let hasAnyProviders = false;
    shifts.forEach(shift => {
        const assignedProviders = (shiftAssignments[shift.key] || [])
            .map(id => providers.find(p => p.id === id))
            .filter(p => p !== undefined);
        
        if (assignedProviders.length > 0) {
            hasAnyProviders = true;
        }
        
        assignedProviders.forEach(provider => {
            const remainingHours = calculateRemainingHours(
                currentHour,
                currentMinute,
                shift.shiftTimes.start,
                shift.shiftTimes.end
            );
            
            const remainingPatients = calculateProviderRemainingPatients(provider, remainingHours);
            totalProviderCapacity += remainingPatients;
            
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
    
    // Round down total provider capacity to nearest whole number
    const roundedProviderCapacity = Math.floor(totalProviderCapacity);
    
    // Display results
    const resultValue = document.getElementById('resultValue');
    const breakdownDiv = document.getElementById('resultBreakdown');
    
    // Check if no providers are selected
    if (!hasAnyProviders) {
        // If no providers, show negative of lobby patients (can't accept more)
        const remainingCapacity = 0 - patientsInLobby;
        resultValue.textContent = remainingCapacity;
        resultBox.classList.add('no-providers');
        // Remove any color coding classes to keep the brown no-providers color
        resultBox.classList.remove('capacity-red', 'capacity-yellow', 'capacity-green', 'capacity-negative');
        
        // Show/hide Rickey message
        const rickeyMessage = document.getElementById('rickeyMessage');
        if (rickeyMessage) {
            if (remainingCapacity < 0) {
                rickeyMessage.textContent = "You Pulled a Rickey! Time to encourage patients leave.";
                rickeyMessage.style.display = 'block';
            } else {
                rickeyMessage.style.display = 'none';
            }
        }
        
        breakdownDiv.innerHTML = `
            <div class="breakdown-header" style="color: #fff8dc; font-weight: bold;">⚠️ No Providers Selected</div>
            <div class="breakdown-item" style="margin-top: 10px;">
                Begin by assigning a provider below to calculate remaining patient capacity.
            </div>
        `;
        return;
    }
    
    // Remove no-providers class if providers are selected
    resultBox.classList.remove('no-providers');
    
    // Calculate remaining capacity: rounded down total provider capacity minus patients in lobby
    const remainingCapacity = roundedProviderCapacity - patientsInLobby;
    resultValue.textContent = remainingCapacity;
    
    // Apply color coding based on remaining capacity
    resultValue.className = 'result-value'; // Reset classes
    resultBox.classList.remove('capacity-red', 'capacity-yellow', 'capacity-green', 'capacity-negative');
    
    // Show/hide Rickey message
    const rickeyMessage = document.getElementById('rickeyMessage');
    if (rickeyMessage) {
        if (remainingCapacity < 0) {
            rickeyMessage.textContent = "You Pulled a Rickey! Time to encourage patients leave.";
            rickeyMessage.style.display = 'block';
        } else {
            rickeyMessage.style.display = 'none';
        }
    }
    
    if (remainingCapacity < 0) {
        resultBox.classList.add('capacity-negative');
    } else if (remainingCapacity <= 1) {
        resultBox.classList.add('capacity-red');
    } else if (remainingCapacity <= 4) {
        resultBox.classList.add('capacity-yellow');
    } else {
        resultBox.classList.add('capacity-green');
    }
    
    if (breakdown.length > 0) {
        breakdownDiv.innerHTML = `
            <div class="breakdown-header">Breakdown:</div>
            ${breakdown.map(item => `
                <div class="breakdown-item" style="font-size: 0.9em;">
                    ${item.provider} (${item.shift}): ${Math.floor(parseFloat(item.remainingPatients))} patients (${item.remainingHours} hrs remaining)
                </div>
            `).join('')}
        `;
    } else {
        breakdownDiv.innerHTML = `
            <div class="breakdown-header">Breakdown:</div>
            <div class="breakdown-item" style="margin-top: 10px; color: #ffeb3b;">All assigned providers have completed their shifts.</div>
        `;
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
    
    const addProviderBtn = document.getElementById('addProviderRow');
    const shiftTypeSelect = document.getElementById('shiftType');
    const setCurrentTimeBtn = document.getElementById('setCurrentTimeBtn');
    const clearAllShiftsBtn = document.getElementById('clearAllShiftsBtn');
    
    // Set current time button
    if (setCurrentTimeBtn) {
        setCurrentTimeBtn.addEventListener('click', setCurrentTime);
    }
    
    // Clear all shifts button
    if (clearAllShiftsBtn) {
        clearAllShiftsBtn.addEventListener('click', clearAllShifts);
    }
    
    // Auto-update when patients in lobby changes
    const patientsInLobbyInput = document.getElementById('patientsInLobby');
    if (patientsInLobbyInput) {
        patientsInLobbyInput.addEventListener('input', calculateRemainingPatients);
        patientsInLobbyInput.addEventListener('change', calculateRemainingPatients);
    }
    
    // Auto-update when time changes
    const currentTimeInput = document.getElementById('currentTime');
    if (currentTimeInput) {
        currentTimeInput.addEventListener('change', calculateRemainingPatients);
        currentTimeInput.addEventListener('input', calculateRemainingPatients);
    }
    
    // Auto-calculate on page load after time is set
    setTimeout(() => {
        if (currentTimeInput && currentTimeInput.value) {
            calculateRemainingPatients();
        }
    }, 200);
    
    // Also try immediately after a longer delay (in case loadData takes time)
    setTimeout(() => {
        if (currentTimeInput && currentTimeInput.value) {
            calculateRemainingPatients();
        }
    }, 500);
    
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
            calculateRemainingPatients();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: Add new provider
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (addProviderBtn) {
                addProviderRow();
            }
        }
        
        // Ctrl/Cmd + T: Set current time
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            setCurrentTime();
        }
    });
    
    // Add visual feedback for number inputs
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('invalid', function() {
            this.setCustomValidity('Please enter a valid number');
        });
        input.addEventListener('input', function() {
            this.setCustomValidity('');
        });
    });
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize Clinical Pathways
    initializePathways();
});

// ==================== Navigation System ====================

function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });
    
    // Check authentication when navigating to pathways page
    if (pageId === 'pathways') {
        checkAuthentication();
        // Re-render pathways to show/hide admin buttons based on auth status
        const searchInput = document.getElementById('pathwaySearch');
        const currentFilter = searchInput ? searchInput.value : '';
        renderPathways(currentFilter);
    }
    
    // Initialize PT when navigating to physical therapy page
    if (pageId === 'physical-therapy') {
        initializePT();
    }
}

function initializeNavigation() {
    // Add click handlers to nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            navigateToPage(pageId);
        });
    });
}

// Make navigateToPage available globally for buttons
window.navigateToPage = navigateToPage;

// ==================== Clinical Pathways System ====================

// Admin password - Change this to your desired password
const ADMIN_PASSWORD = 'CHC2024'; // Change this password!

let pathways = [];
let isAuthenticated = false;
let db = null;

// IndexedDB setup
const DB_NAME = 'CHCToolkitDB';
const DB_VERSION = 2; // Updated to 2 to include PT stores
const STORE_NAME = 'pathways';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('name', 'name', { unique: false });
                objectStore.createIndex('uploadDate', 'uploadDate', { unique: false });
                console.log('IndexedDB pathways store created');
            }
            // Create PT stores if they don't exist
            if (!db.objectStoreNames.contains('ptGuides')) {
                const ptStore = db.createObjectStore('ptGuides', { keyPath: 'id' });
                ptStore.createIndex('name', 'name', { unique: false });
                console.log('IndexedDB PT guides store created');
            }
            if (!db.objectStoreNames.contains('ptRecommendations')) {
                const recStore = db.createObjectStore('ptRecommendations', { keyPath: 'id' });
                recStore.createIndex('title', 'title', { unique: false });
                console.log('IndexedDB PT recommendations store created');
            }
        };
    });
}

async function loadPathways() {
    try {
        if (!db) {
            await initDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = async () => {
                pathways = request.result || [];
                
                // Migrate from localStorage if IndexedDB is empty but localStorage has data
                if (pathways.length === 0) {
                    const oldData = localStorage.getItem('chcPathways');
                    if (oldData) {
                        try {
                            const oldPathways = JSON.parse(oldData);
                            console.log('Migrating', oldPathways.length, 'pathways from localStorage to IndexedDB');
                            
                            // Convert base64 data URLs to ArrayBuffers and save to IndexedDB
                            for (const oldPathway of oldPathways) {
                                if (oldPathway.data && typeof oldPathway.data === 'string' && oldPathway.data.startsWith('data:')) {
                                    // Convert base64 data URL to ArrayBuffer
                                    const base64Data = oldPathway.data.split(',')[1];
                                    const binaryString = atob(base64Data);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    oldPathway.data = bytes.buffer;
                                }
                                await savePathway(oldPathway);
                                pathways.push(oldPathway);
                            }
                            
                            // Clear old localStorage data
                            localStorage.removeItem('chcPathways');
                            console.log('Migration complete');
                        } catch (migError) {
                            console.error('Migration error:', migError);
                        }
                    }
                }
                
                console.log('Loaded', pathways.length, 'pathways from IndexedDB');
                renderPathways();
                resolve(pathways);
            };
            
            request.onerror = () => {
                console.error('Error loading pathways:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error initializing DB:', error);
        pathways = [];
        renderPathways();
    }
}

async function savePathway(pathway) {
    try {
        if (!db) {
            await initDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(pathway);
            
            request.onsuccess = () => {
                console.log('Pathway saved to IndexedDB:', pathway.name);
                resolve();
            };
            
            request.onerror = () => {
                console.error('Error saving pathway:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error saving pathway:', error);
        throw error;
    }
}

async function deletePathwayFromDB(id) {
    try {
        if (!db) {
            await initDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('Pathway deleted from IndexedDB');
                resolve();
            };
            
            request.onerror = () => {
                console.error('Error deleting pathway:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error deleting pathway:', error);
        throw error;
    }
}

function renderPathways(filter = '') {
    const container = document.getElementById('pathwaysList');
    if (!container) return;
    
    let filteredPathways = [...pathways]; // Create a copy to avoid mutating original
    
    // Apply filter if provided
    if (filter) {
        const searchLower = filter.toLowerCase();
        filteredPathways = filteredPathways.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            (p.description && p.description.toLowerCase().includes(searchLower))
        );
    }
    
    // Sort alphabetically by name
    filteredPathways.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    if (filteredPathways.length === 0 && pathways.length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">📋</div>
                <h3>No Clinical Pathways Yet</h3>
                <p>Upload your first clinical pathway document to get started.</p>
                <button class="btn btn-primary" onclick="document.getElementById('pathwayFileInput').click()">
                    Upload First Pathway
                </button>
            </div>
        `;
        return;
    }
    
    if (filteredPathways.length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">🔍</div>
                <h3>No Pathways Found</h3>
                <p>No pathways match your search criteria.</p>
            </div>
        `;
        return;
    }
    
    // Create list HTML
    container.innerHTML = `
        <div class="pathway-list-container">
            ${filteredPathways.map((pathway) => {
                const fileIcon = getFileIcon(pathway.fileType);
                // Find the actual index in the original pathways array
                const actualIndex = pathways.findIndex(p => p.id === pathway.id);
                return `
                    <div class="pathway-list-item" onclick="viewPathway(${actualIndex})">
                        <div class="pathway-list-icon">${fileIcon}</div>
                        <div class="pathway-list-info">
                            <div class="pathway-list-name">${escapeHtml(pathway.name)}</div>
                        </div>
                        <div class="pathway-list-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-small" onclick="downloadPathway(${actualIndex})">Download</button>
                            ${isAuthenticated ? `
                                <button class="btn btn-primary btn-small" onclick="renamePathway(${actualIndex})">Rename</button>
                                <button class="btn btn-danger btn-small" onclick="deletePathway(${actualIndex})">Delete</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getFileIcon(fileType) {
    if (fileType === 'pdf') return '📄';
    if (fileType === 'doc' || fileType === 'docx') return '📝';
    if (fileType === 'txt') return '📃';
    return '📎';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function handleFileUpload(files) {
    if (!files || files.length === 0) {
        console.error('No files selected');
        return;
    }
    
    // Initialize DB if needed
    if (!db) {
        try {
            await initDB();
        } catch (error) {
            alert('Error initializing database: ' + error.message);
            return;
        }
    }
    
    const fileArray = Array.from(files);
    let processedCount = 0;
    let errorCount = 0;
    
    // Process files sequentially to avoid overwhelming the browser
    for (let index = 0; index < fileArray.length; index++) {
        const file = fileArray[index];
        
        // Check file size (limit to 100MB for IndexedDB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        
        if (file.size > maxSize) {
            alert(`File "${file.name}" is too large (${formatFileSize(file.size)}). Maximum size is 100MB.`);
            errorCount++;
            continue;
        }
        
        try {
            // Read file as ArrayBuffer for IndexedDB (more efficient than base64)
            const arrayBuffer = await file.arrayBuffer();
            
            const pathway = {
                id: Date.now() + Math.random() + index,
                name: file.name,
                fileType: getFileExtension(file.name),
                size: file.size,
                uploadDate: new Date().toISOString(),
                data: arrayBuffer, // Store as ArrayBuffer
                mimeType: file.type
            };
            
            // Save to IndexedDB
            await savePathway(pathway);
            pathways.push(pathway);
            processedCount++;
            
            console.log(`Uploaded ${processedCount}/${fileArray.length}: ${file.name}`);
        } catch (error) {
            console.error('Error processing file:', error);
            alert(`Error uploading file "${file.name}": ${error.message}`);
            errorCount++;
        }
    }
    
    // Render and show success message
    renderPathways();
    if (processedCount > 0) {
        alert(`Successfully uploaded ${processedCount} file(s)!`);
    }
    if (errorCount > 0) {
        alert(`Failed to upload ${errorCount} file(s).`);
    }
}

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function viewPathway(index) {
    const pathway = pathways[index];
    if (!pathway) return;
    
    // Convert ArrayBuffer to blob URL for viewing
    const blob = new Blob([pathway.data], { type: pathway.mimeType || 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Create a new window/tab to view the document
    const newWindow = window.open();
    if (pathway.mimeType === 'application/pdf' || pathway.fileType === 'pdf') {
        // For PDFs, embed directly
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(pathway.name)}</title></head>
                <body style="margin:0;padding:0;">
                    <embed src="${blobUrl}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100vh;" />
                </body>
            </html>
        `);
    } else {
        // For other files, try to display or download
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(pathway.name)}</title></head>
                <body style="margin:20px;font-family:Arial;">
                    <h2>${escapeHtml(pathway.name)}</h2>
                    <p>This file type cannot be displayed in the browser. Please download it to view.</p>
                    <button onclick="window.location.href='${blobUrl}'" download="${escapeHtml(pathway.name)}" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">
                        Download File
                    </button>
                </body>
            </html>
        `);
    }
    
    // Clean up blob URL when window closes
    newWindow.addEventListener('beforeunload', () => {
        URL.revokeObjectURL(blobUrl);
    });
}

function downloadPathway(index) {
    const pathway = pathways[index];
    if (!pathway) return;
    
    // Convert ArrayBuffer to blob for download
    const blob = new Blob([pathway.data], { type: pathway.mimeType || 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = pathway.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL after a short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}

async function renamePathway(index) {
    if (!isAuthenticated) {
        alert('You must be authenticated to rename documents.');
        handleAdminLogin();
        return;
    }
    
    const pathway = pathways[index];
    if (!pathway) return;
    
    const newName = prompt(`Rename "${pathway.name}" to:`, pathway.name);
    
    if (!newName || newName.trim() === '') {
        return; // User cancelled or entered empty name
    }
    
    const trimmedName = newName.trim();
    if (trimmedName === pathway.name) {
        return; // Name unchanged
    }
    
    try {
        // Update pathway name
        pathway.name = trimmedName;
        
        // Save to IndexedDB
        await savePathway(pathway);
        
        // Re-render to show updated name (preserve current search filter)
        const searchInput = document.getElementById('pathwaySearch');
        const currentFilter = searchInput ? searchInput.value : '';
        renderPathways(currentFilter);
    } catch (error) {
        alert('Error renaming document: ' + error.message);
        console.error('Rename error:', error);
    }
}

async function deletePathway(index) {
    if (!isAuthenticated) {
        alert('You must be authenticated to delete documents.');
        handleAdminLogin();
        return;
    }
    
    const pathway = pathways[index];
    if (!pathway) return;
    
    if (!confirm(`Are you sure you want to delete "${pathway.name}"?`)) {
        return;
    }
    
    try {
        // Delete from IndexedDB
        await deletePathwayFromDB(pathway.id);
        
        // Remove from array
        pathways.splice(index, 1);
        renderPathways();
    } catch (error) {
        alert('Error deleting document: ' + error.message);
        console.error('Delete error:', error);
    }
}

function checkAuthentication() {
    // Check sessionStorage for authentication status
    const authStatus = sessionStorage.getItem('chcAdminAuthenticated');
    isAuthenticated = authStatus === 'true';
    updateAuthUI();
}

function updateAuthUI() {
    const loginBtn = document.getElementById('adminLoginBtn');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const uploadBtn = document.getElementById('uploadPathwayBtn');
    
    if (isAuthenticated) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (uploadBtn) uploadBtn.style.display = 'block';
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (uploadBtn) uploadBtn.style.display = 'none';
    }
}

function handleAdminLogin() {
    const password = prompt('Enter admin password to upload documents:');
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        sessionStorage.setItem('chcAdminAuthenticated', 'true');
        updateAuthUI();
        // Re-render pathways to show admin buttons
        const searchInput = document.getElementById('pathwaySearch');
        const currentFilter = searchInput ? searchInput.value : '';
        renderPathways(currentFilter);
        alert('Authentication successful! You can now upload, rename, and delete documents.');
    } else if (password !== null) {
        alert('Incorrect password. Access denied.');
    }
}

function handleAdminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        isAuthenticated = false;
        sessionStorage.removeItem('chcAdminAuthenticated');
        updateAuthUI();
        // Re-render pathways to hide admin buttons
        const searchInput = document.getElementById('pathwaySearch');
        const currentFilter = searchInput ? searchInput.value : '';
        renderPathways(currentFilter);
    }
}

function handleUploadClick() {
    console.log('Upload button clicked, authenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
        handleAdminLogin();
        // After login, check if we should proceed
        if (!isAuthenticated) {
            return;
        }
    }
    
    // If authenticated, trigger file input
    const fileInput = document.getElementById('pathwayFileInput');
    if (fileInput) {
        console.log('Clicking file input');
        fileInput.click();
    } else {
        console.error('File input not found!');
        alert('Error: File upload input not found. Please refresh the page.');
    }
}

async function initializePathways() {
    // Initialize IndexedDB first
    try {
        await initDB();
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        alert('Warning: Could not initialize database. Some features may not work.');
    }
    
    await loadPathways();
    checkAuthentication();
    
    // File upload handler
    const fileInput = document.getElementById('pathwayFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            console.log('File input changed, files:', e.target.files);
            
            if (!isAuthenticated) {
                alert('You must be authenticated to upload documents.');
                e.target.value = '';
                return;
            }
            
            if (e.target.files && e.target.files.length > 0) {
                console.log('Processing', e.target.files.length, 'file(s)');
                handleFileUpload(e.target.files);
                // Reset input so same file can be uploaded again
                e.target.value = '';
            } else {
                console.log('No files selected');
            }
        });
    } else {
        console.error('File input element not found!');
    }
    
    // Search handler
    const searchInput = document.getElementById('pathwaySearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            renderPathways(e.target.value);
        });
    }
    
    // Login/Logout button handlers
    const loginBtn = document.getElementById('adminLoginBtn');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', handleAdminLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }
}

// Make functions available globally
window.viewPathway = viewPathway;
window.downloadPathway = downloadPathway;
window.renamePathway = renamePathway;
window.deletePathway = deletePathway;
window.handleUploadClick = handleUploadClick;

// ==================== Physical Therapy System ====================

const PT_STORE_NAME = 'ptGuides';
const PT_RECOMMENDATIONS_STORE = 'ptRecommendations';

let ptGuides = [];
let ptRecommendations = [];
let ptIsAuthenticated = false;
let editingRecommendationId = null;

// Initialize PT DB stores
function initPTDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            initDB().then(() => {
                initPTStores().then(resolve).catch(reject);
            }).catch(reject);
        } else {
            initPTStores().then(resolve).catch(reject);
        }
    });
}

function initPTStores() {
    return new Promise((resolve, reject) => {
        // Just check if stores exist - they should be created in initDB's onupgradeneeded
        // If they don't exist, we need to trigger an upgrade
        const needsPTStore = !db.objectStoreNames.contains(PT_STORE_NAME);
        const needsRecStore = !db.objectStoreNames.contains(PT_RECOMMENDATIONS_STORE);
        
        if (needsPTStore || needsRecStore) {
            // Close current connection and reopen with higher version
            const currentVersion = db.version;
            db.close();
            const newVersion = currentVersion + 1;
            const request = indexedDB.open(DB_NAME, newVersion);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (needsPTStore && !db.objectStoreNames.contains(PT_STORE_NAME)) {
                    const objectStore = db.createObjectStore(PT_STORE_NAME, { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                }
                if (needsRecStore && !db.objectStoreNames.contains(PT_RECOMMENDATIONS_STORE)) {
                    const objectStore = db.createObjectStore(PT_RECOMMENDATIONS_STORE, { keyPath: 'id' });
                    objectStore.createIndex('title', 'title', { unique: false });
                }
            };
            
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            
            request.onerror = () => {
                console.error('Error upgrading DB:', request.error);
                reject(request.error);
            };
        } else {
            // Stores already exist
            resolve(db);
        }
    });
}

async function loadPTGuides() {
    try {
        if (!db) {
            await initDB();
        }
        if (!db.objectStoreNames.contains(PT_STORE_NAME)) {
            await initPTDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PT_STORE_NAME], 'readonly');
            const store = transaction.objectStore(PT_STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => {
                ptGuides = request.result || [];
                console.log('Loaded', ptGuides.length, 'PT guides from IndexedDB');
                renderPTGuides();
                resolve(ptGuides);
            };
            
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading PT guides:', error);
        ptGuides = [];
        renderPTGuides();
    }
}

async function loadPTRecommendations() {
    try {
        if (!db) {
            await initDB();
        }
        if (!db.objectStoreNames.contains(PT_RECOMMENDATIONS_STORE)) {
            await initPTDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PT_RECOMMENDATIONS_STORE], 'readonly');
            const store = transaction.objectStore(PT_RECOMMENDATIONS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                ptRecommendations = request.result || [];
                console.log('Loaded', ptRecommendations.length, 'PT recommendations from IndexedDB');
                renderPTRecommendations();
                resolve(ptRecommendations);
            };
            
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading PT recommendations:', error);
        ptRecommendations = [];
        renderPTRecommendations();
    }
}

async function savePTGuide(guide) {
    try {
        if (!db) await initDB();
        if (!db.objectStoreNames.contains(PT_STORE_NAME)) await initPTDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PT_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(PT_STORE_NAME);
            const request = store.put(guide);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        throw error;
    }
}

async function savePTRecommendation(recommendation) {
    try {
        if (!db) await initDB();
        if (!db.objectStoreNames.contains(PT_RECOMMENDATIONS_STORE)) await initPTDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PT_RECOMMENDATIONS_STORE], 'readwrite');
            const store = transaction.objectStore(PT_RECOMMENDATIONS_STORE);
            const request = store.put(recommendation);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        throw error;
    }
}

async function deletePTGuideFromDB(id) {
    try {
        if (!db) await initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PT_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(PT_STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        throw error;
    }
}

async function deletePTRecommendationFromDB(id) {
    try {
        if (!db) await initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PT_RECOMMENDATIONS_STORE], 'readwrite');
            const store = transaction.objectStore(PT_RECOMMENDATIONS_STORE);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        throw error;
    }
}

function renderPTGuides(filter = '') {
    const container = document.getElementById('ptList');
    if (!container) return;
    
    let filteredGuides = [...ptGuides];
    
    if (filter) {
        const searchLower = filter.toLowerCase();
        filteredGuides = filteredGuides.filter(g => 
            g.name.toLowerCase().includes(searchLower)
        );
    }
    
    filteredGuides.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    
    if (filteredGuides.length === 0 && ptGuides.length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">🏃</div>
                <h3>No Physical Therapy Guides Yet</h3>
                <p>Physical therapy guides are managed by administrators. Contact your administrator to add documents.</p>
            </div>
        `;
        return;
    }
    
    if (filteredGuides.length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">🔍</div>
                <h3>No Guides Found</h3>
                <p>No guides match your search criteria.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="pathway-list-container">
            ${filteredGuides.map((guide) => {
                const fileIcon = getFileIcon(guide.fileType);
                const actualIndex = ptGuides.findIndex(g => g.id === guide.id);
                return `
                    <div class="pathway-list-item" onclick="viewPTGuide(${actualIndex})">
                        <div class="pathway-list-icon">${fileIcon}</div>
                        <div class="pathway-list-info">
                            <div class="pathway-list-name">${escapeHtml(guide.name)}</div>
                        </div>
                        <div class="pathway-list-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-small" onclick="downloadPTGuide(${actualIndex})">Download</button>
                            ${ptIsAuthenticated ? `
                                <button class="btn btn-primary btn-small" onclick="renamePTGuide(${actualIndex})">Rename</button>
                                <button class="btn btn-danger btn-small" onclick="deletePTGuide(${actualIndex})">Delete</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderPTRecommendations() {
    const container = document.getElementById('ptRecommendationsList');
    const section = document.getElementById('ptRecommendationsSection');
    if (!container) return;
    
    if (ptRecommendations.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    // Sort alphabetically
    const sorted = [...ptRecommendations].sort((a, b) => 
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
    
    container.innerHTML = sorted.map((rec) => `
        <div class="pt-recommendation-card">
            <div class="pt-recommendation-header">
                <div class="pt-recommendation-title">${escapeHtml(rec.title)}</div>
                ${ptIsAuthenticated ? `
                    <div class="pt-recommendation-actions">
                        <button class="btn btn-primary btn-small" onclick="editRecommendation('${rec.id}')">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="deletePTRecommendation('${rec.id}')">Delete</button>
                    </div>
                ` : ''}
            </div>
            <div class="pt-recommendation-content">${escapeHtml(rec.content)}</div>
        </div>
    `).join('');
}

async function handlePTFileUpload(files) {
    if (!files || files.length === 0) return;
    
    if (!db) {
        try {
            await initDB();
            await initPTDB();
        } catch (error) {
            alert('Error initializing database: ' + error.message);
            return;
        }
    }
    
    const fileArray = Array.from(files);
    let processedCount = 0;
    
    for (let index = 0; index < fileArray.length; index++) {
        const file = fileArray[index];
        const maxSize = 100 * 1024 * 1024;
        
        if (file.size > maxSize) {
            alert(`File "${file.name}" is too large. Maximum size is 100MB.`);
            continue;
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const guide = {
                id: Date.now() + Math.random() + index,
                name: file.name,
                fileType: getFileExtension(file.name),
                size: file.size,
                uploadDate: new Date().toISOString(),
                data: arrayBuffer,
                mimeType: file.type
            };
            
            await savePTGuide(guide);
            ptGuides.push(guide);
            processedCount++;
        } catch (error) {
            alert(`Error uploading file "${file.name}": ${error.message}`);
        }
    }
    
    renderPTGuides();
    if (processedCount > 0) {
        alert(`Successfully uploaded ${processedCount} file(s)!`);
    }
}

function viewPTGuide(index) {
    const guide = ptGuides[index];
    if (!guide) return;
    
    const blob = new Blob([guide.data], { type: guide.mimeType || 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open();
    
    if (guide.mimeType === 'application/pdf' || guide.fileType === 'pdf') {
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(guide.name)}</title></head>
                <body style="margin:0;padding:0;">
                    <embed src="${blobUrl}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100vh;" />
                </body>
            </html>
        `);
    } else {
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(guide.name)}</title></head>
                <body style="margin:20px;font-family:Arial;">
                    <h2>${escapeHtml(guide.name)}</h2>
                    <p>This file type cannot be displayed in the browser. Please download it to view.</p>
                    <button onclick="window.location.href='${blobUrl}'" download="${escapeHtml(guide.name)}" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">
                        Download File
                    </button>
                </body>
            </html>
        `);
    }
    
    newWindow.addEventListener('beforeunload', () => {
        URL.revokeObjectURL(blobUrl);
    });
}

function downloadPTGuide(index) {
    const guide = ptGuides[index];
    if (!guide) return;
    
    const blob = new Blob([guide.data], { type: guide.mimeType || 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = guide.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}

async function renamePTGuide(index) {
    if (!ptIsAuthenticated) {
        alert('You must be authenticated to rename documents.');
        handlePTAdminLogin();
        return;
    }
    
    const guide = ptGuides[index];
    if (!guide) return;
    
    const newName = prompt(`Rename "${guide.name}" to:`, guide.name);
    if (!newName || newName.trim() === '' || newName.trim() === guide.name) return;
    
    try {
        guide.name = newName.trim();
        await savePTGuide(guide);
        const searchInput = document.getElementById('ptSearch');
        renderPTGuides(searchInput ? searchInput.value : '');
    } catch (error) {
        alert('Error renaming document: ' + error.message);
    }
}

async function deletePTGuide(index) {
    if (!ptIsAuthenticated) {
        alert('You must be authenticated to delete documents.');
        handlePTAdminLogin();
        return;
    }
    
    const guide = ptGuides[index];
    if (!guide) return;
    
    if (!confirm(`Are you sure you want to delete "${guide.name}"?`)) return;
    
    try {
        await deletePTGuideFromDB(guide.id);
        ptGuides.splice(index, 1);
        renderPTGuides();
    } catch (error) {
        alert('Error deleting document: ' + error.message);
    }
}

function checkPTAuthentication() {
    const authStatus = sessionStorage.getItem('chcPTAdminAuthenticated');
    ptIsAuthenticated = authStatus === 'true';
    updatePTAuthUI();
}

function updatePTAuthUI() {
    const loginBtn = document.getElementById('ptAdminLoginBtn');
    const logoutBtn = document.getElementById('ptAdminLogoutBtn');
    const uploadBtn = document.getElementById('uploadPtBtn');
    const addRecBtn = document.getElementById('addRecommendationBtn');
    
    if (ptIsAuthenticated) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (uploadBtn) uploadBtn.style.display = 'block';
        if (addRecBtn) addRecBtn.style.display = 'block';
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (uploadBtn) uploadBtn.style.display = 'none';
        if (addRecBtn) addRecBtn.style.display = 'none';
    }
}

function handlePTAdminLogin() {
    const password = prompt('Enter admin password to manage PT guides:');
    if (password === ADMIN_PASSWORD) {
        ptIsAuthenticated = true;
        sessionStorage.setItem('chcPTAdminAuthenticated', 'true');
        updatePTAuthUI();
        const searchInput = document.getElementById('ptSearch');
        renderPTGuides(searchInput ? searchInput.value : '');
        renderPTRecommendations();
        alert('Authentication successful! You can now manage PT guides and recommendations.');
    } else if (password !== null) {
        alert('Incorrect password. Access denied.');
    }
}

function handlePTAdminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        ptIsAuthenticated = false;
        sessionStorage.removeItem('chcPTAdminAuthenticated');
        updatePTAuthUI();
        const searchInput = document.getElementById('ptSearch');
        renderPTGuides(searchInput ? searchInput.value : '');
        renderPTRecommendations();
    }
}

function handlePtUploadClick() {
    if (!ptIsAuthenticated) {
        handlePTAdminLogin();
        if (!ptIsAuthenticated) return;
    }
    
    const fileInput = document.getElementById('ptFileInput');
    if (fileInput) fileInput.click();
}

function showAddRecommendationModal() {
    if (!ptIsAuthenticated) {
        handlePTAdminLogin();
        return;
    }
    
    editingRecommendationId = null;
    document.getElementById('recommendationTitle').value = '';
    document.getElementById('recommendationContent').value = '';
    document.getElementById('recommendationModal').style.display = 'block';
}

function closeRecommendationModal() {
    document.getElementById('recommendationModal').style.display = 'none';
    editingRecommendationId = null;
}

function editRecommendation(id) {
    if (!ptIsAuthenticated) {
        handlePTAdminLogin();
        return;
    }
    
    const rec = ptRecommendations.find(r => r.id === id);
    if (!rec) return;
    
    editingRecommendationId = id;
    document.getElementById('recommendationTitle').value = rec.title;
    document.getElementById('recommendationContent').value = rec.content;
    document.getElementById('recommendationModal').style.display = 'block';
}

async function saveRecommendation() {
    const title = document.getElementById('recommendationTitle').value.trim();
    const content = document.getElementById('recommendationContent').value.trim();
    
    if (!title || !content) {
        alert('Please fill in both title and content.');
        return;
    }
    
    try {
        const recommendation = {
            id: editingRecommendationId || Date.now() + Math.random(),
            title: title,
            content: content,
            createdDate: editingRecommendationId 
                ? ptRecommendations.find(r => r.id === editingRecommendationId)?.createdDate || new Date().toISOString()
                : new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };
        
        await savePTRecommendation(recommendation);
        
        if (editingRecommendationId) {
            const index = ptRecommendations.findIndex(r => r.id === editingRecommendationId);
            if (index !== -1) {
                ptRecommendations[index] = recommendation;
            }
        } else {
            ptRecommendations.push(recommendation);
        }
        
        renderPTRecommendations();
        closeRecommendationModal();
    } catch (error) {
        alert('Error saving recommendation: ' + error.message);
    }
}

async function deletePTRecommendation(id) {
    if (!ptIsAuthenticated) {
        handlePTAdminLogin();
        return;
    }
    
    const rec = ptRecommendations.find(r => r.id === id);
    if (!rec) return;
    
    if (!confirm(`Are you sure you want to delete "${rec.title}"?`)) return;
    
    try {
        await deletePTRecommendationFromDB(id);
        ptRecommendations = ptRecommendations.filter(r => r.id !== id);
        renderPTRecommendations();
    } catch (error) {
        alert('Error deleting recommendation: ' + error.message);
    }
}

async function initializePT() {
    try {
        await initDB();
        await initPTDB();
    } catch (error) {
        console.error('Failed to initialize PT DB:', error);
    }
    
    await loadPTGuides();
    await loadPTRecommendations();
    checkPTAuthentication();
    
    const fileInput = document.getElementById('ptFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            if (!ptIsAuthenticated) {
                alert('You must be authenticated to upload documents.');
                e.target.value = '';
                return;
            }
            if (e.target.files && e.target.files.length > 0) {
                handlePTFileUpload(e.target.files);
                e.target.value = '';
            }
        });
    }
    
    const searchInput = document.getElementById('ptSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            renderPTGuides(e.target.value);
        });
    }
    
    const loginBtn = document.getElementById('ptAdminLoginBtn');
    const logoutBtn = document.getElementById('ptAdminLogoutBtn');
    if (loginBtn) loginBtn.addEventListener('click', handlePTAdminLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', handlePTAdminLogout);
}

// Make PT functions available globally
window.viewPTGuide = viewPTGuide;
window.downloadPTGuide = downloadPTGuide;
window.renamePTGuide = renamePTGuide;
window.deletePTGuide = deletePTGuide;
window.handlePtUploadClick = handlePtUploadClick;
window.showAddRecommendationModal = showAddRecommendationModal;
window.closeRecommendationModal = closeRecommendationModal;
window.editRecommendation = editRecommendation;
window.saveRecommendation = saveRecommendation;
window.deletePTRecommendation = deletePTRecommendation;


