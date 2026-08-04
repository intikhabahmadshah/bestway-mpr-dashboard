import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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

  // Dynamic Y-axis max with headroom for stacked labels
  const allVals = [...plannedData, ...actualData.filter(v => v !== null)];
  const yMaxVal = Math.max(...allVals, 1);
  const yMax = Math.ceil(yMaxVal + Math.max(yMaxVal * 0.35, 4));

  // Custom plugin: draw both labels centered above each bar group
  const centeredLabelsPlugin = useMemo(() => ({
    id: 'centeredLabels',
    afterDatasetsDraw(chart) {
      const { ctx, data: chartData } = chart;
      const meta0 = chart.getDatasetMeta(0); // Planned (blue)
      const meta1 = chart.getDatasetMeta(1); // Actual (green)

      for (let i = 0; i < chartData.labels.length; i++) {
        const bar0 = meta0.data[i];
        const bar1 = meta1.data[i];
        if (!bar0) continue;

        const val0 = chartData.datasets[0].data[i];
        const val1 = bar1 ? chartData.datasets[1].data[i] : null;
        const hasPlanned = val0 !== null && val0 > 0.05;
        const hasActual = val1 !== null && val1 > 0.05;

        // Center X between the two bars (or just bar0 if no bar1)
        const centerX = bar1 ? (bar0.x + bar1.x) / 2 : bar0.x;

        // Highest bar top Y
        const topY = bar1 ? Math.min(bar0.y, bar1.y) : bar0.y;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = '700 8.5px Poppins, sans-serif';

        // Blue label (Planned) — bottom row, just above bars
        if (hasPlanned) {
          ctx.fillStyle = isDark ? '#c7d2fe' : '#4338ca';
          ctx.fillText(val0.toFixed(1) + '%', centerX, topY - 4);
        }

        // Green label (Actual) — top row, above blue label
        if (hasActual) {
          ctx.fillStyle = isDark ? '#6ee7b7' : '#047857';
          const greenY = hasPlanned ? topY - 17 : topY - 4;
          ctx.fillText(val1.toFixed(1) + '%', centerX, greenY);
        }

        ctx.restore();
      }
    }
  }), [isDark]);

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
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 40,
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
      datalabels: {
        display: false,
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
      <Bar data={chartData} options={options} plugins={[centeredLabelsPlugin]} />
    </div>
  );
};

export default MonthlyBarChart;
