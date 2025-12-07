# CHC Walk-In Patient Calculator

A web-based calculator for estimating remaining patient capacity at the end of the day for your Urgent Care facility.

## Features

- **Provider Management**: Add providers with their patients-per-hour rates
- **Shift Assignment**: Assign providers to Opening (8-6), Mid (9-7), or Close (10-8) shifts
- **Thursday Special Schedule**: Automatically handles Thursday when all shifts are 9-7pm
- **Smart Calculations**: 
  - Calculates remaining hours for each provider based on current time
  - Applies the last-hour rule (1.8 patients in the final hour)
  - Includes patients currently in the lobby
- **Data Persistence**: Provider data and shift assignments are saved locally in your browser

## Usage

1. **Add Providers**: Enter provider name and their patients-per-hour rate, then click "Add Provider"
2. **Assign Shifts**: Check the boxes to assign providers to their respective shifts (Opening, Mid, or Close)
3. **Select Date**: Choose the date you're calculating for (Thursday will automatically adjust all shifts to 9-7pm)
4. **Enter Current Info**: 
   - Enter the number of patients currently in the lobby
   - Set the current time (defaults to actual current time)
5. **Calculate**: Click "Calculate Remaining Patients" to see the estimated total

## Shift Schedules

- **Regular Days**:
  - Opening: 8:00 AM - 6:00 PM
  - Mid: 9:00 AM - 7:00 PM
  - Close: 10:00 AM - 8:00 PM

- **Thursday**:
  - All shifts: 9:00 AM - 7:00 PM

## Calculation Rules

- Providers see their full patients-per-hour rate for complete hours remaining
- In the last hour of their shift, providers only see 1.8 patients (regardless of their rate)
- Patients currently in the lobby are included in the total estimate
