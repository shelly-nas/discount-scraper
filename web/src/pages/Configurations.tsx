import React, { useState, useEffect } from 'react';
import { configurationsService } from '../services/api';
import { ConfigurationsStats, SupermarketStatus, ScraperRun } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import './Configurations.css';

const Configurations: React.FC = () => {
  const [stats, setStats] = useState<ConfigurationsStats | null>(null);
  const [statuses, setStatuses] = useState<SupermarketStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    supermarket: string;
    supermarketKey: string;
  }>({
    isOpen: false,
    supermarket: '',
    supermarketKey: '',
  });
  const [runningScrapers, setRunningScrapers] = useState<Set<string>>(new Set());
  
  // Logs state
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const RUNS_PER_PAGE = 10;

  useEffect(() => {
    loadConfigurationsData();
    loadLogs();
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadConfigurationsData();
      loadLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadConfigurationsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [configurationsStats, supermarketStatuses] = await Promise.all([
        configurationsService.getStats(),
        configurationsService.getStatuses(),
      ]);
      setStats(configurationsStats);
      setStatuses(supermarketStatuses);
    } catch (err) {
      setError('Failed to load configurations data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      setLogsError(null);
      // Load more runs than we need for pagination (e.g., 50 runs)
      const scraperRuns = await configurationsService.getScraperRuns(50);
      setRuns(scraperRuns);
    } catch (err) {
      setLogsError('Failed to load scraper logs.');
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRunScraper = (supermarket: string, supermarketKey: string) => {
    setConfirmDialog({
      isOpen: true,
      supermarket,
      supermarketKey,
    });
  };

  const confirmRunScraper = async () => {
    const { supermarketKey } = confirmDialog;
    setConfirmDialog({ isOpen: false, supermarket: '', supermarketKey: '' });
    
    // Add to running scrapers
    setRunningScrapers(prev => new Set(prev).add(supermarketKey));
    
    try {
      await configurationsService.runScraper(supermarketKey);
      // Reload data after scraper completes
      await loadConfigurationsData();
      await loadLogs(); // Also reload logs to show the new run
    } catch (err) {
      console.error('Failed to run scraper:', err);
      alert('Failed to run scraper. Please check the logs.');
    } finally {
      // Remove from running scrapers
      setRunningScrapers(prev => {
        const newSet = new Set(prev);
        newSet.delete(supermarketKey);
        return newSet;
      });
    }
  };

  const cancelRunScraper = () => {
    setConfirmDialog({ isOpen: false, supermarket: '', supermarketKey: '' });
  };

  const getStatusClass = (status: 'success' | 'failed' | 'running' | 'pending') => {
    switch (status) {
      case 'success':
        return 'status-success';
      case 'failed':
        return 'status-failed';
      case 'running':
        return 'status-running';
      default:
        return 'status-pending';
    }
  };

  const getStatusText = (status: 'success' | 'failed' | 'running' | 'pending') => {
    switch (status) {
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'running':
        return 'Running';
      default:
        return 'Pending';
    }
  };

  // Pagination helpers
  const totalPages = Math.ceil(runs.length / RUNS_PER_PAGE);
  const startIndex = (currentPage - 1) * RUNS_PER_PAGE;
  const endIndex = startIndex + RUNS_PER_PAGE;
  const currentRuns = runs.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const formatDuration = (durationSeconds: number | null | undefined): string => {
    if (!durationSeconds) return 'N/A';
    const minutes = Math.floor(durationSeconds / 60);
    const remainingSeconds = durationSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${durationSeconds}s`;
  };

  if (loading && !stats) {
    return (
      <div className="configurations">
        <div className="configurations-loading">
          <div className="loading-spinner"></div>
          <p>Loading configurations...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="configurations">
        <div className="configurations-error">
          <p>{error}</p>
          <button onClick={loadConfigurationsData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="configurations">
      <div className="configurations-header">
        <h1 className="configurations-title">Configuraties</h1>
        <p className="configurations-subtitle">Monitor your scraper performance</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Runs</div>
          <div className="kpi-value">{stats?.totalRuns || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Success Rate</div>
          <div className="kpi-value">{stats?.successRate || 0}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Scraped Products</div>
          <div className="kpi-value">{stats?.scrapedProducts || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Unique Products</div>
          <div className="kpi-value">{stats?.uniqueProducts || 0}</div>
        </div>
      </div>

      {/* Next Scheduled Run */}
      {stats?.nextScheduledRun && (
        <div className="schedule-card">
          <h2 className="schedule-title">Next Scheduled Run</h2>
          <p className="schedule-time">{stats.nextScheduledRun}</p>
        </div>
      )}

      {/* Supermarket Controls */}
      <div className="supermarket-section">
        <h2 className="section-title">Supermarket Controls</h2>
        <div className="supermarket-grid">
          {statuses.map((status) => {
            const isRunning = runningScrapers.has(status.key);
            const displayStatus = isRunning ? 'running' : status.status;
            
            return (
              <div key={status.key} className="supermarket-card">
                <div className="supermarket-header">
                  <h3 className="supermarket-name">{status.name}</h3>
                  <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                    {getStatusText(displayStatus)}
                  </span>
                </div>
                {status.lastRun && (
                  <p className="supermarket-last-run">
                    Last run: {new Date(status.lastRun).toLocaleString()}
                  </p>
                )}
                {status.productsScraped !== undefined && (
                  <p className="supermarket-products">
                    Products: {status.productsScraped}
                  </p>
                )}
                <button
                  className="run-button"
                  onClick={() => handleRunScraper(status.name, status.key)}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <span className="button-spinner"></span>
                      Running...
                    </>
                  ) : (
                    <>
                      <span className="play-icon">▶</span>
                      Run Scraper
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scraper Run Logs */}
      <div className="logs-section">
        <h2 className="section-title">Scraper Run Logs</h2>
        
        {logsLoading && (
          <div className="logs-loading">
            <div className="loading-spinner"></div>
            <p>Loading logs...</p>
          </div>
        )}

        {logsError && (
          <div className="logs-error">
            <p>{logsError}</p>
            <button onClick={loadLogs} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {!logsLoading && !logsError && runs.length === 0 && (
          <div className="logs-empty">
            <p>No scraper runs yet. Start a scraper to see logs here.</p>
          </div>
        )}

        {!logsLoading && !logsError && runs.length > 0 && (
          <>
            <div className="logs-table">
              <div className="logs-table-header">
                <div className="log-col log-col-time">Time</div>
                <div className="log-col log-col-supermarket">Supermarket</div>
                <div className="log-col log-col-status">Status</div>
                <div className="log-col log-col-duration">Duration</div>
                <div className="log-col log-col-products">Products</div>
                <div className="log-col log-col-discounts">Discounts</div>
              </div>
              <div className="logs-table-body">
                {currentRuns.map((run) => (
                  <div key={run.id} className="log-row">
                    <div className="log-col log-col-time">
                      {new Date(run.startedAt).toLocaleString('nl-NL', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </div>
                    <div className="log-col log-col-supermarket">
                      {run.supermarket.charAt(0).toUpperCase() + run.supermarket.slice(1)}
                    </div>
                    <div className="log-col log-col-status">
                      <span className={`status-badge ${getStatusClass(run.status)}`}>
                        {getStatusText(run.status)}
                      </span>
                    </div>
                    <div className="log-col log-col-duration">
                      {formatDuration(run.durationSeconds)}
                    </div>
                    <div className="log-col log-col-products">
                      {run.productsScraped || 0} / {run.productsCreated || 0} / {run.productsUpdated || 0}
                      <span className="log-col-subtitle">scraped / added / updated</span>
                    </div>
                    <div className="log-col log-col-discounts">
                      {run.discountsCreated || 0} / {run.discountsDeactivated || 0}
                      <span className="log-col-subtitle">created / deactivated</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-button"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-button"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Confirm Scraper Run"
        message={`Are you sure you want to run the scraper for ${confirmDialog.supermarket}? This will fetch fresh discount data.`}
        confirmText="Run Scraper"
        cancelText="Cancel"
        onConfirm={confirmRunScraper}
        onCancel={cancelRunScraper}
      />
    </div>
  );
};

export default Configurations;
