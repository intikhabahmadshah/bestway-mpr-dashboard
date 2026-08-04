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

  const plannedData = data.map(d => (d.monthly_planned || 0) * 100);
  const actualData = data.map(d =>
    d.monthly_actual !== null && d.monthly_actual !== undefined
      ? d.monthly_actual * 100
      : null
  );

  // Dynamic Y-axis max with headroom for data labels
  const allVals = [...plannedData, ...actualData.filter(v => v !== null)];
  const yMaxVal = Math.max(...allVals, 1);
  const yMax = Math.ceil(yMaxVal + Math.max(yMaxVal * 0.25, 3)); // 25% headroom or at least +3

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Monthly Planned %',
        data: plannedData,
        backgroundColor: isDark
          ? 'rgba(99, 102, 241, 0.75)'
          : 'rgba(79, 70, 229, 0.65)',
        hoverBackgroundColor: isDark
          ? 'rgba(129, 140, 248, 0.9)'
          : 'rgba(99, 102, 241, 0.85)',
        borderColor: isDark ? '#818cf8' : '#6366f1',
        borderWidth: 1.5,
        borderRadius: 5,
        borderSkipped: 'bottom',
        barPercentage: 0.7,
        categoryPercentage: 0.55,
        datalabels: {
          display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0.05,
          clip: false,
          color: isDark ? '#c7d2fe' : '#4338ca',
          anchor: 'end',
          align: 'top',
          offset: 4,
          font: { family: 'Poppins', size: 8.5, weight: 700 },
          formatter: (val) => val.toFixed(1) + '%',
        },
      },
      {
        label: 'Monthly Actual %',
        data: actualData,
        backgroundColor: isDark
          ? 'rgba(16, 185, 129, 0.75)'
          : 'rgba(5, 150, 105, 0.6)',
        hoverBackgroundColor: isDark
          ? 'rgba(52, 211, 153, 0.9)'
          : 'rgba(16, 185, 129, 0.85)',
        borderColor: isDark ? '#34d399' : '#10b981',
        borderWidth: 1.5,
        borderRadius: 5,
        borderSkipped: 'bottom',
        barPercentage: 0.7,
        categoryPercentage: 0.55,
        datalabels: {
          display: (ctx) =>
            ctx.dataset.data[ctx.dataIndex] !== null &&
            ctx.dataset.data[ctx.dataIndex] > 0.05,
          clip: false,
          color: isDark ? '#6ee7b7' : '#047857',
          anchor: 'end',
          align: 'top',
          offset: 4,
          font: { family: 'Poppins', size: 8.5, weight: 700 },
          formatter: (val) => (val !== null ? val.toFixed(1) + '%' : ''),
        },
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 30,
        bottom: 5,
        left: 8,
        right: 8,
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          color: isDark ? '#e2e8f0' : '#1e293b',
          font: { family: 'Poppins', size: 11, weight: 600 },
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 24,
          boxWidth: 14,
          boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: isDark
          ? 'rgba(15, 23, 42, 0.96)'
          : 'rgba(255, 255, 255, 0.96)',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#94a3b8' : '#475569',
        borderColor: isDark
          ? 'rgba(129, 140, 248, 0.3)'
          : 'rgba(99, 102, 241, 0.25)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 8,
        titleFont: { family: 'Poppins', size: 12, weight: 700 },
        bodyFont: { family: 'Poppins', size: 11 },
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${context.parsed.y !== null ? context.parsed.y.toFixed(2) : '—'}%`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: yMax,
        grid: {
          color: isDark
            ? 'rgba(99, 102, 241, 0.08)'
            : 'rgba(99, 102, 241, 0.1)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 10, weight: 500 },
          padding: 8,
          callback: (value) => value + '%',
        },
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Poppins', size: 9, weight: 500 },
          padding: 6,
          maxRotation: 55,
          minRotation: 40,
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: 600,
      easing: 'easeOutQuart',
    },
  };

  return (
    <div style={{ height: '360px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default MonthlyBarChart;
