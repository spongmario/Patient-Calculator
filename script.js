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
            
            // Add providers that aren't already assigned to this shift
            providers.forEach(provider => {
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
    
    if (!currentTime) {
        alert('Please enter current time.');
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
                rickeyMessage.textContent = "You Pulled a Rickey! Time to encourage patient's leave.";
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
            <div class="breakdown-item" style="margin-top: 10px;">
                <strong>Provider capacity:</strong> 0 patients<br>
                <strong>Lobby:</strong> ${patientsInLobby} patients<br>
                <strong>Can accept:</strong> ${remainingCapacity} more patients
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
            rickeyMessage.textContent = "You Pulled a Rickey! Time to encourage patient's leave.";
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
            <div class="breakdown-item">
                <strong>Total Provider Capacity (before rounding):</strong> ${totalProviderCapacity.toFixed(1)} patients
            </div>
            ${breakdown.map(item => `
                <div class="breakdown-item" style="margin-left: 15px; font-size: 0.9em;">
                    ${item.provider} (${item.shift}): ${item.remainingPatients} patients (${item.remainingHours} hrs remaining)
                </div>
            `).join('')}
            <div class="breakdown-item" style="margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.3); padding-top: 10px;">
                <strong>Total Provider Capacity (rounded down):</strong> ${roundedProviderCapacity} patients
            </div>
            <div class="breakdown-item">
                <strong>Patients in Lobby:</strong> ${patientsInLobby} patients
            </div>
            <div class="breakdown-item" style="margin-top: 10px; font-weight: bold; font-size: 1.1em;">
                <strong>Can Accept:</strong> ${remainingCapacity} more patients before pausing
            </div>
        `;
    } else {
        breakdownDiv.innerHTML = `
            <div class="breakdown-header">Breakdown:</div>
            <div class="breakdown-item">
                <strong>Total Provider Capacity:</strong> 0 patients
            </div>
            <div class="breakdown-item" style="margin-top: 10px; color: #ffeb3b;">All assigned providers have completed their shifts.</div>
            <div class="breakdown-item" style="margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.3); padding-top: 10px;">
                <strong>Patients in Lobby:</strong> ${patientsInLobby} patients
            </div>
            <div class="breakdown-item" style="margin-top: 10px; font-weight: bold; font-size: 1.1em;">
                <strong>Can Accept:</strong> ${remainingCapacity} more patients before pausing
            </div>
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
    
    const calculateBtn = document.getElementById('calculateBtn');
    const addProviderBtn = document.getElementById('addProviderRow');
    const shiftTypeSelect = document.getElementById('shiftType');
    
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateRemainingPatients);
    }
    
    // Auto-check when time changes
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
        });
    }
});

