import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const GaugeChart = ({ data, theme, selectedMonth }) => {
  if (!data || data.length === 0) return null;

  const isDark = theme === 'dark';

  const actualDataPoints = data.filter(d => d.accumulative_actual !== null && d.accumulative_actual !== undefined);
  const latestDefaultData = actualDataPoints.length > 0 ? actualDataPoints[actualDataPoints.length - 1] : data[0];
  
  const activeData = selectedMonth || latestDefaultData;
  const accumActual = activeData.accumulative_actual !== null && activeData.accumulative_actual !== undefined ? activeData.accumulative_actual * 100 : 0;
  const accumPlanned = (activeData.accumulative_planned || 0) * 100;
  const varianceVal = accumActual - accumPlanned;
  const targetGap = Math.abs(varianceVal);
  
  const monthLabel = activeData.month_ending
    ? new Date(activeData.month_ending).toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : activeData.month;

  // Common gauge options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: Math.max((window.devicePixelRatio || 1) * 2, 3),
    resizeDelay: 50,
    cutout: '74%',
    plugins: {
      legend: { display: false },
      datalabels: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(7,59,76,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: isDark ? '#f1f5f9' : '#073B4C',
        bodyColor: isDark ? '#94a3b8' : '#475569',
        borderColor: 'rgba(46,196,182,0.3)',
        borderWidth: 1,
        padding: 10,
        titleFont: { family: 'Poppins', weight: 600 },
        bodyFont: { family: 'Poppins' },
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed.toFixed(2)}%`
        }
      }
    }
  };

  // Gauge 1: Actual Progress (Completed vs Remaining)
  const actualChartData = {
    labels: ['Actual Completed', 'Remaining'],
    datasets: [
      {
        data: [accumActual, Math.max(0, 100 - accumActual)],
        backgroundColor: [
          '#2EC4B6',
          isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.6)'
        ],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      }
    ]
  };

  // Gauge 2: Target vs Actual Gap
  const targetGapColor = Math.abs(varianceVal) < 0.01 ? '#FFD166' : (varianceVal > 0 ? '#2EC4B6' : '#EF476F');
  
  const targetChartData = {
    labels: ['Target Gap', 'Balance'],
    datasets: [
      {
        data: [targetGap, Math.max(0, 100 - targetGap)],
        backgroundColor: [
          targetGapColor,
          isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.6)'
        ],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      }
    ]
  };

  return (
    <div className="dual-gauge-responsive-wrapper">
      {/* Gauge 1: Actual Progress */}
      <div className="gauge-sub-card">
        <div className="gauge-doughnut-box">
          <Doughnut data={actualChartData} options={commonOptions} />
          <div className="gauge-center-text">
            <div className="gauge-value" style={{ color: isDark ? '#f1f5f9' : '#073B4C' }}>
              {accumActual.toFixed(1)}%
            </div>
            <div className="gauge-label">
              Completed
            </div>
          </div>
        </div>
        <div className="gauge-footer-text">
          <span style={{ fontWeight: 700, color: '#2EC4B6' }}>● Actual Progress</span>
          <div style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Remaining: {(100 - accumActual).toFixed(1)}%</div>
        </div>
      </div>

      {/* Gauge 2: Target vs Actual Gap */}
      <div className="gauge-sub-card">
        <div className="gauge-doughnut-box">
          <Doughnut data={targetChartData} options={commonOptions} />
          <div className="gauge-center-text">
            <div className="gauge-value" style={{ color: targetGapColor }}>
              {varianceVal > 0 ? '+' : ''}{varianceVal.toFixed(1)}%
            </div>
            <div className="gauge-label">
              Target Diff
            </div>
          </div>
        </div>
        <div className="gauge-footer-text">
          <span style={{ fontWeight: 700, color: '#118AB2' }}>● Target: {accumPlanned.toFixed(1)}%</span>
          <div style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Status: <strong style={{ color: targetGapColor }}>{Math.abs(varianceVal) < 0.01 ? 'On Track' : (varianceVal > 0 ? 'Ahead' : 'Behind')}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GaugeChart;
