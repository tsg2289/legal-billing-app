# Development Guide

## Quick Start

### Option 1: Single Command (Recommended)
```bash
npm run dev
```
This starts both the Express backend server and Vite frontend development server.

### Option 2: Separate Terminals
```bash
# Terminal 1: Backend server
npm run dev:server

# Terminal 2: Frontend server  
npm run dev:frontend
```

## Server URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

## API Endpoints

### POST /api/generateBilling
Generates a legal billing entry using AI based on the provided case information.

**Request:**
```json
{
  "fileNumber": "2024-001",
  "caseName": "Smith v. Johnson",
  "description": "Reviewed contract documents and prepared initial assessment"
}
```

**Response:**
```json
{
  "success": true,
  "result": "0.6: Reviewed contract documents and prepared initial assessment of liability issues.",
  "timestamp": "2025-07-30T23:42:55.221Z"
}
```

### GET /api/ai/status
Returns the AI service status and configuration.

**Response:**
```json
{
  "service": {
    "service": "OpenAI",
    "model": "gpt-4",
    "maxTokens": 500,
    "temperature": 0.7,
    "configured": true
  },
  "configuration": {
    "isValid": true,
    "errors": []
  },
  "timestamp": "2025-07-30T23:42:55.221Z"
}
```

### GET /api/health
Returns the API health status.

## Development Workflow

1. **Start Development**: `npm run dev`
2. **Make Changes**: Edit files in `src/` (frontend) or `server/` (backend)
3. **Hot Reload**: Changes are automatically reflected
4. **Test API**: Use the frontend or test with curl:
   ```bash
   curl -X POST http://localhost:3000/api/generateBilling \
     -H "Content-Type: application/json" \
     -d '{"prompt":"test"}'
   ```

## Project Structure

```
legal-billing-app/
├── server/                 # Backend Express server
│   ├── index.js           # Main server file
│   └── routes/
│       └── api.js         # API routes
├── src/                   # Frontend React app
│   └── App.jsx           # Main React component
├── dev-server.js         # Development script
├── vite.config.js        # Vite configuration
└── package.json          # Dependencies and scripts
```

## Troubleshooting

### Server Won't Start
- Check if port 3000 is available: `lsof -i :3000`
- Kill existing processes: `pkill -f "node server/index.js"`

### Frontend Won't Load
- Check if port 5173 is available: `lsof -i :5173`
- Kill existing Vite processes: `pkill -f "vite"`

### API Calls Fail
- Ensure both servers are running
- Check browser console for CORS errors
- Verify the API endpoint is correct: `/api/generateBilling`

### Environment Variables
Create a `.env` file in the root directory:
```
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
```

**Important**: You need a valid OpenAI API key to use the AI features. Get one at https://platform.openai.com/api-keys

## Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

The production server will serve the built frontend from the `dist/` directory.

## Next Steps (Phase 3)

- [x] ✅ AI service integration (OpenAI)
- [x] ✅ Enhanced error handling
- [ ] Add authentication
- [ ] Add database integration
- [ ] Deploy to Vercel
- [ ] Add rate limiting
- [ ] Add usage analytics 