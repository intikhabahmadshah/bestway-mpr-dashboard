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
  const value = (activeData.accumulative_actual || 0) * 100;
  
  const monthLabel = activeData.month_ending
    ? new Date(activeData.month_ending).toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : activeData.month;

  const chartData = {
    labels: ['Completed', 'Remaining'],
    datasets: [
      {
        data: [value, Math.max(0, 100 - value)],
        backgroundColor: [
          '#2EC4B6',
          isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.6)'
        ],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
        datalabels: {
          display: false,
        },
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: Math.max((window.devicePixelRatio || 1) * 2.5, 4),
    resizeDelay: 0,
    cutout: '78%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(7,59,76,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: isDark ? '#f1f5f9' : '#073B4C',
        bodyColor: isDark ? '#94a3b8' : '#475569',
        borderColor: 'rgba(46,196,182,0.3)',
        borderWidth: 1,
        padding: 12,
        titleFont: { family: 'Poppins', weight: 600 },
        bodyFont: { family: 'Poppins' },
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed.toFixed(2)}%`
        }
      }
    }
  };

  return (
    <div className="gauge-container" style={{ height: '300px' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
        <Doughnut data={chartData} options={options} />
        <div style={{ position: 'absolute', bottom: '20px', textAlign: 'center' }}>
          <div className="gauge-value">{value.toFixed(1)}%</div>
          <div className="gauge-label">Completion ({monthLabel})</div>
        </div>
      </div>
    </div>
  );
};

export default GaugeChart;
