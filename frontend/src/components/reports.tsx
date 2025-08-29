// frontend/src/components/ReportsPage.tsx
import React, { useState, useEffect } from 'react';

// Definimos la estructura de los datos que esperamos del API
interface UpcomingReport {
  symbol: string;
  upcoming_report_date: string | null;
}

// Esta interfaz describe la estructura completa de los datos de un símbolo
interface PastReportData {
  symbol: string;
  upcoming_report_date: string | null;
  last_report: ReportDetails | null;
  previous_reports: ReportDetails[];
}

interface ReportDetails {
  date: string;
  eps_estimate: number | null;
  eps_actual: number | null;
  surprise_percent: number | null;
}

const ReportsView: React.FC = () => {
  const [upcomingReports, setUpcomingReports] = useState<UpcomingReport[]>([]);
  const [pastReports, setPastReports] = useState<PastReportData[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    // Obtenemos los datos de nuestro nuevo endpoint del backend
    fetch('/api/reports/')
      .then((res) => res.json())
      .then((data) => {
        setUpcomingReports(data.upcoming_reports || []);
        setPastReports(data.past_reports || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching reports data:', error);
        setIsLoading(false);
      });
  }, []);

  const toggleRow = (symbol: string) => {
    setExpandedRow(expandedRow === symbol ? null : symbol);
  };

  if (isLoading) {
    return <div className="reports-container">Cargando reportes...</div>;
  }

  return (
    <div className="reports-container">
      <div className="report-title">Próximos Reportes</div>
      <div className="upcoming-reports-grid">
        {(() => {
          // Calculamos el punto medio para dividir la lista
          const upcoming = upcomingReports.filter(
            (etf) => etf.upcoming_report_date
          );
          const midPoint = Math.ceil(upcoming.length / 2);
          const leftColumn = upcoming.slice(0, midPoint);
          const rightColumn = upcoming.slice(midPoint);

          return (
            <>
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Símbolo</th>
                    <th>Próxima Fecha de Reporte</th>
                  </tr>
                </thead>
                <tbody>
                  {leftColumn.map((etf) => (
                    <tr key={etf.symbol}>
                      <td>{etf.symbol}</td>
                      <td>{etf.upcoming_report_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Símbolo</th>
                    <th>Próxima Fecha de Reporte</th>
                  </tr>
                </thead>
                <tbody>
                  {rightColumn.map((etf) => (
                    <tr key={etf.symbol}>
                      <td>{etf.symbol}</td>
                      <td>{etf.upcoming_report_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
        })()}
      </div>

      <div className="report-title">Últimos Reportes</div>
      <table className="reports-table">
        <thead>
          <tr>
            <th>Símbolo</th>
            <th>Fecha del Reporte</th>
            <th>EPS Actual</th>
            <th>EPS Estimado</th>
            <th>Sorpresa (%)</th>
          </tr>
        </thead>
        <tbody>
          {pastReports.map((etf) => (
            <React.Fragment key={etf.symbol}>
              <tr
                onClick={() => toggleRow(etf.symbol)}
                className={`expandable-row ${expandedRow === etf.symbol ? 'expanded' : ''}`}
              >
                <td>
                  {etf.symbol}{' '}
                  {etf.previous_reports.length > 0 && (
                    <span className="expand-arrow">▶</span>
                  )}
                </td>
                <td>{etf.last_report?.date ?? 'N/A'}</td>
                <td>{etf.last_report?.eps_actual?.toFixed(2) ?? 'N/A'}</td>
                <td>{etf.last_report?.eps_estimate?.toFixed(2) ?? 'N/A'}</td>
                <td
                  className={
                    etf.last_report?.surprise_percent &&
                    etf.last_report.surprise_percent > 0
                      ? 'positive'
                      : 'negative'
                  }
                >
                  {etf.last_report?.surprise_percent?.toFixed(2) ?? 'N/A'}
                </td>
              </tr>
              {expandedRow === etf.symbol && (
                <tr className="expanded-content-row">
                  <td colSpan={5}>
                    <div className="previous-reports-container">
                      {etf.previous_reports.map((report) => (
                        <div
                          key={`${etf.symbol}-${report.date}`}
                          className="report-card"
                        >
                          <div className="report-card-body">
                            <div className="report-card-body-date">
                              <strong>
                                <div>{report.date}</div>
                              </strong>
                            </div>
                            <div>
                              <strong>
                                ${report.eps_actual?.toFixed(2) ?? 'N/A'}
                              </strong>
                            </div>
                            <div>
                              <strong>
                                ${report.eps_estimate?.toFixed(2) ?? 'N/A'}
                              </strong>
                            </div>
                            <div
                              className={
                                report.surprise_percent &&
                                report.surprise_percent > 0
                                  ? 'positive'
                                  : 'negative'
                              }
                            >
                              <strong>
                                {report.surprise_percent?.toFixed(2) ?? 'N/A'}%
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default ReportsView;
