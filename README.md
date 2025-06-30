# BAPS Music Scheduler

A comprehensive media scheduling application with calendar integration, playlist management, and both VLC and built-in media player support.

## 🚀 Quick Start

### Local Development (Recommended for Testing)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Both API and Frontend** (Easiest option)
   ```bash
   npm run dev:local
   ```
   This will start:
   - API Server on `http://localhost:8082`
   - Next.js Frontend on `http://localhost:3000`

3. **Or Start Separately**
   
   **Terminal 1 - API Server:**
   ```bash
   npm run dev:api-only
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   npm run dev:web-only
   ```

### Electron App (For Production)

1. **Development Mode:**
   ```bash
   npm run electron:dev
   ```

2. **Build for Distribution:**
   ```bash
   npm run electron:build
   ```

## 🎵 Features

### 📅 Calendar Integration
- Upload and parse .ics calendar files
- Automatic Gujarati month name processing
- Event-based scheduling
- Smart event sorting (Gujarati calendar events first)

### 🎮 Media Player
- **Dual Mode Support**: Choose between VLC external player or built-in web player
- **Built-in Player Features**:
  - Full HTML5 audio/video support
  - Progress bar with seeking
  - Volume control with mute
  - Playlist navigation (next/previous)
  - Repeat modes (none, one, all)
  - Shuffle functionality
  - Real-time WebSocket synchronization

### 📁 File Management
- **File Browser**: Navigate your file system
- **Media Detection**: Automatically identifies playable files
- **Search Functionality**: Find files quickly
- **Multi-file Selection**: Create playlists from selected files
- **Cross-platform Support**: Works on Windows, Mac, and Linux

### 🎵 Streaming & Playlists
- **Media Streaming**: Efficient streaming of large media files with range request support
- **M3U Playlist Support**: Read and create M3U playlist files
- **Multiple Format Support**: MP3, MP4, WAV, FLAC, AAC, OGG, WebM, M4A
- **Smart Playlist Matching**: Handles complex event names with slash separators

### ⏰ Scheduling
- **Daily Schedules**: Set recurring daily actions
- **Event-based Schedules**: Schedule actions for specific calendar events
- **Action Types**: Play, Pause, Stop
- **Real-time Execution**: WebSocket-based real-time updates
- **Playlist Status Checking**: Verify playlist availability before execution

## 🛠 Development

### Project Structure

```
├── api-server/           # Express.js API server
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── lib/            # Utilities and database
│   └── standalone.ts    # Standalone server for development
├── app/                 # Next.js app directory
├── components/          # React components
│   ├── media-player/   # Media player components
│   └── ui/             # UI components
├── services/           # Frontend API services
├── lib/               # Frontend utilities
└── models/            # TypeScript interfaces
```

### 🚀 **NEW: Automated Static Routing System**

This application now features a **fully automated routing system** that eliminates the need for manual route configuration:

#### **How It Works:**
1. **Auto-Discovery**: Automatically scans the Next.js `out/` directory for HTML files
2. **Dynamic Route Creation**: Creates Express routes for each discovered HTML file
3. **Smart Fallback**: Handles nested routes and SPA fallback intelligently
4. **Zero Configuration**: No manual route setup required when adding new pages

#### **Benefits:**
- ✅ **Add any new Next.js page** - routing is handled automatically
- ✅ **No backend changes needed** when adding frontend pages
- ✅ **Intelligent route matching** for nested paths
- ✅ **SPA fallback support** for client-side routing
- ✅ **Development and production ready**

#### **Example:**
```bash
# Add a new page: app/dashboard/page.tsx
# After build, it becomes: out/dashboard.html
# Route automatically available: /dashboard
# No backend configuration required! 🎉
```

#### **Test the Routing System:**
```bash
npm run test:routing
```

### Available Scripts

- `npm run dev:local` - Start both API and frontend
- `npm run dev:api-only` - Start only the API server
- `npm run dev:web-only` - Start only the frontend
- `npm run dev` - Start Next.js development server
- `npm run api:dev` - Start API server with hot reload
- `npm run build` - Build for production
- `npm run electron:dev` - Start Electron app in development
- `npm run electron:build` - Build Electron app for distribution
- `npm run test:routing` - Test the automated routing system

### Enhanced Build Process

The build process is now more robust and organized:

```bash
npm run build:clean      # Clean previous builds
npm run build:static     # Generate Next.js static export
npm run build:electron   # Compile TypeScript for Electron
npm run build:package    # Package Electron app
```

### Environment Variables

The application uses these default configurations:
- API Server: `http://localhost:8082`
- Frontend: `http://localhost:3000`
- WebSocket: Same port as API server

### Database

The application uses SQLite for data storage:
- Database file: `~/.baps-scheduler/db.sqlite`
- Settings file: `~/.baps-scheduler/settings.json`
- Default playlist folder: `~/.baps-scheduler/playlists`

## 🎯 API Endpoints

### Calendar Events
- `GET /api/calendar-events` - Get all events
- `POST /api/calendar-events` - Create events
- `PUT /api/calendar-events/:id` - Update event
- `DELETE /api/calendar-events/:id` - Delete event

### Scheduler
- `GET /api/scheduler` - Get scheduled actions
- `POST /api/scheduler` - Create scheduled action
- `POST /api/scheduler/execute/:id` - Execute scheduled action manually
- `DELETE /api/scheduler/:id` - Delete scheduled action

### Media Streaming
- `GET /api/media/stream/:encodedPath` - Stream media file
- `GET /api/media/metadata/:encodedPath` - Get file metadata

### File Browser
- `GET /api/files/browse?path=` - Browse directory
- `GET /api/files/drives` - Get system drives
- `GET /api/files/search?path=&q=` - Search files

### Player Control
- `GET /api/player/state` - Get player state
- `POST /api/player/state` - Update player state
- `POST /api/player/command` - Send player command
- `POST /api/player/playlist` - Load playlist

### Settings & Playlists
- `GET /api/settings` - Get application settings
- `PATCH /api/settings` - Update settings
- `GET /api/playlists` - Get available playlists
- `GET /api/playlists/check/:name` - Check playlist existence
- `GET /api/playlists/content/:encodedPath` - Load playlist content

## 🔧 Configuration

### Playlist Folder
Configure the playlist folder path in Settings. The application will:
- Store M3U playlist files
- Search for event-matching playlists
- Handle complex naming patterns (e.g., "Event/SubEvent")

### Player Modes
- **VLC Mode**: Uses external VLC application
- **Built-in Mode**: Uses web-based HTML5 player with full controls

## 🎵 Media Player Features

### Built-in Player
- **Streaming**: Efficient HTTP range request streaming
- **Controls**: Play, pause, stop, seek, volume
- **Playlist**: Next, previous, repeat, shuffle
- **Real-time Sync**: WebSocket-based state synchronization
- **File Browser**: Navigate and select media files
- **Multi-selection**: Create playlists from selected files
- **Auto-play Support**: Automatic playback from scheduled actions

### VLC Integration
- **External Control**: HTTP interface control
- **Process Management**: Automatic VLC process handling
- **Playlist Loading**: Direct M3U file loading
- **Cross-platform**: Windows, Mac, and Linux support

## 🚀 Deployment

### Local Testing
Use `npm run dev:local` for the best development experience with hot reload on both frontend and backend.

### Electron Distribution
1. Build the application: `npm run electron:build`
2. Find the built application in the `dist` folder
3. Distribute the appropriate package for your platform

### Adding New Pages
Thanks to the automated routing system, adding new pages is simple:

1. **Create your Next.js page**: `app/new-page/page.tsx`
2. **Build the application**: `npm run build`
3. **That's it!** The route `/new-page` is automatically available

No backend configuration required! 🎉

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npm run dev:local`
5. Test routing with `npm run test:routing`
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License.