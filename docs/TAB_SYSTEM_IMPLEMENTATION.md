# Tab System Implementation

## Overview

Added a tab navigation system to the web client with two views: **Dashboard** (default) and **Discounts**.

## Features Implemented

### 1. Tab Navigation

- **Component**: `TabBar.tsx` and `TabBar.css`
- Two tabs: Dashboard and Discounts
- Discounts tab opens by default as requested
- Clean, Notion-inspired styling

### 2. Dashboard View

Located in `web/src/pages/Dashboard.tsx`

#### KPI Cards

- **Total Runs**: Shows total scraper runs (placeholder - needs backend tracking)
- **Success Rate**: Percentage of successful runs (placeholder - needs backend tracking)
- **Scraped Products**: Total number of products with discounts
- **Unique Products**: Count of distinct products

#### Next Scheduled Run

- Displays when the next scraper run is scheduled
- Currently shows "Not scheduled" (needs scheduler integration)

#### Supermarket Controls

- **Play Buttons**: Each supermarket has a "Run Scraper" button
- **Confirmation Dialog**: Shows popup before running scraper
- **Status Indicators**:
  - 🟢 **Green (Success)**: Last run completed successfully
  - 🔴 **Red (Failed)**: Last run failed (needs backend tracking)
  - 🟡 **Yellow (Running)**: Scraper is currently running
  - ⚪ **Gray (Pending)**: No runs yet

#### Features

- Shows last run timestamp for each supermarket
- Displays number of products scraped
- Real-time updates (refreshes every 30 seconds)
- Loading states while scraper is running

### 3. Discounts View

- Renamed from `DatabaseView` to `DiscountsView`
- Maintains all existing functionality
- Shows product discount database with filtering and search

### 4. Confirm Dialog Component

- **Component**: `ConfirmDialog.tsx` and `ConfirmDialog.css`
- Reusable modal dialog for confirmations
- Used when triggering scraper runs
- Prevents accidental scraper executions

## Backend API Endpoints

### New Endpoints Added to `scraper/src/api/Routes.ts`

#### `GET /api/dashboard/stats`

Returns dashboard statistics:

```json
{
  "totalRuns": 0,
  "successRate": 0,
  "scrapedProducts": 123,
  "uniqueProducts": 95,
  "nextScheduledRun": "Not scheduled"
}
```

#### `GET /api/dashboard/statuses`

Returns status for each supermarket:

```json
[
  {
    "key": "albert-heijn",
    "name": "Albert Heijn",
    "status": "success",
    "lastRun": "2025-10-24T10:30:00Z",
    "productsScraped": 45
  },
  {
    "key": "dirk",
    "name": "Dirk",
    "status": "pending"
  }
]
```

#### `POST /api/scraper/run/:supermarket` (existing)

Triggers scraper for specific supermarket (albert-heijn, dirk, or plus)

## File Structure

### New Files Created

```
web/src/
├── components/
│   ├── TabBar.tsx
│   ├── TabBar.css
│   ├── ConfirmDialog.tsx
│   └── ConfirmDialog.css
└── pages/
    ├── Dashboard.tsx
    ├── Dashboard.css
    ├── DiscountsView.tsx
    └── DiscountsView.css
```

### Modified Files

- `web/src/App.tsx` - Added tab system
- `web/src/index.css` - Added app-container styling
- `web/src/types/index.ts` - Added Dashboard types
- `web/src/services/api.ts` - Added dashboard API service
- `scraper/src/api/Routes.ts` - Added dashboard endpoints

## Future Enhancements

### Backend Tracking Needed

To fully implement the dashboard, you'll need to:

1. **Create a `scraper_runs` table** to track:

   - Run ID
   - Supermarket name
   - Start time
   - End time
   - Status (success/failed)
   - Products scraped
   - Error messages (if failed)

2. **Update scraper to log runs**:

   - Insert record when scraper starts
   - Update with status when complete
   - Track errors and failures

3. **Implement scheduler tracking**:

   - Store scheduled run times
   - Update `nextScheduledRun` in stats endpoint

4. **Calculate metrics**:
   - Total runs from `scraper_runs` table
   - Success rate: `(successful_runs / total_runs) * 100`
   - Failed status: Check if last run for supermarket failed

### Example Schema for Runs Table

```sql
CREATE TABLE scraper_runs (
  id SERIAL PRIMARY KEY,
  supermarket VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'running', 'success', 'failed'
  products_scraped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

To test the implementation:

1. **Start the services**:

   ```bash
   docker-compose up
   ```

2. **Access the web interface**:

   - Navigate to `http://localhost` (or your configured port)
   - You should see the tab bar with Dashboard and Discounts tabs
   - Discounts tab should be active by default

3. **Test Dashboard**:

   - Click on Dashboard tab
   - Verify KPI cards show data
   - Click "Run Scraper" on any supermarket
   - Confirm the dialog appears
   - Confirm to run the scraper
   - Button should show "Running..." state
   - After completion, data should refresh

4. **Test Discounts**:
   - Click Discounts tab
   - Verify existing discount view works as before

## Notes

- The default tab is set to 'discounts' as requested
- All styling follows the existing Notion-inspired design system
- Dashboard auto-refreshes every 30 seconds
- Scraper status shows in real-time while running
- Responsive design works on mobile devices
