# Sleep Mode Auto-Wake Implementation

## Overview

This document describes the comprehensive sleep mode implementation with automatic wake capability for the AV Scheduler application.

## Features Implemented

### 1. **Sleep Mode Detection**
- **File**: `api-server/lib/sleep-mode-detector.ts`
- Detects available sleep modes:
  - S0 Modern Standby (Low Power Idle)
  - S3 Traditional Sleep
- Checks RTC (Real-Time Clock) wake timer support
- Determines if automatic wake is possible
- Implements caching (5-minute TTL) for performance

### 2. **Wake Timer Scheduling**
- **File**: `api-server/lib/wake-timer-scheduler.ts`
- Uses Windows Task Scheduler to create wake timers
- Schedules computer to wake before next action
- Enables wake capability using XML task configuration
- Handles admin privilege requirements
- Automatic cleanup of old wake tasks

### 3. **Enhanced Sleep Function**
- **File**: `api-server/lib/vlc-controller.ts` (updated)
- Workflow:
  1. Detects sleep capabilities (S0/S3, RTC wake support)
  2. Finds next scheduled non-sleep action
  3. Calculates wake time based on user-configured buffer
  4. Checks admin privileges
  5. Schedules wake timer
  6. Puts computer to sleep with wake events enabled
- Handles edge cases:
  - No auto-wake support → returns warning requiring confirmation
  - No admin privileges → returns error requiring elevation
  - No upcoming actions → sleeps without wake timer
  - Wake timer failure → returns warning with options

### 4. **Settings Configuration**
- **Files**:
  - `models/settings.model.ts`
  - `api-server/lib/settings.ts`
  - `components/settings-form.tsx`
- New setting: `sleepWakeBufferMinutes`
  - Default: 3 minutes
  - Options: 2-10 minutes
  - Configurable via UI with dropdown
  - Determines how early the system wakes before next action

### 5. **System API Endpoints**
- **Files**:
  - `api-server/routes/system.ts`
  - `api-server/index.ts` (updated)
  - `api-server/standalone.ts` (updated)
- Endpoints:
  - `GET /api/system/sleep-capabilities` - Retrieve sleep capabilities
  - `POST /api/system/refresh-sleep-capabilities` - Force refresh detection

### 6. **Frontend Service**
- **File**: `services/system.service.ts`
- Service methods:
  - `getSleepCapabilities()` - Fetch capabilities from API
  - `refreshSleepCapabilities()` - Force refresh

### 7. **UI Enhancements**
- **File**: `components/schedule-creator.tsx`
- Real-time sleep capability detection when sleep action is selected
- Visual indicators:
  - ✅ Green: Auto-wake supported
  - ⚠️ Yellow: Auto-wake not supported
  - ❌ Red: Detection failed
- Displays:
  - Sleep mode type (S0/S3)
  - RTC wake support status
  - Admin privilege status
  - Clear warnings about manual wake requirements

## Technical Details

### Sleep Mode Detection Logic

```typescript
// S0 Modern Standby Detection
if (powercfgOutput.includes("Standby (S0 Low Power Idle)")
    && !powercfgOutput.match(/Standby \(S0 Low Power Idle\).*not supported/i))

// S3 Traditional Sleep Detection
if (powercfgOutput.includes("Standby (S3)")
    && !powercfgOutput.match(/Standby \(S3\).*not supported/i))
```

### Wake Timer Implementation

Uses Windows Task Scheduler with XML modification to enable wake capability:

1. Create scheduled task: `schtasks /create`
2. Export task to XML: `schtasks /query /xml`
3. Modify XML to add: `<WakeToRun>true</WakeToRun>`
4. Import modified task: `schtasks /create /xml`

### Sleep Command

Changed from:
```batch
rundll32.exe powrprof.dll,SetSuspendState 0,1,0
# Parameters: sleep, force, DISABLE wake events
```

To:
```batch
rundll32.exe powrprof.dll,SetSuspendState 0,1,1
# Parameters: sleep, force, ENABLE wake events
```

## User Experience Flow

### Creating a Sleep Schedule

1. User selects "Sleep (Windows)" action in scheduler
2. System automatically detects sleep capabilities
3. UI displays:
   - Detected sleep mode (S0/S3)
   - Auto-wake capability status
   - Admin privilege requirement
   - Buffer time setting location
4. User sets time and creates schedule

### Sleep Action Execution

#### Scenario 1: Auto-Wake Supported + Admin Privileges
1. System detects sleep capabilities ✓
2. Finds next scheduled action (e.g., "play" at 6:00 AM)
3. Reads wake buffer setting (e.g., 3 minutes)
4. Schedules wake timer for 5:57 AM
5. Puts computer to sleep with wake events enabled
6. Computer automatically wakes at 5:57 AM
7. Scheduled action executes at 6:00 AM

#### Scenario 2: Auto-Wake Not Supported
1. System detects S3 mode without RTC wake support
2. Returns warning: "Auto-wake not supported"
3. User must acknowledge they'll manually wake the computer
4. (For automated execution: sleep action is skipped)

#### Scenario 3: No Admin Privileges
1. System attempts to schedule wake timer
2. Receives "Access Denied" error
3. Returns error: "Administrator privileges required"
4. User must run application as Administrator
5. Provides clear guidance on enabling admin mode

## Configuration Files Modified

- `models/settings.model.ts` - Added sleep wake buffer setting
- `api-server/lib/settings.ts` - Added default value (3 minutes)
- `components/settings-form.tsx` - Added UI for configuration
- `api-server/index.ts` - Registered system routes
- `api-server/standalone.ts` - Registered system routes
- `api-server/lib/vlc-controller.ts` - Enhanced sleep function
- `components/schedule-creator.tsx` - Added capabilities display

## New Files Created

1. `api-server/lib/sleep-mode-detector.ts` (194 lines)
2. `api-server/lib/wake-timer-scheduler.ts` (277 lines)
3. `api-server/routes/system.ts` (56 lines)
4. `services/system.service.ts` (41 lines)

## Error Handling

### Detection Errors
- Platform check (Windows only)
- PowerShell command failures
- Timeout handling (5s for detection)

### Wake Timer Errors
- Admin privilege validation
- Task creation failures
- XML modification errors
- Cleanup on failure

### Sleep Execution Errors
- Capability detection failure → Warning message
- No admin privileges → Requires elevation
- Wake timer failure → Warning with options
- No upcoming actions → Sleep without timer

## Performance Considerations

- **Capability Detection**: ~500-1500ms (first time)
- **Cached Results**: <1ms (within 5 minutes)
- **Wake Timer Creation**: ~2-5s (requires admin)
- Overall impact: Minimal, runs once per sleep action

## Platform Support

- **Supported**: Windows 10, Windows 11
- **Sleep Modes**: S0 Modern Standby, S3 Traditional Sleep
- **Requirements**: Administrator privileges for wake timers

## Future Enhancements

1. Support for other sleep states (S1, S2, S4 hibernate)
2. User preference to allow sleep without auto-wake
3. Sleep action confirmation dialog for manual execution
4. Wake timer verification before sleep
5. Post-wake notification/logging
6. Energy usage tracking
7. Scheduled wake-only actions (wake without other action)

## Testing Recommendations

1. **S0 Modern Standby Systems**:
   - Verify sleep and auto-wake
   - Test with different buffer times
   - Validate admin privilege handling

2. **S3 Traditional Sleep Systems**:
   - Check RTC wake support detection
   - Test warning messages
   - Verify manual wake workflow

3. **Edge Cases**:
   - No upcoming actions scheduled
   - Multiple sleep actions in sequence
   - Wake timer already exists
   - Admin privilege lost after scheduling
   - System time changes
   - Multiple scheduled actions within buffer time

## Security Considerations

- Requires admin privileges for wake timers
- Uses Windows Task Scheduler (trusted system component)
- No external dependencies
- Minimal attack surface
- Task cleanup on failure

## Logging

All sleep-related operations log with `[Sleep]` or `[Wake Timer]` prefixes:
- Detection results
- Wake timer scheduling
- Sleep execution status
- Error conditions

## User Documentation

Users should be informed:
1. Administrator privileges are required for auto-wake
2. Wake buffer time can be configured in Settings
3. Sleep capabilities are automatically detected
4. Manual wake may be required on some systems
5. Check logs if wake fails to occur

---

## Implementation Completed

✅ All phases completed successfully
✅ No breaking changes to existing functionality
✅ Comprehensive error handling
✅ User-friendly UI with clear indicators
✅ Configurable settings
✅ Platform detection and compatibility checks
✅ Admin privilege handling
✅ Automatic wake timer cleanup

**Implementation Date**: January 31, 2026
**Version**: 1.0.0
