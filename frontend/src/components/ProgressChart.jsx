import React, { useMemo, useRef } from 'react';
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
  const beaconRef = useRef(null);
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
        borderWidth: 2.2,
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === activeFocusIdx ? 6 : 3.5),
        pointHoverRadius: 7,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === activeFocusIdx ? '#2EC4B6' : '#2EC4B6'),
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointBorderWidth: 1.5,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: isDark ? '#5EEAD4' : '#0F766E',
          anchor: 'end',
          align: 'top',
          offset: (ctx) => (ctx.dataIndex === activeFocusIdx ? (ctx.chart.width < 520 ? 18 : 22) : 8),
          font: (ctx) => ({
            family: 'Poppins',
            size: ctx.dataIndex === activeFocusIdx ? 10.5 : 9.5,
            weight: ctx.dataIndex === activeFocusIdx ? 800 : 700
          }),
          backgroundColor: (ctx) => (ctx.dataIndex === activeFocusIdx
            ? (isDark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff')
            : null),
          borderColor: (ctx) => (ctx.dataIndex === activeFocusIdx
            ? (isDark ? 'rgba(46, 196, 182, 0.6)' : 'rgba(15, 118, 110, 0.55)')
            : null),
          borderWidth: (ctx) => (ctx.dataIndex === activeFocusIdx ? 1.2 : 0),
          borderRadius: 4,
          padding: (ctx) => (ctx.dataIndex === activeFocusIdx ? { top: 2, bottom: 2, left: 6, right: 6 } : 0),
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
        pointRadius: (ctx) => (ctx.dataIndex === activeFocusIdx ? 7 : 4.5),
        pointHoverRadius: 8,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === activeFocusIdx ? '#FFD166' : '#EF476F'),
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3,
        fill: true,
        datalabels: {
          display: true,
          clip: false,
          color: isDark ? '#FDA4AF' : '#BE123C',
          anchor: 'end',
          align: 'bottom',
          offset: (ctx) => (ctx.dataIndex === activeFocusIdx ? (ctx.chart.width < 520 ? 20 : 25) : 10),
          font: (ctx) => ({
            family: 'Poppins',
            size: ctx.dataIndex === activeFocusIdx ? 11 : 9.5,
            weight: 800
          }),
          backgroundColor: (ctx) => (ctx.dataIndex === activeFocusIdx
            ? (isDark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff')
            : null),
          borderColor: (ctx) => (ctx.dataIndex === activeFocusIdx
            ? (isDark ? 'rgba(239, 71, 111, 0.6)' : 'rgba(190, 18, 60, 0.55)')
            : null),
          borderWidth: (ctx) => (ctx.dataIndex === activeFocusIdx ? 1.2 : 0),
          borderRadius: 4,
          padding: (ctx) => (ctx.dataIndex === activeFocusIdx ? { top: 2, bottom: 2, left: 6, right: 6 } : 0),
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

  // Custom Plugin: Adaptive Responsive Callout Note for Mobile, Tablet, and Desktop
  const calloutPlugin = useMemo(() => {
    return {
      id: 'customCalloutNote',
      afterDatasetsDraw: (chart) => {
        try {
          const metaActual = chart.getDatasetMeta(1);
          const metaPlanned = chart.getDatasetMeta(0);
          if (!metaActual || !metaActual.data || !metaActual.data[activeFocusIdx]) {
            if (beaconRef.current) beaconRef.current.style.display = 'none';
            return;
          }

          const actualPoint = metaActual.data[activeFocusIdx];
          const plannedPoint = metaPlanned && metaPlanned.data ? metaPlanned.data[activeFocusIdx] : null;
          const point = (focusActual !== null && actualPoint) ? actualPoint : plannedPoint;
          if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            if (beaconRef.current) beaconRef.current.style.display = 'none';
            return;
          }

          const ctx = chart.ctx;
          const x = point.x;
          const y = point.y;
          const chartW = chart.width;
          const isMobile = chartW < 520;
          const isTablet = chartW >= 520 && chartW < 900;

          // Reposition Signal Beacon DOM Overlay
          if (beaconRef.current) {
            beaconRef.current.style.display = 'flex';
            beaconRef.current.style.left = `${x}px`;
            beaconRef.current.style.top = `${y}px`;
          }

          ctx.save();

          // 1. Draw Adaptive Focus Circle
          const circleR = isMobile ? 10 : 13;

          ctx.beginPath();
          ctx.arc(x, y, circleR, 0, Math.PI * 2);
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = isMobile ? 1.6 : 2;
          ctx.setLineDash([3, 3]);
          ctx.fillStyle = statusColor === '#EF476F' ? 'rgba(239, 71, 111, 0.08)' : 'rgba(46, 196, 182, 0.08)';
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          // Center highlight dot
          ctx.beginPath();
          ctx.arc(x, y, isMobile ? 2.5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFD166';
          ctx.fill();

          // 2. Adaptive Rectangle Box Dimensions
          const boxWidth = isMobile ? Math.min(210, chartW - 20) : (isTablet ? 240 : 264);
          const boxHeight = isMobile ? 68 : 82;
          const verticalOffset = isMobile ? 48 : 85;

          let boxX = x - boxWidth / 2;
          let boxY = y - boxHeight - verticalOffset;

          const isFlippedBelow = y < (isMobile ? 120 : 155);
          if (isFlippedBelow) {
            boxY = y + (isMobile ? 35 : 45);
          } else if (boxY < (isMobile ? 24 : 36)) {
            boxY = isMobile ? 24 : 36;
          }

          if (boxX < 10) boxX = 10;
          if (boxX + boxWidth > chartW - 10) boxX = chartW - boxWidth - 10;

          // 3. Draw DASHED ANGLED Leader Line (Tircha & Dashed)
          ctx.beginPath();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = isMobile ? 1.8 : 2.2;

          const lineStartX = x - (isMobile ? 8 : 12);
          const lineStartY = isFlippedBelow ? y + circleR + 3 : y - circleR - 3;
          const lineTargetX = boxX + (isMobile ? 35 : 55);
          const lineTargetY = isFlippedBelow ? boxY : boxY + boxHeight;

          const controlX = x - (isMobile ? 22 : 32);
          const controlY = (lineStartY + lineTargetY) / 2;

          ctx.moveTo(lineStartX, lineStartY);
          ctx.quadraticCurveTo(controlX, controlY, lineTargetX, lineTargetY);
          ctx.stroke();
          ctx.setLineDash([]);

          // 4. Draw Callout Box with DASHED Border
          ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(7, 59, 76, 0.16)';
          ctx.shadowBlur = isMobile ? 8 : 14;
          ctx.shadowOffsetY = isMobile ? 3 : 5;

          ctx.fillStyle = isDark ? '#111827' : '#ffffff';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, isMobile ? 8 : 10);
          } else {
            ctx.rect(boxX, boxY, boxWidth, boxHeight);
          }
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = isMobile ? 1.8 : 2.2;
          ctx.setLineDash([5, 3]);
          ctx.stroke();
          ctx.setLineDash([]);

          // 5. Draw Content Text inside Rectangle Box (Responsive Fonts)
          const padLeft = isMobile ? 10 : 14;
          const line1Y = boxY + (isMobile ? 19 : 24);
          const line2Y = boxY + (isMobile ? 38 : 47);
          const line3Y = boxY + (isMobile ? 55 : 68);

          // Line 1: Month & Status Badge
          ctx.font = `bold ${isMobile ? '9.5px' : '11.5px'} Poppins, sans-serif`;
          ctx.fillStyle = isDark ? '#f1f5f9' : '#073B4C';
          ctx.fillText(`${focusMonthLabel}:`, boxX + padLeft, line1Y);

          ctx.font = `800 ${isMobile ? '9.5px' : '11.5px'} Poppins, sans-serif`;
          ctx.fillStyle = statusColor;
          ctx.fillText(statusText, boxX + (isMobile ? 65 : 85), line1Y);

          // Line 2: Variance (% and Days Delay)
          ctx.font = `600 ${isMobile ? '9.5px' : '11.5px'} Poppins, sans-serif`;
          ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
          ctx.fillText('Variance: ', boxX + padLeft, line2Y);

          ctx.font = `800 ${isMobile ? '10.5px' : '12.5px'} Poppins, sans-serif`;
          ctx.fillStyle = statusColor;
          const varPercentText = focusVariancePercentVal !== null ? `${focusVariancePercentVal > 0 ? '+' : ''}${focusVariancePercentVal.toFixed(2)}%` : '0.00%';
          const varDaysText = focusVarianceDays !== null 
            ? (focusVariance < 0 ? `${focusVarianceDays} Days Delay` : (focusVariance > 0 ? `+${focusVarianceDays} Days Ahead` : '0 Days'))
            : '0 Days';
          ctx.fillText(`${varPercentText} (${varDaysText})`, boxX + (isMobile ? 60 : 78), line2Y);

          // Line 3: Actual vs Planned Target
          ctx.font = `500 ${isMobile ? '9px' : '10.5px'} Poppins, sans-serif`;
          ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
          const actualStr = focusActual !== null ? `${focusActual.toFixed(2)}%` : '—';
          const plannedStr = `${focusPlanned.toFixed(2)}%`;
          ctx.fillText(`Actual: ${actualStr}  |  Target: ${plannedStr}`, boxX + padLeft, line3Y);

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
    layout: {
      padding: {
        top: 45,
        bottom: 20,
        left: 10,
        right: 18
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
          font: {
            family: 'Poppins',
            size: 11,
            weight: 600
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
        }
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
          label: (context) => `${context.dataset.label}: ${context.parsed.y !== null ? context.parsed.y.toFixed(2) : '—'}%`
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
          font: { family: 'Poppins', size: 10 },
          padding: 6,
          stepSize: 20,
          callback: (value) => (value <= 100 ? value + '%' : '')
        }
      },
      x: {
        offset: true,
        grid: { color: isDark ? 'rgba(46,196,182,0.06)' : 'rgba(7,59,76,0.06)' },
        ticks: {
          color: isDark ? '#64748b' : '#475569',
          font: {
            family: 'Poppins',
            size: 9.5
          },
          padding: 8,
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 14
        }
      }
    }
  };

  return (
    <div className="scurve-chart-responsive-container position-relative">
      <Line data={chartData} options={options} plugins={[calloutPlugin]} />
      <div 
        ref={beaconRef} 
        className="signal-beacon-wrapper" 
        style={{ 
          display: 'none',
          '--beacon-color': statusColor,
          '--beacon-bg': statusColor === '#EF476F' ? 'rgba(239, 71, 111, 0.08)' : 'rgba(46, 196, 182, 0.08)'
        }}
        aria-hidden="true"
      >
        <div className="signal-beacon-ring" />
        <div className="signal-radar-wave wave-1" />
        <div className="signal-radar-wave wave-2" />
        <div className="signal-beacon-core" />
      </div>
    </div>
  );
};

export default ProgressChart;
