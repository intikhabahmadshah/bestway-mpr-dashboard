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
        borderColor: '#2EC4B6',
        backgroundColor: 'rgba(46, 196, 182, 0.06)',
        borderDash: [6, 4],
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === selectedIndex ? 8 : 4),
        pointHoverRadius: 8,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === selectedIndex ? '#FFD166' : '#2EC4B6'),
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointBorderWidth: 2,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: isDark ? '#5EEAD4' : '#0F766E',
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
        borderColor: '#EF476F',
        backgroundColor: 'rgba(239, 71, 111, 0.06)',
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === selectedIndex ? 10 : 6),
        pointHoverRadius: 9,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === selectedIndex ? '#FFD166' : '#EF476F'),
        pointBorderColor: (ctx) => (ctx.dataIndex === selectedIndex ? '#ffffff' : (isDark ? '#111827' : '#ffffff')),
        pointBorderWidth: 2,
        borderWidth: 3,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: (ctx) => (ctx.dataIndex === selectedIndex ? (isDark ? '#FFD166' : '#B45309') : (isDark ? '#FDA4AF' : '#BE123C')),
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
    devicePixelRatio: Math.max((window.devicePixelRatio || 1) * 2.5, 4),
    resizeDelay: 0,
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
          color: isDark ? '#f1f5f9' : '#073B4C',
          font: { family: 'Poppins', size: 12, weight: 500 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        }
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
          label: (context) => `${context.dataset.label}: ${context.parsed.y !== null ? context.parsed.y.toFixed(2) : '—'}% (Click to inspect)`
        }
      }
    },
    scales: {
      y: {
        min: -2,
        max: 104,
        grid: {
          color: (ctx) => (ctx.tick.value === 0 ? (isDark ? 'rgba(46,196,182,0.25)' : 'rgba(46,196,182,0.3)') : (isDark ? 'rgba(46,196,182,0.08)' : 'rgba(7,59,76,0.08)')),
        },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 11 },
          padding: 8,
          callback: (value) => (value >= 0 ? value + '%' : '')
        }
      },
      x: {
        offset: true,
        grid: { color: isDark ? 'rgba(46,196,182,0.06)' : 'rgba(7,59,76,0.06)' },
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
