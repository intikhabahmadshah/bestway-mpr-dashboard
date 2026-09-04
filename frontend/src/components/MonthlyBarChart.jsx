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
  if (!data || !Array.isArray(data) || data.length === 0) return null;

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

  // Custom plugin: draw both labels centered above each bar group safely
  const centeredLabelsPlugin = useMemo(() => ({
    id: 'centeredLabels',
    afterDatasetsDraw(chart) {
      try {
        if (!chart || !chart.data || !Array.isArray(chart.data.labels)) return;
        const { ctx, data: chartData } = chart;
        const meta0 = chart.getDatasetMeta(0);
        const meta1 = chart.getDatasetMeta(1);

        if (!meta0 || !meta0.data || !meta1 || !meta1.data) return;

        for (let i = 0; i < chartData.labels.length; i++) {
          const bar0 = meta0.data[i];
          const bar1 = meta1.data[i];
          if (!bar0 || !bar0.x || !bar0.y) continue;

          const val0 = chartData.datasets[0]?.data?.[i];
          const val1 = bar1 ? chartData.datasets[1]?.data?.[i] : null;
          const hasPlanned = val0 !== null && val0 !== undefined && val0 > 0.05;
          const hasActual = val1 !== null && val1 !== undefined && val1 > 0.05;

          const centerX = (bar1 && bar1.x) ? (bar0.x + bar1.x) / 2 : bar0.x;
          const topY = (bar1 && bar1.y) ? Math.min(bar0.y, bar1.y) : bar0.y;

          if (!Number.isFinite(centerX) || !Number.isFinite(topY)) continue;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.font = '700 8.5px Poppins, sans-serif';

          // Teal label (Planned) — bottom row
          if (hasPlanned) {
            ctx.fillStyle = isDark ? '#5EEAD4' : '#0F766E';
            ctx.fillText(Number(val0).toFixed(1) + '%', centerX, topY - 4);
          }

          // Coral label (Actual) — top row
          if (hasActual) {
            ctx.fillStyle = isDark ? '#FDA4AF' : '#BE123C';
            const greenY = hasPlanned ? topY - 17 : topY - 4;
            ctx.fillText(Number(val1).toFixed(1) + '%', centerX, greenY);
          }

          ctx.restore();
        }
      } catch (e) {
        console.warn('Centered labels plugin caught error:', e);
      }
    }
  }), [isDark]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Monthly Planned %',
        data: plannedData,
        backgroundColor: isDark ? 'rgba(46, 196, 182, 0.45)' : 'rgba(46, 196, 182, 0.35)',
        borderColor: '#2EC4B6',
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
      {
        label: 'Monthly Actual %',
        data: actualData,
        backgroundColor: isDark ? 'rgba(239, 71, 111, 0.65)' : 'rgba(239, 71, 111, 0.55)',
        borderColor: '#EF476F',
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: Math.max((window.devicePixelRatio || 1) * 2, 3),
    layout: {
      padding: { top: 28, bottom: 6, left: 6, right: 10 },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#f1f5f9' : '#073B4C',
          font: { family: 'Poppins', size: 11, weight: 600 },
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 12,
        },
      },
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
          label: (context) => {
            const val = context.parsed.y;
            return `${context.dataset.label}: ${val !== null ? val.toFixed(2) + '%' : '—'}`;
          },
        },
      },
      datalabels: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: yMax,
        grid: {
          color: (ctx) =>
            ctx.tick.value === 0
              ? isDark ? 'rgba(46,196,182,0.25)' : 'rgba(46,196,182,0.3)'
              : isDark ? 'rgba(46,196,182,0.08)' : 'rgba(7,59,76,0.08)',
        },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 10, weight: 500 },
          padding: 8,
          callback: (value) => value + '%',
        },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Poppins', size: 9, weight: 500 },
          padding: 6,
          maxRotation: 55,
          minRotation: 40,
        },
      },
    },
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 600, easing: 'easeOutQuart' },
  };

  return (
    <div className="monthly-chart-responsive-container">
      <Bar data={chartData} options={options} plugins={[centeredLabelsPlugin]} />
    </div>
  );
};

export default MonthlyBarChart;
