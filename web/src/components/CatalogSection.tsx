import React, { useCallback, useEffect, useState } from 'react';
import { catalogService } from '../services/api';
import { CatalogStatus } from '../types';

/**
 * Full catalog scrapes (regular prices) per supermarket. Runs take minutes and
 * happen in the background, so the section polls while one is running.
 */
const CatalogSection: React.FC = () => {
  const [statuses, setStatuses] = useState<CatalogStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setStatuses(await catalogService.getStatus());
      setError(null);
    } catch (err) {
      setError('Failed to load catalog status.');
      console.error(err);
    }
  }, []);

  const anyRunning = statuses.some((s) => s.running);

  useEffect(() => {
    load();
    const interval = setInterval(load, anyRunning ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [load, anyRunning]);

  const start = async (key: string) => {
    setStarting((prev) => new Set(prev).add(key));
    try {
      await catalogService.run(key);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to start the catalog run.');
    } finally {
      setStarting((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      load();
    }
  };

  const supported = statuses.filter((s) => s.supported);
  const unsupported = statuses.filter((s) => !s.supported);

  return (
    <div className="supermarket-section">
      <h2 className="section-title">Product Catalog</h2>
      {error && <p className="supermarket-expire supermarket-expire--expired">{error}</p>}
      <div className="supermarket-grid">
        {supported.map((s) => {
          const status = s.running ? 'running' : s.lastRun?.status ?? 'pending';
          return (
            <div key={s.key} className="supermarket-card">
              <div className="supermarket-header">
                <h3 className="supermarket-name">{s.name}</h3>
                <span className={`status-badge status-${status}`}>{status}</span>
              </div>
              <p className="supermarket-products">Products in catalog: {s.productsInCatalog}</p>
              {s.lastRun && (
                <p className="supermarket-last-run">
                  Last run: {new Date(s.lastRun.started_at).toLocaleString()}
                  {s.lastRun.status === 'success' &&
                    ` (${s.lastRun.products_seen} products, ${s.lastRun.prices_changed} price changes)`}
                </p>
              )}
              {s.lastRun?.status === 'failed' && s.lastRun.error_message && (
                <p className="supermarket-expire supermarket-expire--expired">
                  {s.lastRun.error_message}
                </p>
              )}
              <div className="card-actions">
                <button
                  className="run-button"
                  onClick={() => start(s.key)}
                  disabled={s.running || starting.has(s.key)}
                >
                  {s.running ? (
                    <>
                      <span className="button-spinner"></span>
                      Running...
                    </>
                  ) : (
                    'Run Catalog'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {unsupported.length > 0 && (
        <p className="supermarket-last-run">
          No catalog scraper yet: {unsupported.map((s) => s.name).join(', ')}. Scheduled weekly
          (CATALOG_CRON, default Monday 03:17).
        </p>
      )}
    </div>
  );
};

export default CatalogSection;
