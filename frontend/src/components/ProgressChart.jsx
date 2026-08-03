import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const ProgressChart = ({ data, theme, selectedMonth, onSelectMonth }) => {
  if (!data || data.length === 0) return null;

  const isDark = theme === 'dark';

  const labels = data.map(d => {
    const date = new Date(d.month_ending);
    return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
  });

  const selectedIndex = selectedMonth ? data.findIndex(d => d.month === selectedMonth.month) : -1;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Accumulative Planned %',
        data: data.map(d => (d.accumulative_planned || 0) * 100),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.06)',
        borderDash: [6, 4],
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === selectedIndex ? 8 : 4),
        pointHoverRadius: 8,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === selectedIndex ? '#fbbf24' : '#6366f1'),
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointBorderWidth: 2,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: isDark ? '#a5b4fc' : '#4338ca',
          anchor: 'end',
          align: 'top',
          offset: 6,
          font: { family: 'Poppins', size: 10, weight: 600 },
          formatter: (val) => val.toFixed(1) + '%',
          listeners: {
            click: (context) => {
              if (onSelectMonth) onSelectMonth(data[context.dataIndex]);
            }
          }
        },
      },
      {
        label: 'Accumulative Actual %',
        data: data.map(d => (d.accumulative_actual !== null && d.accumulative_actual !== undefined ? d.accumulative_actual * 100 : null)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === selectedIndex ? 10 : 6),
        pointHoverRadius: 9,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === selectedIndex ? '#f59e0b' : '#10b981'),
        pointBorderColor: (ctx) => (ctx.dataIndex === selectedIndex ? '#ffffff' : (isDark ? '#111827' : '#ffffff')),
        pointBorderWidth: 2,
        borderWidth: 3,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: (ctx) => (ctx.dataIndex === selectedIndex ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#6ee7b7' : '#047857')),
          anchor: 'end',
          align: 'bottom',
          offset: 6,
          font: (ctx) => ({
            family: 'Poppins',
            size: ctx.dataIndex === selectedIndex ? 13 : 11,
            weight: ctx.dataIndex === selectedIndex ? 800 : 700
          }),
          formatter: (val) => (val !== null ? val.toFixed(2) + '%' : ''),
          listeners: {
            click: (context) => {
              if (onSelectMonth) onSelectMonth(data[context.dataIndex]);
            }
          }
        },
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 28,
        bottom: 15,
        left: 20,
        right: 25
      }
    },
    onHover: (event, chartElement) => {
      event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0 && onSelectMonth) {
        const index = elements[0].index;
        onSelectMonth(data[index]);
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#f1f5f9' : '#1e293b',
          font: { family: 'Poppins', size: 12, weight: 500 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        }
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
          label: (context) => `${context.dataset.label}: ${context.parsed.y !== null ? context.parsed.y.toFixed(2) : '—'}% (Click to inspect)`
        }
      }
    },
    scales: {
      y: {
        min: -2, // Distance/gap below 0% so points at 0% don't touch the bottom line
        max: 104, // Headroom for top labels
        grid: {
          color: (ctx) => (ctx.tick.value === 0 ? (isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.3)') : (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.12)')),
        },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 11 },
          padding: 8,
          callback: (value) => (value >= 0 ? value + '%' : '') // Hide negative ticks
        }
      },
      x: {
        offset: true, // Distance/offset from left Y-axis line for first point
        grid: { color: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.1)' },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 10 },
          padding: 10,
          maxRotation: 45,
        }
      }
    }
  };

  return (
    <div style={{ height: '390px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ProgressChart;
