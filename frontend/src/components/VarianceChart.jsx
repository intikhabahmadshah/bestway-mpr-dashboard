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

  // Filter to only include months with actual data
  const validData = data.filter(d => d.accumulative_actual !== null && d.accumulative_actual !== undefined);
  
  const labels = validData.map(d => {
    const date = new Date(d.month_ending);
    return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
  });

  const variances = validData.map(d => (d.accumulative_actual - d.accumulative_planned) * 100);
  
  // Calculate dynamic min and max for Y-axis scale to ensure 0% line is nicely centered with head room
  const minVal = Math.min(...variances, 0);
  const maxVal = Math.max(...variances, 0);
  
  const yMin = Math.floor(minVal - 1.5);
  const yMax = Math.max(Math.ceil(maxVal + 2.0), 2.5); // Ensure at least +2.5% headroom so 0.00% is never at the top edge

  const backgroundColors = variances.map(v => {
    if (Math.abs(v) < 0.001) return isDark ? 'rgba(245, 158, 11, 0.8)' : 'rgba(245, 158, 11, 0.7)'; // Amber for 0%
    return v > 0 
      ? (isDark ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.75)') 
      : (isDark ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.75)');
  });

  const borderColors = variances.map(v => {
    if (Math.abs(v) < 0.001) return '#f59e0b';
    return v > 0 ? '#10b981' : '#ef4444';
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
            if (Math.abs(val) < 0.001) return isDark ? '#fbbf24' : '#d97706'; // Amber for 0.00%
            if (isDark) return val > 0 ? '#6ee7b7' : '#fca5a5';
            return val > 0 ? '#047857' : '#b91c1c';
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
    layout: {
      padding: {
        top: 30, // Room for datalabels above 0%
        bottom: 20
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: isDark ? '#f1f5f9' : '#1e293b',
        bodyColor: isDark ? '#94a3b8' : '#475569',
        borderColor: 'rgba(99,102,241,0.2)',
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
          color: (ctx) => (ctx.tick.value === 0 ? (isDark ? '#818cf8' : '#6366f1') : (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.12)')),
          lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1),
        },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 11 },
          callback: (value) => value.toFixed(1) + '%'
        }
      },
      x: {
        grid: { color: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.1)' },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 11, weight: 600 },
          padding: 8
        }
      }
    }
  };

  return (
    <div style={{ height: '320px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default VarianceChart;
