# Discount Scraper - Web Interface

A modern, Notion-like web interface for viewing and filtering discount data from various supermarkets.

## Features

- **Database View**: Clean, table-based view of all discounts
- **Global Search**: Search across all columns simultaneously
- **Column Filters**: Individual text filters for each column
- **Default Sorting**: Automatically sorted by expire date, category, and product name
- **Responsive Design**: Works on desktop and mobile devices
- **Notion-inspired UI**: Clean, minimal interface inspired by Notion

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **date-fns** - Date formatting
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- The scraper API must be running on port 3001 (or configured in `vite.config.ts`)

### Installation

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── components/          # Reusable components
│   │   ├── DatabaseTable.tsx    # Main table component
│   │   ├── DatabaseTable.css
│   │   ├── SearchBar.tsx        # Global search
│   │   └── SearchBar.css
│   ├── pages/              # Page components
│   │   ├── DatabaseView.tsx     # Home page
│   │   └── DatabaseView.css
│   ├── services/           # API services
│   │   └── api.ts              # API calls
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Features in Detail

### Global Search

- Search across all columns with a single input
- Real-time filtering as you type
- Clear all filters button

### Column Filters

- Individual filter for each column:
  - Expire Date
  - Category
  - Product Name
  - Supermarket
  - Discount Price
  - Original Price
  - Special Discount
- Click the filter icon in column headers to toggle filters
- Filters work in combination with global search

### Default Sorting

Data is automatically sorted by:

1. Expire Date (ascending - soonest first)
2. Category (alphabetical)
3. Product Name (alphabetical)

## API Endpoints Used

- `GET /api/discounts` - Fetch all discounts with product details

## Configuration

### API Proxy

The Vite dev server proxies API requests to the backend. Configure in `vite.config.ts`:

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

### Environment Variables

No environment variables needed for development. API is proxied through Vite.

## Styling

The interface uses a Notion-inspired design system with CSS variables:

- Clean, minimal aesthetic
- Hover states and transitions
- Responsive layout
- Accessible colors and contrast

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
