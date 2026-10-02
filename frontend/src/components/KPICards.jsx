import React from 'react';
import { FiTrendingUp, FiTarget, FiActivity, FiClock, FiBarChart2, FiCompass } from 'react-icons/fi';

const KPICards = ({ data, selectedMonth }) => {
  if (!data || data.length === 0) return null;

  // If a month is selected by clicking on chart/table, use it. Otherwise default to latest month with actual data.
  const actualDataPoints = data.filter(d => d.accumulative_actual !== null && d.accumulative_actual !== undefined);
  const latestDefaultData = actualDataPoints.length > 0 ? actualDataPoints[actualDataPoints.length - 1] : data[0];

  const activeData = selectedMonth || latestDefaultData;

  // Safe values
  const accumActual = activeData.accumulative_actual !== null && activeData.accumulative_actual !== undefined ? activeData.accumulative_actual : null;
  const accumPlanned = activeData.accumulative_planned || 0;
  const monthlyActual = activeData.monthly_actual !== null && activeData.monthly_actual !== undefined ? activeData.monthly_actual : null;
  const duration = activeData.duration || 0;
  const formatPercent = (val) => (val !== null && !isNaN(val) ? (val * 100).toFixed(2) + '%' : '—');
  const hasVarianceDays = activeData.variance_days !== null && activeData.variance_days !== undefined && activeData.variance_days !== '';
  const varianceDays = hasVarianceDays ? Number(activeData.variance_days) : null;
  const variancePercentVal = (accumActual !== null && !isNaN(accumActual) && !isNaN(accumPlanned))
    ? (accumActual - accumPlanned) * 100 
    : null;
  const cardColor = varianceDays === null ? 'amber' : (varianceDays >= 0 ? 'green' : 'red');

  const hasManualSpi = activeData.spi !== null && activeData.spi !== undefined && activeData.spi !== '';
  const spi = hasManualSpi 
    ? Number(activeData.spi) 
    : (accumPlanned > 0 && accumActual !== null && !isNaN(accumActual) ? accumActual / accumPlanned : null);

  const monthLabel = activeData.month_ending
    ? new Date(activeData.month_ending).toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : activeData.month;

  return (
    <div className="kpi-grid">
      <div className="kpi-card blue">
        <div className="kpi-icon blue">
          <FiBarChart2 />
        </div>
        <div className="kpi-label">Project Progress</div>
        <div className="kpi-value">{formatPercent(accumActual)}</div>
        <div className="kpi-sub">
          <span>{selectedMonth ? `Actual at ${monthLabel}` : 'Latest actual completion'}</span>
        </div>
      </div>

      <div className="kpi-card green">
        <div className="kpi-icon green">
          <FiTrendingUp />
        </div>
        <div className="kpi-label">Monthly Progress</div>
        <div className="kpi-value">{formatPercent(monthlyActual)}</div>
        <div className="kpi-sub">
          <span>Actual for {monthLabel}</span>
        </div>
      </div>

      <div className="kpi-card purple">
        <div className="kpi-icon purple">
          <FiTarget />
        </div>
        <div className="kpi-label">Planned Progress</div>
        <div className="kpi-value">{formatPercent(accumPlanned)}</div>
        <div className="kpi-sub">
          <span>Target for {monthLabel}</span>
        </div>
      </div>

      <div className={`kpi-card ${cardColor}`}>
        <div className={`kpi-icon ${cardColor}`}>
          <FiActivity />
        </div>
        <div className="kpi-label">Schedule Variance (Days)</div>
        <div className="kpi-value" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span>{varianceDays !== null ? (varianceDays > 0 ? `+${varianceDays} Days` : `${varianceDays} Days`) : '—'}</span>
          {variancePercentVal !== null && !isNaN(variancePercentVal) && (
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              ({variancePercentVal > 0 ? '+' : ''}{variancePercentVal.toFixed(2)}% target diff)
            </span>
          )}
        </div>
        <div className="kpi-sub">
          <span className={varianceDays === null ? '' : (varianceDays >= 0 ? 'positive' : 'negative')}>
            {varianceDays === null 
              ? 'Pending data' 
              : (varianceDays > 0 
                ? `Ahead of schedule (+${varianceDays} Days)` 
                : (varianceDays < 0 
                  ? `Behind schedule (${Math.abs(varianceDays)} Days Delay)` 
                  : 'On Track (0 Days Variance)'))}
          </span>
        </div>
      </div>

      <div className={`kpi-card ${spi === null ? 'amber' : (spi >= 1 ? 'green' : 'red')}`}>
        <div className={`kpi-icon ${spi === null ? 'amber' : (spi >= 1 ? 'green' : 'red')}`}>
          <FiCompass />
        </div>
        <div className="kpi-label">SPI (Performance Index)</div>
        <div className="kpi-value">{spi !== null ? spi.toFixed(2) : '—'}</div>
        <div className="kpi-sub">
          <span className={spi === null ? '' : (spi >= 1 ? 'positive' : 'negative')}>
            {spi === null
              ? 'Schedule Performance Index'
              : (spi >= 1
                ? `Efficient (${spi.toFixed(2)} ≥ 1.0) • ${monthLabel}`
                : `Below Target (${spi.toFixed(2)} < 1.0) • ${monthLabel}`)}
          </span>
        </div>
      </div>

      <div className="kpi-card cyan">
        <div className="kpi-icon cyan">
          <FiClock />
        </div>
        <div className="kpi-label">Grey Structure - Time Elapsed</div>
        <div className="kpi-value">{duration} Days</div>
        <div className="kpi-sub">
          <span>Time elapsed up to {monthLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default KPICards;
