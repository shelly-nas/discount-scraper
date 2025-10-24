import express, { Request, Response, Application } from "express";
import cors from "cors";
import { serverLogger } from "./utils/Logger";
import PostgresDataManager from "./data/PostgresDataManager";
import routes from "./api/Routes";

const app: Application = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  serverLogger.info(`${req.method} ${req.path}`);
  next();
});

// Response logging middleware
app.use((req: Request, res: Response, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    serverLogger.info(`${req.method} ${req.path} - Status: ${res.statusCode}`);
    return originalSend.call(this, data);
  };
  next();
});

// Initialize database connection
async function initializeDatabase(): Promise<boolean> {
  const dataManager = new PostgresDataManager();
  try {
    const connected = await dataManager.testConnection();
    if (connected) {
      serverLogger.info("Database connection established successfully");
    } else {
      serverLogger.error("Failed to establish database connection");
    }
    return connected;
  } catch (error) {
    serverLogger.error("Error during database initialization:", error);
    return false;
  }
  // Don't close the pool - it's a singleton that should stay open
}

// Register API routes
app.use("/api", routes);

// 404 handler
app.use((req: Request, res: Response) => {
  serverLogger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Start server
async function startServer() {
  // Test database connection on startup
  const dbConnected = await initializeDatabase();

  if (!dbConnected) {
    serverLogger.error("Cannot start server - database connection failed");
    process.exit(1);
  }

  app.listen(PORT, () => {
    serverLogger.info(`API Server is running on port ${PORT}`);
    serverLogger.info(`Health check: http://localhost:${PORT}/health`);
    serverLogger.info(
      `Run scraper: POST http://localhost:${PORT}/scraper/run/:supermarket`
    );
  });
}

// Start the application
startServer().catch((error) => {
  serverLogger.error("Failed to start server:", error);
  process.exit(1);
});
