import React, { useMemo } from 'react';
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

  const actualDataPoints = data.filter(d => d.accumulative_actual !== null && d.accumulative_actual !== undefined);
  const latestActualIdx = actualDataPoints.length > 0 ? data.findIndex(d => d.month === actualDataPoints[actualDataPoints.length - 1].month) : -1;
  const selectedIndex = selectedMonth ? data.findIndex(d => d.month === selectedMonth.month) : -1;

  // Active focal point index (selected month or latest actual data point)
  const activeFocusIdx = selectedIndex !== -1 ? selectedIndex : (latestActualIdx !== -1 ? latestActualIdx : 0);
  const activePointData = data[activeFocusIdx] || data[0];

  const totalProjectDuration = data && data.length > 0 ? (Number(data[data.length - 1].duration) || 585) : 585;

  // Compute status & variance details for the Callout Note
  const focusActual = activePointData.accumulative_actual !== null && activePointData.accumulative_actual !== undefined 
    ? activePointData.accumulative_actual * 100 
    : null;
  const focusPlanned = (activePointData.accumulative_planned || 0) * 100;
  const focusVariance = focusActual !== null ? (focusActual - focusPlanned) / 100 : null;
  const focusVarianceDays = focusVariance !== null ? Math.round(focusVariance * totalProjectDuration) : null;

  const focusMonthLabel = activePointData.month_ending
    ? new Date(activePointData.month_ending).toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : activePointData.month;

  const statusText = focusVariance === null 
    ? 'PLANNED' 
    : focusVariance > 0 
    ? 'AHEAD' 
    : focusVariance < 0 
    ? 'BEHIND SCHEDULE' 
    : 'ON TRACK';

  const statusColor = focusVariance === null 
    ? '#118AB2' 
    : focusVariance > 0 
    ? '#2EC4B6' 
    : focusVariance < 0 
    ? '#EF476F' 
    : '#118AB2';

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Accumulative Planned %',
        data: data.map(d => (d.accumulative_planned || 0) * 100),
        borderColor: '#2EC4B6',
        backgroundColor: 'rgba(46, 196, 182, 0.05)',
        borderDash: [6, 4],
        borderWidth: 2.5,
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === activeFocusIdx ? 7 : 4),
        pointHoverRadius: 8,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === activeFocusIdx ? '#2EC4B6' : '#2EC4B6'),
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointBorderWidth: 2,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: isDark ? '#5EEAD4' : '#0F766E',
          anchor: 'end',
          align: 'top',
          offset: 8, // Clear vertical gap above line
          font: { family: 'Poppins', size: 10, weight: 700 },
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
        backgroundColor: 'rgba(239, 71, 111, 0.08)',
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === activeFocusIdx ? 9 : 5),
        pointHoverRadius: 10,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === activeFocusIdx ? '#FFD166' : '#EF476F'),
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointBorderWidth: 2.5,
        borderWidth: 3.5,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: isDark ? '#FDA4AF' : '#BE123C',
          anchor: 'end',
          align: 'bottom',
          offset: 8, // Clear vertical gap below line
          font: (ctx) => ({
            family: 'Poppins',
            size: ctx.dataIndex === activeFocusIdx ? 12 : 10.5,
            weight: 800
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

  // Custom Plugin to draw Callout Note with Circle, Line, and Rectangle Box
  const calloutPlugin = useMemo(() => {
    return {
      id: 'customCalloutNote',
      afterDatasetsDraw: (chart) => {
        const metaActual = chart.getDatasetMeta(1);
        const metaPlanned = chart.getDatasetMeta(0);
        if (!metaActual || !metaActual.data || !metaActual.data[activeFocusIdx]) return;

        const actualPoint = metaActual.data[activeFocusIdx];
        const plannedPoint = metaPlanned.data[activeFocusIdx];
        const point = (focusActual !== null && actualPoint) ? actualPoint : plannedPoint;
        if (!point) return;

        const ctx = chart.ctx;
        const x = point.x;
        const y = point.y;

        ctx.save();

        // 1. Draw Focus Circle around the active data point
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Outer pulse ring
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = statusColor === '#EF476F' ? 'rgba(239, 71, 111, 0.28)' : 'rgba(46, 196, 182, 0.28)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 2. Determine Rectangle Box Position
        const boxWidth = 236;
        const boxHeight = 72;
        let boxX = x - boxWidth / 2;
        let boxY = y - 100; // Place above the point

        // Keep inside chart boundaries
        if (boxX < 12) boxX = 12;
        if (boxX + boxWidth > chart.width - 12) boxX = chart.width - boxWidth - 12;
        if (boxY < 32) boxY = y + 36; // Flip below if too close to top

        // 3. Draw Leader Line connecting Circle to Box
        ctx.beginPath();
        const lineStartY = y < boxY ? y + 22 : y - 22;
        const lineTargetY = y < boxY ? boxY : boxY + boxHeight;
        ctx.moveTo(x, lineStartY);
        ctx.lineTo(boxX + boxWidth / 2, lineTargetY);
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. Draw Callout Box (Solid Rounded Rectangle)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = isDark ? '#111827' : '#ffffff';
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
        } else {
          ctx.rect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = 'transparent';

        // 5. Draw Content Text inside Rectangle Box
        // Line 1: Month Label & Status Tag
        ctx.font = 'bold 11px Poppins, sans-serif';
        ctx.fillStyle = isDark ? '#f1f5f9' : '#073B4C';
        ctx.fillText(`${focusMonthLabel}:`, boxX + 12, boxY + 20);

        ctx.font = '800 11px Poppins, sans-serif';
        ctx.fillStyle = statusColor;
        ctx.fillText(statusText, boxX + 80, boxY + 20);

        // Line 2: Variance (% and Days)
        ctx.font = '600 11px Poppins, sans-serif';
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.fillText('Variance: ', boxX + 12, boxY + 40);

        ctx.font = 'bold 12px Poppins, sans-serif';
        ctx.fillStyle = statusColor;
        const varPercentText = focusVariance !== null ? `${focusVariance > 0 ? '+' : ''}${(focusVariance * 100).toFixed(2)}%` : '0.00%';
        const varDaysText = focusVarianceDays !== null 
          ? (focusVarianceDays < 0 ? `${Math.abs(focusVarianceDays)} Days Delay` : `+${focusVarianceDays} Days Ahead`)
          : '0 Days';
        ctx.fillText(`${varPercentText} (${varDaysText})`, boxX + 75, boxY + 40);

        // Line 3: Actual vs Planned Target
        ctx.font = '500 10.5px Poppins, sans-serif';
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        const actualStr = focusActual !== null ? `${focusActual.toFixed(2)}%` : '—';
        const plannedStr = `${focusPlanned.toFixed(2)}%`;
        ctx.fillText(`Actual: ${actualStr}  |  Target: ${plannedStr}`, boxX + 12, boxY + 58);

        ctx.restore();
      }
    };
  }, [activeFocusIdx, focusActual, focusPlanned, focusVariance, focusVarianceDays, focusMonthLabel, statusText, statusColor, isDark]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: Math.max((window.devicePixelRatio || 1) * 2.5, 4),
    resizeDelay: 0,
    layout: {
      padding: {
        top: 45, // Extra top padding for Callout Note Box
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
          font: { family: 'Poppins', size: 12, weight: 600 },
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
    <div style={{ height: '420px', position: 'relative' }}>
      <Line data={chartData} options={options} plugins={[calloutPlugin]} />
    </div>
  );
};

export default ProgressChart;
