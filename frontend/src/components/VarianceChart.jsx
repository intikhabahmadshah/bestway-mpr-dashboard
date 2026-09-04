import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const VarianceChart = ({ data, theme }) => {
  if (!data || data.length === 0) return null;

  const isDark = theme === 'dark';

  const validData = data.filter(d => d.accumulative_actual !== null && d.accumulative_actual !== undefined);
  
  const labels = validData.map(d => {
    const date = new Date(d.month_ending);
    return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
  });

  const variances = validData.map(d => (d.accumulative_actual - d.accumulative_planned) * 100);
  
  const minVal = Math.min(...variances, 0);
  const maxVal = Math.max(...variances, 0);
  const yMin = Math.floor(minVal - 1.5);
  const yMax = Math.max(Math.ceil(maxVal + 2.0), 2.5);

  const backgroundColors = variances.map(v => {
    if (Math.abs(v) < 0.001) return isDark ? 'rgba(255, 209, 102, 0.8)' : 'rgba(255, 209, 102, 0.7)';
    return v > 0 
      ? (isDark ? 'rgba(46, 196, 182, 0.8)' : 'rgba(46, 196, 182, 0.75)') 
      : (isDark ? 'rgba(239, 71, 111, 0.8)' : 'rgba(239, 71, 111, 0.75)');
  });

  const borderColors = variances.map(v => {
    if (Math.abs(v) < 0.001) return '#FFD166';
    return v > 0 ? '#2EC4B6' : '#EF476F';
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Schedule Variance %',
        data: variances,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6,
        datalabels: {
          display: true,
          clip: false,
          color: (ctx) => {
            const val = ctx.dataset.data[ctx.dataIndex];
            if (Math.abs(val) < 0.001) return isDark ? '#FFD166' : '#B45309';
            if (isDark) return val > 0 ? '#5EEAD4' : '#FDA4AF';
            return val > 0 ? '#0F766E' : '#BE123C';
          },
          anchor: (ctx) => {
            const val = ctx.dataset.data[ctx.dataIndex];
            return val < 0 ? 'start' : 'end';
          },
          align: (ctx) => {
            const val = ctx.dataset.data[ctx.dataIndex];
            return val < 0 ? 'bottom' : 'top';
          },
          offset: 6,
          font: { family: 'Poppins', size: 11, weight: 700 },
          formatter: (val) => {
            if (Math.abs(val) < 0.001) return '0.00% (On Track)';
            return (val > 0 ? '+' : '') + val.toFixed(2) + '%';
          },
        },
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: Math.max((window.devicePixelRatio || 1) * 2.5, 4),
    resizeDelay: 0,
    layout: {
      padding: {
        top: 30,
        bottom: 20
      }
    },
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
          label: (context) => {
            const val = context.parsed.y;
            if (Math.abs(val) < 0.001) return 'Variance: 0.00% (On Track)';
            return `Variance: ${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        min: yMin,
        max: yMax,
        grid: {
          color: (ctx) => (ctx.tick.value === 0 ? (isDark ? '#2EC4B6' : '#2EC4B6') : (isDark ? 'rgba(46,196,182,0.08)' : 'rgba(7,59,76,0.08)')),
          lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1),
        },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 11 },
          callback: (value) => value.toFixed(1) + '%'
        }
      },
      x: {
        grid: { color: isDark ? 'rgba(46,196,182,0.06)' : 'rgba(7,59,76,0.06)' },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 11, weight: 600 },
          padding: 8
        }
      }
    }
  };

  return (
    <div className="variance-chart-responsive-container">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default VarianceChart;
