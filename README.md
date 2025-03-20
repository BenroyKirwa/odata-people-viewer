# OData People Viewer

A web application that fetches people data from the OData API (`http://services.odata.org/TripPinRESTierService/People`) and displays it in a table with advanced features.

## Features
- Displays a list of people with columns: `UserName`, `FirstName`, `LastName`, `MiddleName`, `Gender`, `Age`.
- Supports sorting by any column (ascending or descending) with multiple criteria.
- Supports filtering by any column with conditions (e.g., "Equals", "Contains", "Greater Than").
- Includes pagination (5 people per page).
- Updates the URL with sorting and filtering state for sharing.
- Shows a loader during data fetching, sorting, filtering, and resetting.

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **API**: OData (`http://services.odata.org/TripPinRESTierService/People`)
- **Tools**: `http-server` for local development, `cors-anywhere` for CORS bypass

## Setup
```
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/odata-people-viewer.git
   cd odata-people-viewer

2. Install http-server (if not already installed):
```
npm install -g http-server
```

3. Start the server:
```
http-server
```

4. Request temporary access to https://cors-anywhere.herokuapp.com/ to bypass CORS.
- Go to
```
https://cors-anywhere.herokuapp.com/corsdemo
```

5. Open http://localhost:8080 (or the provided IP/port) in your browser.
```