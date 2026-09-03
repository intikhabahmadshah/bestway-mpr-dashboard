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

  // Compute status & variance details for the Callout Note
  const focusActual = activePointData.accumulative_actual !== null && activePointData.accumulative_actual !== undefined 
    ? activePointData.accumulative_actual * 100 
    : null;
  const focusPlanned = (activePointData.accumulative_planned || 0) * 100;
  const focusVariance = focusActual !== null ? (focusActual - focusPlanned) / 100 : null;
  const focusVariancePercentVal = focusVariance !== null ? focusVariance * 100 : null;
  // Project Schedule Lag in Days (15 Days Lag / Delay as per MS Project tracking)
  const focusVarianceDays = focusVariance !== null && !isNaN(focusVariance) 
    ? (Number(activePointData.lag_days) || (focusVariance < 0 ? 15 : Math.round(Math.abs(focusVariance) * (Number(activePointData.duration) || 153)))) 
    : null;

  const focusMonthLabel = activePointData.month_ending
    ? new Date(activePointData.month_ending).toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : activePointData.month;

  const statusText = focusVariance === null 
    ? 'PLANNED' 
    : focusVariance > 0 
    ? 'AHEAD OF SCHEDULE' 
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
        backgroundColor: 'rgba(46, 196, 182, 0.04)',
        borderDash: [6, 4],
        borderWidth: 2.5,
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === activeFocusIdx ? 6 : 4),
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
          offset: 14,
          font: { family: 'Poppins', size: 10.5, weight: 700 },
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
        pointRadius: (ctx) => (ctx.dataIndex === activeFocusIdx ? 7.5 : 5),
        pointHoverRadius: 9,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === activeFocusIdx ? '#FFD166' : '#EF476F'),
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3.5,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: isDark ? '#FDA4AF' : '#BE123C',
          anchor: 'end',
          align: 'bottom',
          offset: 16,
          font: (ctx) => ({
            family: 'Poppins',
            size: ctx.dataIndex === activeFocusIdx ? 12 : 11,
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

  // Custom Plugin to draw Callout Note with full crash protection and finite checks
  const calloutPlugin = useMemo(() => {
    return {
      id: 'customCalloutNote',
      afterDatasetsDraw: (chart) => {
        try {
          const metaActual = chart.getDatasetMeta(1);
          const metaPlanned = chart.getDatasetMeta(0);
          if (!metaActual || !metaActual.data || !metaActual.data[activeFocusIdx]) return;

          const actualPoint = metaActual.data[activeFocusIdx];
          const plannedPoint = metaPlanned && metaPlanned.data ? metaPlanned.data[activeFocusIdx] : null;
          const point = (focusActual !== null && actualPoint) ? actualPoint : plannedPoint;
          if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;

          const ctx = chart.ctx;
          const x = point.x;
          const y = point.y;

          ctx.save();

          // 1. Draw Compact Focus Circle (Radius 13px / 18px)
          ctx.beginPath();
          ctx.arc(x, y, 13, 0, Math.PI * 2);
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([4, 3]);
          ctx.fillStyle = statusColor === '#EF476F' ? 'rgba(239, 71, 111, 0.12)' : 'rgba(46, 196, 182, 0.12)';
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          // Outer subtle highlight ring
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.strokeStyle = statusColor === '#EF476F' ? 'rgba(239, 71, 111, 0.22)' : 'rgba(46, 196, 182, 0.22)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Center highlight dot
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFD166';
          ctx.fill();

          // 2. Position Rectangle Box Higher Up
          const boxWidth = 264;
          const boxHeight = 84;

          let boxX = x - boxWidth / 2;
          let boxY = y - boxHeight - 110;

          const isFlippedBelow = y < 165;
          if (isFlippedBelow) {
            boxY = y + 50;
          } else if (boxY < 38) {
            boxY = 38;
          }

          if (boxX < 14) boxX = 14;
          if (boxX + boxWidth > chart.width - 14) boxX = chart.width - boxWidth - 14;

          // 3. Draw DASHED ANGLED Leader Line (Tircha & Dashed)
          ctx.beginPath();
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 2.2;

          const lineStartX = x - 13;
          const lineStartY = isFlippedBelow ? y + 12 : y - 8;
          const lineTargetX = boxX + 65;
          const lineTargetY = isFlippedBelow ? boxY : boxY + boxHeight;

          const controlX = x - 35;
          const controlY = (lineStartY + lineTargetY) / 2;

          ctx.moveTo(lineStartX, lineStartY);
          ctx.quadraticCurveTo(controlX, controlY, lineTargetX, lineTargetY);
          ctx.stroke();
          ctx.setLineDash([]);

          // 4. Draw Callout Box with DASHED Border
          ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(7, 59, 76, 0.16)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 6;

          ctx.fillStyle = isDark ? '#111827' : '#ffffff';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
          } else {
            ctx.rect(boxX, boxY, boxWidth, boxHeight);
          }
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // 5. Draw Content Text inside Rectangle Box
          // Line 1: Month & Status Badge
          ctx.font = 'bold 11.5px Poppins, sans-serif';
          ctx.fillStyle = isDark ? '#f1f5f9' : '#073B4C';
          ctx.fillText(`${focusMonthLabel}:`, boxX + 14, boxY + 24);

          ctx.font = '800 11.5px Poppins, sans-serif';
          ctx.fillStyle = statusColor;
          ctx.fillText(statusText, boxX + 85, boxY + 24);

          // Line 2: Variance (% and Days Delay)
          ctx.font = '600 11.5px Poppins, sans-serif';
          ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
          ctx.fillText('Variance: ', boxX + 14, boxY + 47);

          ctx.font = '800 12.5px Poppins, sans-serif';
          ctx.fillStyle = statusColor;
          const varPercentText = focusVariancePercentVal !== null ? `${focusVariancePercentVal > 0 ? '+' : ''}${focusVariancePercentVal.toFixed(2)}%` : '0.00%';
          const varDaysText = focusVarianceDays !== null 
            ? (focusVariance < 0 ? `${focusVarianceDays} Days Delay` : (focusVariance > 0 ? `+${focusVarianceDays} Days Ahead` : '0 Days'))
            : '0 Days';
          ctx.fillText(`${varPercentText} (${varDaysText})`, boxX + 80, boxY + 47);

          // Line 3: Actual vs Planned Target
          ctx.font = '500 11px Poppins, sans-serif';
          ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
          const actualStr = focusActual !== null ? `${focusActual.toFixed(2)}%` : '—';
          const plannedStr = `${focusPlanned.toFixed(2)}%`;
          ctx.fillText(`Actual: ${actualStr}  |  Target: ${plannedStr}`, boxX + 14, boxY + 69);

          ctx.restore();
        } catch (e) {
          console.warn('Callout draw error caught safely:', e);
        }
      }
    };
  }, [activeFocusIdx, focusActual, focusPlanned, focusVariance, focusVariancePercentVal, focusVarianceDays, focusMonthLabel, statusText, statusColor, isDark]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: Math.max((window.devicePixelRatio || 1) * 2.5, 4),
    resizeDelay: 0,
    layout: {
      padding: {
        top: 55,
        bottom: 25,
        left: 20,
        right: 35
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
          font: { family: 'Poppins', size: 12.5, weight: 600 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 24,
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
        min: 0,
        max: 105,
        grid: {
          color: (ctx) => (ctx.tick.value === 0 ? (isDark ? 'rgba(46,196,182,0.25)' : 'rgba(46,196,182,0.3)') : (isDark ? 'rgba(46,196,182,0.08)' : 'rgba(7,59,76,0.08)')),
        },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 11 },
          padding: 8,
          stepSize: 20,
          callback: (value) => (value <= 100 ? value + '%' : '')
        }
      },
      x: {
        offset: true,
        grid: { color: isDark ? 'rgba(46,196,182,0.06)' : 'rgba(7,59,76,0.06)' },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: { family: 'Poppins', size: 10.5 },
          padding: 12,
          maxRotation: 45,
        }
      }
    }
  };

  return (
    <div style={{ height: '520px', position: 'relative' }}>
      <Line data={chartData} options={options} plugins={[calloutPlugin]} />
    </div>
  );
};

export default ProgressChart;
