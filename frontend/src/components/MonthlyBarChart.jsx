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

const MonthlyBarChart = ({ data, theme }) => {
  if (!data || data.length === 0) return null;

  const isDark = theme === 'dark';

  const labels = data.map(d => {
    const date = new Date(d.month_ending);
    return date.toLocaleDateString('default', { month: 'short', year: '2-digit' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Monthly Planned %',
        data: data.map(d => (d.monthly_planned || 0) * 100),
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.7)' : 'rgba(99, 102, 241, 0.6)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4,
        datalabels: {
          display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0.1,
          clip: false,
          color: isDark ? '#c7d2fe' : '#3730a3',
          anchor: 'end',
          align: 'top',
          offset: 2,
          font: { family: 'Poppins', size: 9, weight: 600 },
          formatter: (val) => val.toFixed(1) + '%',
        },
      },
      {
        label: 'Monthly Actual %',
        data: data.map(d => d.monthly_actual !== null && d.monthly_actual !== undefined ? d.monthly_actual * 100 : null),
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.7)' : 'rgba(16, 185, 129, 0.6)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4,
        datalabels: {
          display: (ctx) => ctx.dataset.data[ctx.dataIndex] !== null && ctx.dataset.data[ctx.dataIndex] > 0.1,
          clip: false,
          color: isDark ? '#6ee7b7' : '#047857',
          anchor: 'end',
          align: 'top',
          offset: 2,
          font: { family: 'Poppins', size: 9, weight: 600 },
          formatter: (val) => val !== null ? val.toFixed(1) + '%' : '',
        },
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#f1f5f9' : '#1e293b',
          font: { family: 'Poppins', size: 12, weight: 500 },
          usePointStyle: true,
          pointStyle: 'rectRounded',
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
          label: (context) => `${context.dataset.label}: ${context.parsed.y !== null ? context.parsed.y.toFixed(2) : '—'}%`
        }
      }
    },
    scales: {
      y: {
        grace: '10%',
        grid: { color: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.12)' },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 11 },
          callback: (value) => value + '%'
        }
      },
      x: {
        grid: { color: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.1)' },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 10 },
        }
      }
    }
  };

  return (
    <div style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default MonthlyBarChart;
