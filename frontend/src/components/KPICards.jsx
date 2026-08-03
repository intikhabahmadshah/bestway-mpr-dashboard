import React from 'react';
import { FiTrendingUp, FiTarget, FiActivity, FiClock, FiBarChart2, FiPercent } from 'react-icons/fi';

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

  const formatPercent = (val) => (val !== null ? (val * 100).toFixed(2) + '%' : '—');
  const variance = accumActual !== null ? accumActual - accumPlanned : null;
  const spi = accumPlanned > 0 && accumActual !== null ? accumActual / accumPlanned : null;

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

      <div className={`kpi-card ${variance === null ? 'amber' : (variance >= 0 ? 'green' : 'red')}`}>
        <div className={`kpi-icon ${variance === null ? 'amber' : (variance >= 0 ? 'green' : 'red')}`}>
          <FiActivity />
        </div>
        <div className="kpi-label">Variance</div>
        <div className="kpi-value">{variance !== null ? (variance > 0 ? '+' : '') + (variance * 100).toFixed(2) + '%' : '—'}</div>
        <div className="kpi-sub">
          <span className={variance === null ? '' : (variance >= 0 ? 'positive' : 'negative')}>
            {variance === null ? 'Pending actual data' : (variance >= 0 ? 'Ahead of schedule' : 'Behind schedule')}
          </span>
        </div>
      </div>

      <div className={`kpi-card ${spi === null ? 'amber' : (spi >= 1 ? 'green' : 'amber')}`}>
        <div className={`kpi-icon ${spi === null ? 'amber' : (spi >= 1 ? 'green' : 'amber')}`}>
          <FiPercent />
        </div>
        <div className="kpi-label">SPI</div>
        <div className="kpi-value">{spi !== null ? spi.toFixed(2) : '—'}</div>
        <div className="kpi-sub">
          <span>Schedule Performance Index ({monthLabel})</span>
        </div>
      </div>

      <div className="kpi-card cyan">
        <div className="kpi-icon cyan">
          <FiClock />
        </div>
        <div className="kpi-label">Project Duration</div>
        <div className="kpi-value">{duration} Days</div>
        <div className="kpi-sub">
          <span>Timeline up to {monthLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default KPICards;
