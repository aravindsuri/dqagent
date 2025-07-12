# DQAgent - Data Quality Management System

A Microsoft Teams-style interface for managing Data Quality questionnaires at Daimler Truck Financial Services.

## Quick Start (Windows)

### Prerequisites
1. Install Node.js 18+ from https://nodejs.org/
2. Install Python 3.9+ from https://python.org/
3. Install Azure Functions Core Tools:
   ```powershell
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```
4. Install Azure CLI from https://aka.ms/installazurecliwindows

### Setup
```powershell
# Setup backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy local.settings.json.example local.settings.json
# Edit local.settings.json with your Azure OpenAI credentials
func start

# In a new terminal - Setup frontend
cd frontend
npm install
npm start
```

## Architecture

- **Frontend**: React TypeScript with Teams UI
- **Backend**: Python FastAPI on Azure Functions  
- **AI**: Azure OpenAI for question generation
- **Infrastructure**: Azure (Functions, Storage, Static Web Apps)

## Features

-  **Teams-style Interface**: Familiar Microsoft Teams design
-  **AI-powered Questions**: Automatic generation from DQ reports
-  **Real-time Validation**: AI validation of response quality
-  **Auto-save**: Automatic saving of responses
-  **Multi-country Support**: Country-specific questionnaires
-  **Progress Tracking**: Visual progress indicators

## Development

### Running Locally
1. Start backend: `cd backend && func start`
2. Start frontend: `cd frontend && npm start`
3. Open http://localhost:3000

### Sample Data
Place your Netherlands DQ report JSON in:
`backend/data/sample_data/netherlands_may_2025.json`

The system will automatically generate questions based on your data.
