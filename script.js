// Provider data structure
let providers = [];
let shiftAssignments = {
    opening: [],
    mid: [],
    close: []
};

// Hard-coded base providers
const BASE_PROVIDERS = [
    { id: 1, name: 'Ryan', patientsPerHour: 2.2, submitted: true, isBase: true },
    { id: 2, name: 'Kristy', patientsPerHour: 2.2, submitted: true, isBase: true },
    { id: 3, name: 'Mikaela', patientsPerHour: 2.2, submitted: true, isBase: true },
    { id: 4, name: 'Dan', patientsPerHour: 2.2, submitted: true, isBase: true },
    { id: 5, name: 'Johny', patientsPerHour: 2.2, submitted: true, isBase: true },
    { id: 6, name: 'Nicole', patientsPerHour: 2.2, submitted: true, isBase: true },
    { id: 7, name: 'Lauren', patientsPerHour: 2.2, submitted: true, isBase: true }
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
    
    // Initialize DB stores for handouts
    initDB().then(() => {
        initHandoutsDB().catch(err => console.error('Error initializing handouts DB:', err));
    }).catch(err => console.error('Error initializing DB:', err));
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
    
    // Re-render pathways when navigating to pathways page
    if (pageId === 'pathways') {
        const searchInput = document.getElementById('pathwaySearch');
        const currentFilter = searchInput ? searchInput.value : '';
        // Reload custom names to ensure they're fresh, then render
        loadCustomDisplayNames().then(() => {
            // Force recalculation of all display names
            pathways.forEach(pathway => {
                pathway.displayName = getDisplayName(pathway.file, pathway.name, 'pathway');
            });
            renderPathways(currentFilter);
        }).catch(() => {
            // If loading fails, still render with what we have
            renderPathways(currentFilter);
        });
    }
    
    // Initialize PT when navigating to physical therapy page
    if (pageId === 'physical-therapy') {
        initializePT();
    }
    
    // Initialize Handouts when navigating to patient resources page
    if (pageId === 'patient-resources') {
        initializeHandouts();
    }
    
    // Initialize Forms when navigating to forms page
    if (pageId === 'forms') {
        initializeForms();
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

// GitHub configuration - Update this with your repository URL
// For GitHub Pages, use the raw.githubusercontent.com URL:
// Format: https://raw.githubusercontent.com/USERNAME/REPO-NAME/BRANCH
// Example: https://raw.githubusercontent.com/yourusername/Patient-Calculator/main
// 
// For local development, this will auto-detect. For GitHub Pages, uncomment and set:
// const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main';

// Auto-detect: if on GitHub Pages, use raw.githubusercontent.com, otherwise use local path
let GITHUB_BASE_URL;
if (window.location.hostname.includes('github.io') || window.location.hostname.includes('github.com')) {
    // Extract repo info from GitHub Pages URL
    const pathParts = window.location.pathname.split('/').filter(p => p);
    if (pathParts.length >= 2) {
        const username = pathParts[0];
        const repo = pathParts[1];
        GITHUB_BASE_URL = `https://raw.githubusercontent.com/${username}/${repo}/main`;
    } else {
        // Fallback to local
        GITHUB_BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    }
} else {
    // Local development
    GITHUB_BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
}

let pathways = [];

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
            // Create handouts store if it doesn't exist
            if (!db.objectStoreNames.contains('handouts')) {
                const handoutsStore = db.createObjectStore('handouts', { keyPath: 'id' });
                handoutsStore.createIndex('name', 'name', { unique: false });
                console.log('IndexedDB handouts store created');
            }
        };
    });
}

async function loadPathways() {
    try {
        // Load manifest from GitHub
        const manifestUrl = `${GITHUB_BASE_URL}/documents/pathways-manifest.json`;
        console.log('Loading pathways from:', manifestUrl);
        
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            throw new Error(`Failed to load pathways manifest: ${response.statusText}`);
        }
        
        const manifest = await response.json();
        await loadCustomDisplayNames(); // Load custom names from GitHub
        pathways = manifest.map((item, index) => {
            return {
                id: index,
                file: item.file,
                name: item.name,
                displayName: getDisplayName(item.file, item.name, 'pathway'),
                fileType: item.type || getFileExtension(item.name),
                url: `${GITHUB_BASE_URL}/documents/${item.file}`
            };
        });
        
        console.log('Loaded', pathways.length, 'pathways from GitHub');
        renderPathways();
        return pathways;
    } catch (error) {
        console.error('Error loading pathways:', error);
        pathways = [];
        renderPathways();
        // Show user-friendly error
        const container = document.getElementById('pathwaysList');
        if (container) {
            container.innerHTML = `
                <div class="empty-pathways">
                    <div class="empty-icon">⚠️</div>
                    <h3>Unable to Load Documents</h3>
                    <p>Could not load pathways from GitHub. Please check the repository configuration.</p>
                </div>
            `;
        }
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
    
    // Recalculate display names to ensure they're up to date
    pathways.forEach(pathway => {
        pathway.displayName = getDisplayName(pathway.file, pathway.name, 'pathway');
    });
    
    let filteredPathways = [...pathways]; // Create a copy to avoid mutating original
    
    // Apply filter if provided
    if (filter) {
        const searchLower = filter.toLowerCase();
        filteredPathways = filteredPathways.filter(p => 
            (p.displayName || p.name).toLowerCase().includes(searchLower) ||
            p.name.toLowerCase().includes(searchLower) ||
            (p.description && p.description.toLowerCase().includes(searchLower))
        );
    }
    
    // Sort alphabetically by display name
    filteredPathways.sort((a, b) => {
        const nameA = (a.displayName || a.name).toLowerCase();
        const nameB = (b.displayName || b.name).toLowerCase();
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
                const displayName = pathway.displayName || pathway.name;
                return `
                    <div class="pathway-list-item" onclick="viewPathway(${actualIndex})">
                        <div class="pathway-list-icon">${fileIcon}</div>
                        <div class="pathway-list-info">
                            <div class="pathway-list-name">${escapeHtml(displayName)}</div>
                        </div>
                        <div class="pathway-list-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-primary btn-small" onclick="viewPathway(${actualIndex})">View</button>
                            <button class="btn btn-secondary btn-small" onclick="downloadPathway(${actualIndex})">Download</button>
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
    
    // Open document from GitHub URL
    const newWindow = window.open();
    if (pathway.fileType === 'pdf') {
        // For PDFs, embed directly
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(pathway.name)}</title></head>
                <body style="margin:0;padding:0;">
                    <embed src="${pathway.url}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100vh;" />
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
                    <button onclick="window.location.href='${pathway.url}'" download="${escapeHtml(pathway.name)}" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">
                        Download File
                    </button>
                </body>
            </html>
        `);
    }
}

function downloadPathway(index) {
    const pathway = pathways[index];
    if (!pathway) return;
    
    // Direct download from GitHub
    const link = document.createElement('a');
    link.href = pathway.url;
    link.download = pathway.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function renamePathway(index) {
    const pathway = pathways[index];
    if (!pathway) return;
    
    const currentName = pathway.displayName || pathway.name;
    const newName = prompt(`Rename "${currentName}" to:`, currentName);
    
    if (!newName || newName.trim() === '') {
        return; // User cancelled or entered empty name
    }
    
    const trimmedName = newName.trim();
    if (trimmedName === currentName) {
        return; // Name unchanged
    }
    
    // Update custom display name in memory
    if (!customDisplayNames.pathways) {
        customDisplayNames.pathways = {};
    }
    customDisplayNames.pathways[pathway.file] = trimmedName;
    
    // Update the pathway's display name
    pathway.displayName = trimmedName;
    
    // Show updated JSON for user to copy
    const updatedJSON = generateCustomNamesJSON();
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;padding:30px;border-radius:12px;max-width:600px;max-height:80vh;overflow:auto;">
            <h3 style="margin-top:0;color:#667eea;">Update custom-display-names.json</h3>
            <p>Copy this JSON and update <code>documents/custom-display-names.json</code> in your repository:</p>
            <textarea readonly style="width:100%;height:200px;font-family:monospace;font-size:12px;padding:10px;border:2px solid #ddd;border-radius:6px;">${updatedJSON}</textarea>
            <div style="margin-top:15px;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="const textarea = this.closest('div[style*=\"position:fixed\"]').querySelector('textarea'); navigator.clipboard.writeText(textarea.value); alert('Copied to clipboard!'); this.closest('div[style*=\"position:fixed\"]').remove();" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">Copy & Close</button>
                <button onclick="this.closest('div[style*=\"position:fixed\"]').remove();" style="padding:10px 20px;background:#718096;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Also save to localStorage as temporary cache
    localStorage.setItem('chcCustomDisplayNames', JSON.stringify(customDisplayNames));
    
    // Re-render (preserve current search filter)
    const searchInput = document.getElementById('pathwaySearch');
    const currentFilter = searchInput ? searchInput.value : '';
    renderPathways(currentFilter);
}

async function deletePathway(index) {
    alert('To delete documents, remove them from the pathways-manifest.json file and delete the file from the documents/pathways folder in the repository.');
}


async function initializePathways() {
    await loadPathways();
    
    // Search handler
    const searchInput = document.getElementById('pathwaySearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            renderPathways(e.target.value);
        });
    }
}

// Make functions available globally
window.viewPathway = viewPathway;
window.downloadPathway = downloadPathway;
window.renamePathway = renamePathway;
window.deletePathway = deletePathway;

// ==================== Physical Therapy System ====================

const PT_STORE_NAME = 'ptGuides';
const PT_RECOMMENDATIONS_STORE = 'ptRecommendations';

let ptGuides = [];

// Store custom display names (admin-only feature)
let customDisplayNames = {
    pathways: {},
    ptGuides: {},
    handouts: {},
    forms: {}
};

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
        // Load manifest from GitHub
        const manifestUrl = `${GITHUB_BASE_URL}/documents/pt-manifest.json`;
        console.log('Loading PT guides from:', manifestUrl);
        
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            throw new Error(`Failed to load PT manifest: ${response.statusText}`);
        }
        
        const manifest = await response.json();
        await loadCustomDisplayNames(); // Load custom names from GitHub
        ptGuides = manifest.map((item, index) => {
            return {
                id: index,
                file: item.file,
                name: item.name,
                displayName: getDisplayName(item.file, item.name, 'pt'),
                fileType: item.type || getFileExtension(item.name),
                url: `${GITHUB_BASE_URL}/documents/${item.file}`
            };
        });
        
        console.log('Loaded', ptGuides.length, 'PT guides from GitHub');
        renderPTGuides();
        return ptGuides;
    } catch (error) {
        console.error('Error loading PT guides:', error);
        ptGuides = [];
        renderPTGuides();
    }
}

// Load custom display names from localStorage
// Load custom display names from GitHub
async function loadCustomDisplayNames() {
    try {
        const namesUrl = `${GITHUB_BASE_URL}/documents/custom-display-names.json`;
        console.log('Loading custom display names from:', namesUrl);
        const response = await fetch(namesUrl);
        
        if (response.ok) {
            const data = await response.json();
            customDisplayNames = data;
            console.log('Custom display names loaded:', customDisplayNames);
            console.log('Pathways keys:', Object.keys(customDisplayNames.pathways || {}));
    } else {
        console.warn('Custom display names file not found (status:', response.status, '), using defaults');
            if (!customDisplayNames) {
                customDisplayNames = { pathways: {}, ptGuides: {}, handouts: {} };
            }
        }
    } catch (error) {
        console.error('Error loading custom display names:', error);
        // Fallback to localStorage if GitHub load fails
        const saved = localStorage.getItem('chcCustomDisplayNames');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                customDisplayNames = parsed;
                console.log('✓ Loaded custom display names from localStorage:', customDisplayNames);
            } catch (e) {
                console.error('Error parsing localStorage custom names:', e);
                if (!customDisplayNames) {
                    customDisplayNames = { pathways: {}, ptGuides: {}, handouts: {}, forms: {} };
                }
            }
        } else {
            if (!customDisplayNames) {
                customDisplayNames = { pathways: {}, ptGuides: {}, handouts: {}, forms: {} };
            }
        }
    }
    
    // Ensure structure exists
    if (!customDisplayNames.pathways) {
        customDisplayNames.pathways = {};
    }
    if (!customDisplayNames.ptGuides) {
        customDisplayNames.ptGuides = {};
    }
    if (!customDisplayNames.handouts) {
        customDisplayNames.handouts = {};
    }
    if (!customDisplayNames.forms) {
        customDisplayNames.forms = {};
    }
}

// Get display name for a file (custom name or original)
function getDisplayName(filePath, originalName, type) {
    // filePath is like "pathways/file.pdf" or "pt-guides/file.pdf" or "handouts/file.pdf"
    let category;
    if (type === 'pathway') {
        category = 'pathways';
    } else if (type === 'pt') {
        category = 'ptGuides';
    } else if (type === 'handout') {
        category = 'handouts';
    } else if (type === 'form') {
        category = 'forms';
    } else {
        category = 'pathways'; // default
    }
    
    // Ensure customDisplayNames is initialized
    if (!customDisplayNames) {
        customDisplayNames = { pathways: {}, ptGuides: {}, handouts: {}, forms: {} };
    }
    if (!customDisplayNames[category]) {
        customDisplayNames[category] = {};
    }
    
    // Debug for Measles file
    if (filePath.includes('Measles')) {
        console.log('getDisplayName called for Measles:', {
            filePath,
            category,
            availableKeys: Object.keys(customDisplayNames[category] || {}),
            customDisplayNames: customDisplayNames[category]
        });
    }
    
    const customName = customDisplayNames[category][filePath];
    if (customName) {
        if (filePath.includes('Measles')) {
            console.log('Found custom name for Measles:', customName);
        }
        return customName;
    }
    if (filePath.includes('Measles')) {
        console.log('No custom name found for Measles, using original:', originalName);
    }
    return originalName;
}

// Generate updated JSON content for the custom-display-names.json file
function generateCustomNamesJSON() {
    return JSON.stringify(customDisplayNames, null, 2);
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

// Language detection and grouping functions
function parseLanguageFromFileName(fileName) {
    // Remove file extension
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
    
    // Common language indicators
    const languagePatterns = {
        'spanish': ['spanish', 'español', 'espanol', 'esp'],
        'french': ['french', 'français', 'francais', 'fr'],
        'german': ['german', 'deutsch', 'de'],
        'chinese': ['chinese', '中文', 'ch'],
        'japanese': ['japanese', '日本語', 'ja'],
        'korean': ['korean', '한국어', 'ko'],
        'portuguese': ['portuguese', 'português', 'portugues', 'pt'],
        'italian': ['italian', 'italiano', 'it'],
        'russian': ['russian', 'русский', 'ru']
    };
    
    // Check for language indicators (using word boundaries for short patterns to avoid false matches)
    for (const [lang, patterns] of Object.entries(languagePatterns)) {
        for (const pattern of patterns) {
            // For short patterns (2-3 chars), use word boundaries to avoid false matches
            // For longer patterns, use simple includes check
            if (pattern.length <= 3) {
                const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                if (regex.test(nameWithoutExt)) {
                    return lang;
                }
            } else {
                if (nameWithoutExt.includes(pattern)) {
                    return lang;
                }
            }
        }
    }
    
    // Default to English if no language indicator found
    return 'english';
}

function getBaseName(fileName) {
    // Remove file extension
    let nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // Remove language indicators to get base name
    const languagePatterns = [
        'spanish', 'español', 'espanol', 'esp',
        'french', 'français', 'francais', 'fr',
        'german', 'deutsch', 'de',
        'chinese', '中文', 'ch',
        'japanese', '日本語', 'ja',
        'korean', '한국어', 'ko',
        'portuguese', 'português', 'portugues', 'pt',
        'italian', 'italiano', 'it',
        'russian', 'русский', 'ru'
    ];
    
    const nameLower = nameWithoutExt.toLowerCase();
    for (const pattern of languagePatterns) {
        const regex = new RegExp(`\\s*${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
        nameWithoutExt = nameWithoutExt.replace(regex, '').trim();
    }
    
    return nameWithoutExt;
}

function groupGuidesByLanguage(guides) {
    const grouped = {};
    
    guides.forEach(guide => {
        const baseName = getBaseName(guide.name);
        const language = parseLanguageFromFileName(guide.name);
        
        if (!grouped[baseName]) {
            grouped[baseName] = {};
        }
        
        grouped[baseName][language] = guide;
    });
    
    return grouped;
}

function getLanguageDisplayName(language) {
    const displayNames = {
        'english': 'English',
        'spanish': 'Spanish',
        'french': 'French',
        'german': 'German',
        'chinese': 'Chinese',
        'japanese': 'Japanese',
        'korean': 'Korean',
        'portuguese': 'Portuguese',
        'italian': 'Italian',
        'russian': 'Russian'
    };
    return displayNames[language] || language.charAt(0).toUpperCase() + language.slice(1);
}

function renderPTGuides(filter = '') {
    const container = document.getElementById('ptList');
    if (!container) return;
    
    let filteredGuides = [...ptGuides];
    
    if (filter) {
        const searchLower = filter.toLowerCase();
        filteredGuides = filteredGuides.filter(g => 
            g.name.toLowerCase().includes(searchLower) ||
            (g.displayName && g.displayName.toLowerCase().includes(searchLower))
        );
    }
    
    // Group guides by base name and language
    const groupedGuides = groupGuidesByLanguage(filteredGuides);
    
    if (Object.keys(groupedGuides).length === 0 && ptGuides.length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">🏃</div>
                <h3>No Physical Therapy Guides Yet</h3>
                <p>Physical therapy guides are managed by administrators. Contact your administrator to add documents.</p>
            </div>
        `;
        return;
    }
    
    if (Object.keys(groupedGuides).length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">🔍</div>
                <h3>No Guides Found</h3>
                <p>No guides match your search criteria.</p>
            </div>
        `;
        return;
    }
    
    // Sort base names alphabetically
    const sortedBaseNames = Object.keys(groupedGuides).sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    container.innerHTML = `
        <div class="pathway-list-container">
            ${sortedBaseNames.map((baseName) => {
                const languageVersions = groupedGuides[baseName];
                const languages = Object.keys(languageVersions);
                const hasMultipleLanguages = languages.length > 1;
                
                // Get English version if available, otherwise get the first one
                const defaultGuide = languageVersions['english'] || languageVersions[languages[0]];
                const defaultIndex = ptGuides.findIndex(g => g.id === defaultGuide.id);
                
                const fileIcon = getFileIcon(defaultGuide.fileType);
                const displayName = defaultGuide.displayName || baseName;
                
                // Get non-English languages only
                const nonEnglishLanguages = languages.filter(lang => lang !== 'english').sort();
                const hasNonEnglishLanguages = nonEnglishLanguages.length > 0;
                
                // Generate language buttons for non-English languages only
                const escapedBaseNameForButtons = baseName.replace(/'/g, "\\'");
                const languageButton = hasNonEnglishLanguages ? nonEnglishLanguages.map(lang => {
                    const langGuide = languageVersions[lang];
                    return `
                        <button class="btn btn-small btn-secondary language-btn" 
                                onclick="event.stopPropagation(); viewPTGuideByLanguage('${escapedBaseNameForButtons}', '${lang}')"
                                title="View ${getLanguageDisplayName(lang)} version">
                            ${getLanguageDisplayName(lang)}
                        </button>
                    `;
                }).join('') : '';
                
                // Always open English by default when clicking the main item (or first available if no English)
                const defaultLanguage = languageVersions['english'] ? 'english' : languages[0];
                const escapedBaseName = baseName.replace(/'/g, "\\'");
                
                return `
                    <div class="pathway-list-item" onclick="viewPTGuideByLanguage('${escapedBaseName}', '${defaultLanguage}')">
                        <div class="pathway-list-icon">${fileIcon}</div>
                        <div class="pathway-list-info" style="flex: 1; display: flex; align-items: center; gap: 12px;">
                            <div class="pathway-list-name">${escapeHtml(displayName)}</div>
                            ${languageButton}
                        </div>
                        <div class="pathway-list-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-primary btn-small" onclick="viewPTGuideByLanguage('${escapedBaseName}', '${defaultLanguage}')">View</button>
                            <button class="btn btn-secondary btn-small" onclick="downloadPTGuide(${defaultIndex})">Download</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
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
    
    // Open document from GitHub URL (defaults to English)
    openPTGuideWindow(guide);
}

function viewPTGuideByLanguage(baseName, language) {
    // Find the guide with matching base name and language
    const guide = ptGuides.find(g => {
        const guideBaseName = getBaseName(g.name);
        const guideLanguage = parseLanguageFromFileName(g.name);
        return guideBaseName === baseName && guideLanguage === language;
    });
    
    if (guide) {
        openPTGuideWindow(guide);
    }
}

function openPTGuideWindow(guide) {
    // Open document from GitHub URL
    const newWindow = window.open();
    if (guide.fileType === 'pdf') {
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(guide.name)}</title></head>
                <body style="margin:0;padding:0;">
                    <embed src="${guide.url}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100vh;" />
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
                    <button onclick="window.location.href='${guide.url}'" download="${escapeHtml(guide.name)}" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">
                        Download File
                    </button>
                </body>
            </html>
        `);
    }
}

function downloadPTGuide(index) {
    const guide = ptGuides[index];
    if (!guide) return;
    
    // Direct download from GitHub
    const link = document.createElement('a');
    link.href = guide.url;
    link.download = guide.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function renamePTGuide(index) {
    const guide = ptGuides[index];
    if (!guide) return;
    
    const currentName = guide.displayName || guide.name;
    const newName = prompt(`Rename "${currentName}" to:`, currentName);
    
    if (!newName || newName.trim() === '') {
        return; // User cancelled or entered empty name
    }
    
    const trimmedName = newName.trim();
    if (trimmedName === currentName) {
        return; // Name unchanged
    }
    
    // Update custom display name in memory
    if (!customDisplayNames.ptGuides) {
        customDisplayNames.ptGuides = {};
    }
    customDisplayNames.ptGuides[guide.file] = trimmedName;
    
    // Update the guide's display name
    guide.displayName = trimmedName;
    
    // Show updated JSON for user to copy
    const updatedJSON = generateCustomNamesJSON();
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;padding:30px;border-radius:12px;max-width:600px;max-height:80vh;overflow:auto;">
            <h3 style="margin-top:0;color:#667eea;">Update custom-display-names.json</h3>
            <p>Copy this JSON and update <code>documents/custom-display-names.json</code> in your repository:</p>
            <textarea readonly style="width:100%;height:200px;font-family:monospace;font-size:12px;padding:10px;border:2px solid #ddd;border-radius:6px;">${updatedJSON}</textarea>
            <div style="margin-top:15px;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="const textarea = this.closest('div[style*=\"position:fixed\"]').querySelector('textarea'); navigator.clipboard.writeText(textarea.value); alert('Copied to clipboard!'); this.closest('div[style*=\"position:fixed\"]').remove();" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">Copy & Close</button>
                <button onclick="this.closest('div[style*=\"position:fixed\"]').remove();" style="padding:10px 20px;background:#718096;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Also save to localStorage as temporary cache
    localStorage.setItem('chcCustomDisplayNames', JSON.stringify(customDisplayNames));
    
    // Re-render
    const searchInput = document.getElementById('ptSearch');
    renderPTGuides(searchInput ? searchInput.value : '');
}

async function deletePTGuide(index) {
    alert('To delete documents, remove them from the pt-manifest.json file and delete the file from the documents/pt-guides folder in the repository.');
}



async function initializePT() {
    await loadPTGuides();
    
    const searchInput = document.getElementById('ptSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            renderPTGuides(e.target.value);
        });
    }
}

// Make PT functions available globally
window.viewPTGuide = viewPTGuide;
window.viewPTGuideByLanguage = viewPTGuideByLanguage;
window.downloadPTGuide = downloadPTGuide;
window.renamePTGuide = renamePTGuide;
window.deletePTGuide = deletePTGuide;

// ==================== Patient Resources (Handouts) System ====================

const HANDOUTS_STORE_NAME = 'handouts';
let handouts = [];

// ==================== Forms System ====================

const FORMS_STORE_NAME = 'forms';
let forms = [];

// Initialize Handouts DB stores
function initHandoutsDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            initDB().then(() => {
                initHandoutsStores().then(resolve).catch(reject);
            }).catch(reject);
        } else {
            initHandoutsStores().then(resolve).catch(reject);
        }
    });
}

function initHandoutsStores() {
    return new Promise((resolve, reject) => {
        const needsHandoutsStore = !db.objectStoreNames.contains(HANDOUTS_STORE_NAME);
        
        if (needsHandoutsStore) {
            const currentVersion = db.version;
            db.close();
            const newVersion = currentVersion + 1;
            const request = indexedDB.open(DB_NAME, newVersion);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (needsHandoutsStore && !db.objectStoreNames.contains(HANDOUTS_STORE_NAME)) {
                    const objectStore = db.createObjectStore(HANDOUTS_STORE_NAME, { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                    console.log('IndexedDB handouts store created');
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
            resolve(db);
        }
    });
}

async function loadHandouts() {
    try {
        // Load manifest from GitHub
        const manifestUrl = `${GITHUB_BASE_URL}/documents/handouts-manifest.json`;
        console.log('Loading handouts from:', manifestUrl);
        
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            throw new Error(`Failed to load handouts manifest: ${response.statusText}`);
        }
        
        const manifest = await response.json();
        await loadCustomDisplayNames(); // Load custom names from GitHub
        handouts = manifest.map((item, index) => {
            return {
                id: index,
                file: item.file,
                name: item.name,
                displayName: getDisplayName(item.file, item.name, 'handout'),
                fileType: item.type || getFileExtension(item.name),
                url: `${GITHUB_BASE_URL}/documents/${item.file}`
            };
        });
        
        console.log('Loaded', handouts.length, 'handouts from GitHub');
        renderHandouts();
        return handouts;
    } catch (error) {
        console.error('Error loading handouts:', error);
        handouts = [];
        renderHandouts();
    }
}

async function saveHandout(handout) {
    try {
        if (!db) await initDB();
        if (!db.objectStoreNames.contains(HANDOUTS_STORE_NAME)) await initHandoutsDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([HANDOUTS_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(HANDOUTS_STORE_NAME);
            const request = store.put(handout);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        throw error;
    }
}

function renderHandouts(filter = '') {
    const container = document.getElementById('handoutsList');
    if (!container) return;
    
    // Recalculate display names to ensure they're up to date
    handouts.forEach(handout => {
        handout.displayName = getDisplayName(handout.file, handout.name, 'handout');
    });
    
    let filteredHandouts = [...handouts];
    
    // Apply filter if provided
    if (filter) {
        const searchLower = filter.toLowerCase();
        filteredHandouts = filteredHandouts.filter(h => 
            (h.displayName || h.name).toLowerCase().includes(searchLower) ||
            h.name.toLowerCase().includes(searchLower)
        );
    }
    
    // Sort alphabetically by display name
    filteredHandouts.sort((a, b) => {
        const nameA = (a.displayName || a.name).toLowerCase();
        const nameB = (b.displayName || b.name).toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    if (filteredHandouts.length === 0 && handouts.length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">📢</div>
                <h3>No Patient Resources Yet</h3>
                <p>Patient resources are managed by administrators. Contact your administrator to add documents.</p>
            </div>
        `;
        return;
    }
    
    if (filteredHandouts.length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">🔍</div>
                <h3>No Resources Found</h3>
                <p>No resources match your search criteria.</p>
            </div>
        `;
        return;
    }
    
    // Create list HTML
    container.innerHTML = `
        <div class="pathway-list-container">
            ${filteredHandouts.map((handout) => {
                const fileIcon = getFileIcon(handout.fileType);
                // Find the actual index in the original handouts array
                const actualIndex = handouts.findIndex(h => h.id === handout.id);
                const displayName = handout.displayName || handout.name;
                return `
                    <div class="pathway-list-item" onclick="viewHandout(${actualIndex})">
                        <div class="pathway-list-icon">${fileIcon}</div>
                        <div class="pathway-list-info">
                            <div class="pathway-list-name">${escapeHtml(displayName)}</div>
                        </div>
                        <div class="pathway-list-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-primary btn-small" onclick="viewHandout(${actualIndex})">View</button>
                            <button class="btn btn-secondary btn-small" onclick="downloadHandout(${actualIndex})">Download</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function viewHandout(index) {
    const handout = handouts[index];
    if (!handout) return;
    
    // Open document from GitHub URL
    const newWindow = window.open();
    if (handout.fileType === 'pdf') {
        // For PDFs, embed directly
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(handout.name)}</title></head>
                <body style="margin:0;padding:0;">
                    <embed src="${handout.url}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100vh;" />
                </body>
            </html>
        `);
    } else {
        // For other files, try to display or download
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(handout.name)}</title></head>
                <body style="margin:20px;font-family:Arial;">
                    <h2>${escapeHtml(handout.name)}</h2>
                    <p>This file type cannot be displayed in the browser. Please download it to view.</p>
                    <button onclick="window.location.href='${handout.url}'" download="${escapeHtml(handout.name)}" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">
                        Download File
                    </button>
                </body>
            </html>
        `);
    }
}

function downloadHandout(index) {
    const handout = handouts[index];
    if (!handout) return;
    
    // Direct download from GitHub
    const link = document.createElement('a');
    link.href = handout.url;
    link.download = handout.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function renameHandout(index) {
    const handout = handouts[index];
    if (!handout) return;
    
    const currentName = handout.displayName || handout.name;
    const newName = prompt(`Rename "${currentName}" to:`, currentName);
    
    if (!newName || newName.trim() === '') {
        return; // User cancelled or entered empty name
    }
    
    const trimmedName = newName.trim();
    if (trimmedName === currentName) {
        return; // Name unchanged
    }
    
    // Update custom display name in memory
    if (!customDisplayNames.handouts) {
        customDisplayNames.handouts = {};
    }
    customDisplayNames.handouts[handout.file] = trimmedName;
    
    // Update the handout's display name
    handout.displayName = trimmedName;
    
    // Show updated JSON for user to copy
    const updatedJSON = generateCustomNamesJSON();
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;padding:30px;border-radius:12px;max-width:600px;max-height:80vh;overflow:auto;">
            <h3 style="margin-top:0;color:#667eea;">Update custom-display-names.json</h3>
            <p>Copy this JSON and update <code>documents/custom-display-names.json</code> in your repository:</p>
            <textarea readonly style="width:100%;height:200px;font-family:monospace;font-size:12px;padding:10px;border:2px solid #ddd;border-radius:6px;">${updatedJSON}</textarea>
            <div style="margin-top:15px;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="const textarea = this.closest('div[style*=\"position:fixed\"]').querySelector('textarea'); navigator.clipboard.writeText(textarea.value); alert('Copied to clipboard!'); this.closest('div[style*=\"position:fixed\"]').remove();" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">Copy & Close</button>
                <button onclick="this.closest('div[style*=\"position:fixed\"]').remove();" style="padding:10px 20px;background:#718096;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Also save to localStorage as temporary cache
    localStorage.setItem('chcCustomDisplayNames', JSON.stringify(customDisplayNames));
    
    // Re-render (preserve current search filter)
    const searchInput = document.getElementById('handoutsSearch');
    const currentFilter = searchInput ? searchInput.value : '';
    renderHandouts(currentFilter);
}

async function deleteHandout(index) {
    alert('To delete documents, remove them from the handouts-manifest.json file and delete the file from the documents/handouts folder in the repository.');
}

async function initializeHandouts() {
    await loadHandouts();
    
    const searchInput = document.getElementById('handoutsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            renderHandouts(e.target.value);
        });
    }
}

// Make handouts functions available globally
window.viewHandout = viewHandout;
window.downloadHandout = downloadHandout;
window.renameHandout = renameHandout;
window.deleteHandout = deleteHandout;

// ==================== Forms System ====================

async function loadForms() {
    try {
        // Load manifest from GitHub
        const manifestUrl = `${GITHUB_BASE_URL}/documents/forms-manifest.json`;
        console.log('Loading forms from:', manifestUrl);
        
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            throw new Error(`Failed to load forms manifest: ${response.statusText}`);
        }
        
        const manifest = await response.json();
        await loadCustomDisplayNames(); // Load custom names from GitHub
        forms = manifest.map((item, index) => {
            return {
                id: index,
                file: item.file,
                name: item.name,
                displayName: getDisplayName(item.file, item.name, 'form'),
                fileType: item.type || getFileExtension(item.name),
                url: `${GITHUB_BASE_URL}/documents/${item.file}`
            };
        });
        
        console.log('Loaded', forms.length, 'forms from GitHub');
        renderForms();
        return forms;
    } catch (error) {
        console.error('Error loading forms:', error);
        forms = [];
        renderForms();
    }
}

function renderForms(filter = '') {
    const container = document.getElementById('formsList');
    if (!container) return;
    
    // Recalculate display names to ensure they're up to date
    forms.forEach(form => {
        form.displayName = getDisplayName(form.file, form.name, 'form');
    });
    
    let filteredForms = [...forms];
    
    // Apply filter if provided
    if (filter) {
        const searchLower = filter.toLowerCase();
        filteredForms = filteredForms.filter(f => 
            (f.displayName || f.name).toLowerCase().includes(searchLower) ||
            f.name.toLowerCase().includes(searchLower)
        );
    }
    
    // Group forms by base name and language
    const groupedForms = groupGuidesByLanguage(filteredForms);
    
    if (Object.keys(groupedForms).length === 0 && forms.length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">📝</div>
                <h3>No Forms Yet</h3>
                <p>Forms are managed by administrators. Contact your administrator to add documents.</p>
            </div>
        `;
        return;
    }
    
    if (Object.keys(groupedForms).length === 0) {
        container.innerHTML = `
            <div class="empty-pathways">
                <div class="empty-icon">🔍</div>
                <h3>No Forms Found</h3>
                <p>No forms match your search criteria.</p>
            </div>
        `;
        return;
    }
    
    // Sort base names alphabetically
    const sortedBaseNames = Object.keys(groupedForms).sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    container.innerHTML = `
        <div class="pathway-list-container">
            ${sortedBaseNames.map((baseName) => {
                const languageVersions = groupedForms[baseName];
                const languages = Object.keys(languageVersions);
                const hasMultipleLanguages = languages.length > 1;
                
                // Get English version if available, otherwise get the first one
                const defaultForm = languageVersions['english'] || languageVersions[languages[0]];
                const defaultIndex = forms.findIndex(f => f.id === defaultForm.id);
                
                const fileIcon = getFileIcon(defaultForm.fileType);
                const displayName = defaultForm.displayName || baseName;
                
                // Get non-English languages only
                const nonEnglishLanguages = languages.filter(lang => lang !== 'english').sort();
                const hasNonEnglishLanguages = nonEnglishLanguages.length > 0;
                
                // Generate language buttons for non-English languages only
                const escapedBaseNameForButtons = baseName.replace(/'/g, "\\'");
                const languageButton = hasNonEnglishLanguages ? nonEnglishLanguages.map(lang => {
                    const langForm = languageVersions[lang];
                    return `
                        <button class="btn btn-small btn-secondary language-btn" 
                                onclick="event.stopPropagation(); viewFormByLanguage('${escapedBaseNameForButtons}', '${lang}')"
                                title="View ${getLanguageDisplayName(lang)} version">
                            ${getLanguageDisplayName(lang)}
                        </button>
                    `;
                }).join('') : '';
                
                // Always open English by default when clicking the main item (or first available if no English)
                const defaultLanguage = languageVersions['english'] ? 'english' : languages[0];
                const escapedBaseName = baseName.replace(/'/g, "\\'");
                
                return `
                    <div class="pathway-list-item" onclick="viewFormByLanguage('${escapedBaseName}', '${defaultLanguage}')">
                        <div class="pathway-list-icon">${fileIcon}</div>
                        <div class="pathway-list-info" style="flex: 1; display: flex; align-items: center; gap: 12px;">
                            <div class="pathway-list-name">${escapeHtml(displayName)}</div>
                            ${languageButton}
                        </div>
                        <div class="pathway-list-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-primary btn-small" onclick="viewFormByLanguage('${escapedBaseName}', '${defaultLanguage}')">View</button>
                            <button class="btn btn-secondary btn-small" onclick="downloadForm(${defaultIndex})">Download</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function viewForm(index) {
    const form = forms[index];
    if (!form) return;
    
    // Open document from GitHub URL (defaults to English)
    openFormWindow(form);
}

function viewFormByLanguage(baseName, language) {
    // Find the form with matching base name and language
    const form = forms.find(f => {
        const formBaseName = getBaseName(f.name);
        const formLanguage = parseLanguageFromFileName(f.name);
        return formBaseName === baseName && formLanguage === language;
    });
    
    if (form) {
        openFormWindow(form);
    }
}

function openFormWindow(form) {
    // Open document from GitHub URL
    const newWindow = window.open();
    if (form.fileType === 'pdf') {
        // For PDFs, embed directly
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(form.name)}</title></head>
                <body style="margin:0;padding:0;">
                    <embed src="${form.url}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;width:100%;height:100vh;" />
                </body>
            </html>
        `);
    } else {
        // For other files, try to display or download
        newWindow.document.write(`
            <html>
                <head><title>${escapeHtml(form.name)}</title></head>
                <body style="margin:20px;font-family:Arial;">
                    <h2>${escapeHtml(form.name)}</h2>
                    <p>This file type cannot be displayed in the browser. Please download it to view.</p>
                    <button onclick="window.location.href='${form.url}'" download="${escapeHtml(form.name)}" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">
                        Download File
                    </button>
                </body>
            </html>
        `);
    }
}

function downloadForm(index) {
    const form = forms[index];
    if (!form) return;
    
    // Direct download from GitHub
    const link = document.createElement('a');
    link.href = form.url;
    link.download = form.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function renameForm(index) {
    const form = forms[index];
    if (!form) return;
    
    const currentName = form.displayName || form.name;
    const newName = prompt(`Rename "${currentName}" to:`, currentName);
    
    if (!newName || newName.trim() === '') {
        return; // User cancelled or entered empty name
    }
    
    const trimmedName = newName.trim();
    if (trimmedName === currentName) {
        return; // Name unchanged
    }
    
    // Update custom display name in memory
    if (!customDisplayNames.forms) {
        customDisplayNames.forms = {};
    }
    customDisplayNames.forms[form.file] = trimmedName;
    
    // Update the form's display name
    form.displayName = trimmedName;
    
    // Show updated JSON for user to copy
    const updatedJSON = generateCustomNamesJSON();
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;padding:30px;border-radius:12px;max-width:600px;max-height:80vh;overflow:auto;">
            <h3 style="margin-top:0;color:#667eea;">Update custom-display-names.json</h3>
            <p>Copy this JSON and update <code>documents/custom-display-names.json</code> in your repository:</p>
            <textarea readonly style="width:100%;height:200px;font-family:monospace;font-size:12px;padding:10px;border:2px solid #ddd;border-radius:6px;">${updatedJSON}</textarea>
            <div style="margin-top:15px;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="const textarea = this.closest('div[style*=\"position:fixed\"]').querySelector('textarea'); navigator.clipboard.writeText(textarea.value); alert('Copied to clipboard!'); this.closest('div[style*=\"position:fixed\"]').remove();" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">Copy & Close</button>
                <button onclick="this.closest('div[style*=\"position:fixed\"]').remove();" style="padding:10px 20px;background:#718096;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Also save to localStorage as temporary cache
    localStorage.setItem('chcCustomDisplayNames', JSON.stringify(customDisplayNames));
    
    // Re-render (preserve current search filter)
    const searchInput = document.getElementById('formsSearch');
    const currentFilter = searchInput ? searchInput.value : '';
    renderForms(currentFilter);
}

async function deleteForm(index) {
    alert('To delete documents, remove them from the forms-manifest.json file and delete the file from the documents/handouts folder in the repository.');
}

async function initializeForms() {
    await loadForms();
    
    const searchInput = document.getElementById('formsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            renderForms(e.target.value);
        });
    }
}

// Make forms functions available globally
window.viewForm = viewForm;
window.viewFormByLanguage = viewFormByLanguage;
window.downloadForm = downloadForm;
window.renameForm = renameForm;
window.deleteForm = deleteForm;



