### Node Module Frontend ###
1. Navigate to customer-service-dashboard: `cd /customer-service-dashboard` and run: `npm install` to install the dependencies needed in frontend.

2. Run `npm install dayjs` [if missing dependencies]

3. Run `npm install vite` (For future production domain usage) [if missing dependencies]

### Node Module Backend ###
1. Navigate to customer-service-dashboard: `cd /server` and run: `npm install` to install the dependencies needed in backend.

2. Run `npm i --save-dev @types/uuid` [if missing dependencies]

3. Run `npm install cookie-parser` [if missing dependencies]

### Start Server ###
1. Change all the port 5433 to 5432  .env[PG_PORT,PG_URL], .env.ts[PG_PORT,PG_URL]

2. Click the start-dev.bat to run the Chat-X using localhost:3000.

