import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FiCalendar, 
  FiClock, 
  FiSearch, 
  FiFilter, 
  FiLayers, 
  FiCheckCircle, 
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiFileText, 
  FiDatabase, 
  FiDownload, 
  FiList, 
  FiZap,
  FiEye,
  FiZoomIn,
  FiZoomOut,
  FiArrowRight,
  FiTrendingUp,
  FiActivity
} from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import scheduleFallback from '../data/schedule_tasks.json';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Standard Date Formatter: "DD-MM-YYYY"
const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '—';
  if (dateVal instanceof Date) {
    const d = String(dateVal.getDate()).padStart(2, '0');
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const y = dateVal.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const parts = String(dateVal).split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }
  return String(dateVal);
};

const LookAtSchedulePage = ({ onNavigate, theme, showToast }) => {
  const isDark = theme === 'dark';

  // Real-world / default reference date (Current active month: September 2026)
  const todayRef = useMemo(() => new Date(), []);
  const defaultYear = todayRef.getFullYear() >= 2026 && todayRef.getFullYear() <= 2028 ? todayRef.getFullYear() : 2026;
  const defaultMonthIndex = todayRef.getFullYear() >= 2026 ? todayRef.getMonth() : 8; // September (8)

  const [currentYear, setCurrentYear] = useState(defaultYear);
  const [currentMonth, setCurrentMonth] = useState(defaultMonthIndex); // 0-indexed
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | CRITICAL | STARTING | FINISHING | MILESTONE | SUMMARY
  const [activeTab, setActiveTab] = useState('overview'); // overview | gantt | table | analytics
  const [dayColWidth, setDayColWidth] = useState(36); // px per day (26, 36, 48)
  const [hoveredTask, setHoveredTask] = useState(null);

  // Active Schedule State (initialized from cache or bundled JSON, updated via DB)
  const [activeSchedule, setActiveSchedule] = useState(() => {
    const cached = localStorage.getItem('mpr_project_schedule_cache_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) return parsed;
      } catch (e) {}
    }
    return scheduleFallback;
  });

  // Auto-fetch latest schedule from Database on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/schedule')
      .then(r => r.json())
      .then(res => {
        if (isMounted && res.success && res.data && Array.isArray(res.data.tasks) && res.data.tasks.length > 0) {
          setActiveSchedule(res.data);
          localStorage.setItem('mpr_project_schedule_cache_v1', JSON.stringify(res.data));
        }
      })
      .catch(err => console.warn('Could not fetch schedule from database:', err));

    return () => { isMounted = false; };
  }, []);

  const allTasks = useMemo(() => {
    const raw = activeSchedule.tasks || [];
    const filtered = raw.filter(t => {
      const name = (t.name || '').trim().toLowerCase();
      return name !== 'project time line' && name !== 'project timeline' && !(t.wbs === '1' && name.includes('project time line'));
    });
    return filtered.map((t, idx) => {
      let wbs = t.wbs;
      if (wbs) {
        const parts = String(wbs).split('.');
        const first = parseInt(parts[0], 10);
        if (!isNaN(first) && first >= 2) {
          parts[0] = String(first - 1);
          wbs = parts.join('.');
        }
      }
      return {
        ...t,
        id: idx + 1,
        wbs: wbs || String(idx + 1),
        outline_number: wbs || String(idx + 1)
      };
    });
  }, [activeSchedule]);

  // Available Months Across Project Schedule (for Jump-To Selector)
  const availableMonths = useMemo(() => {
    const pStart = new Date(activeSchedule.project_start || '2025-09-01');
    const pFinish = new Date(activeSchedule.project_finish || '2028-09-16');
    const months = [];
    const cur = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
    const end = new Date(pFinish.getFullYear(), pFinish.getMonth() + 1, 1);

    while (cur <= end) {
      months.push({
        year: cur.getFullYear(),
        monthIndex: cur.getMonth(),
        label: `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`,
        value: `${cur.getFullYear()}-${cur.getMonth()}`
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }, [activeSchedule]);

  // Current Month Boundaries & Calendar Days
  const monthInfo = useMemo(() => {
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0); // last day of month
    const totalDays = endDate.getDate();

    const startIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const endIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

    const days = [];
    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(currentYear, currentMonth, d);
      const dayOfWeek = dt.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isoStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = todayRef.toISOString().slice(0, 10) === isoStr;

      days.push({
        dayNum: d,
        dayName: DAY_NAMES[dayOfWeek],
        dateStr: isoStr,
        isWeekend,
        isToday
      });
    }

    return {
      startDate,
      endDate,
      totalDays,
      startIso,
      endIso,
      days,
      label: `${MONTH_NAMES[currentMonth]} ${currentYear}`
    };
  }, [currentYear, currentMonth, todayRef]);

  // Filter Tasks Active In Selected Month & Compute Monthly Lifecycles
  const monthlyTasks = useMemo(() => {
    const { startIso, endIso, totalDays } = monthInfo;

    return allTasks
      .filter(t => {
        if (!t.start || !t.finish) return false;
        // Active if overlaps with month window
        return t.start <= endIso && t.finish >= startIso;
      })
      .map(t => {
        const startsInMonth = t.start >= startIso && t.start <= endIso;
        const finishesInMonth = t.finish >= startIso && t.finish <= endIso;
        const spansFullMonth = t.start < startIso && t.finish > endIso;
        const startedEarlier = t.start < startIso;
        const continuesNext = t.finish > endIso;

        // Day numbers for Gantt chart (1-indexed within the month)
        const sDay = startedEarlier ? 1 : new Date(t.start).getDate();
        const fDay = continuesNext ? totalDays : new Date(t.finish).getDate();
        const monthDuration = Math.max(1, fDay - sDay + 1);

        let lifecycleStatus = 'Ongoing';
        let lifecycleBadgeClass = 'badge-ongoing';
        if (t.milestone) {
          lifecycleStatus = 'Milestone';
          lifecycleBadgeClass = 'badge-milestone';
        } else if (startsInMonth && finishesInMonth) {
          lifecycleStatus = 'Start & Finish in Month';
          lifecycleBadgeClass = 'badge-start-finish';
        } else if (startsInMonth) {
          lifecycleStatus = 'Starts This Month';
          lifecycleBadgeClass = 'badge-starting';
        } else if (finishesInMonth) {
          lifecycleStatus = 'Finishes This Month';
          lifecycleBadgeClass = 'badge-finishing';
        } else if (spansFullMonth) {
          lifecycleStatus = 'Spans Full Month';
          lifecycleBadgeClass = 'badge-spanning';
        }

        return {
          ...t,
          startsInMonth,
          finishesInMonth,
          spansFullMonth,
          startedEarlier,
          continuesNext,
          startDayNum: sDay,
          finishDayNum: fDay,
          monthDuration,
          lifecycleStatus,
          lifecycleBadgeClass
        };
      });
  }, [allTasks, monthInfo]);

  // Filtered Tasks according to Search and Status Filter
  const filteredTasks = useMemo(() => {
    return monthlyTasks.filter(t => {
      // Search
      const matchesSearch = !searchTerm || 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.wbs.includes(searchTerm);

      if (!matchesSearch) return false;

      // Filter Tab
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'CRITICAL') return t.critical;
      if (statusFilter === 'STARTING') return t.startsInMonth && !t.milestone;
      if (statusFilter === 'FINISHING') return t.finishesInMonth && !t.milestone;
      if (statusFilter === 'MILESTONE') return t.milestone;
      if (statusFilter === 'SUMMARY') return t.summary;

      return true;
    });
  }, [monthlyTasks, searchTerm, statusFilter]);

  // High-Impact KPIs for the Month
  const kpis = useMemo(() => {
    const total = monthlyTasks.length;
    const starting = monthlyTasks.filter(t => t.startsInMonth && !t.milestone).length;
    const finishing = monthlyTasks.filter(t => t.finishesInMonth && !t.milestone).length;
    const critical = monthlyTasks.filter(t => t.critical).length;
    const milestones = monthlyTasks.filter(t => t.milestone).length;
    const summaries = monthlyTasks.filter(t => t.summary).length;
    const leaves = total - summaries;
    const totalTaskDays = monthlyTasks.filter(t => !t.summary).reduce((acc, t) => acc + t.monthDuration, 0);

    return { total, starting, finishing, critical, milestones, summaries, leaves, totalTaskDays };
  }, [monthlyTasks]);

  // Daily Workload Density (Number of active tasks on each day of the month)
  const dailyWorkload = useMemo(() => {
    const counts = new Array(monthInfo.totalDays).fill(0);
    const criticalCounts = new Array(monthInfo.totalDays).fill(0);

    monthlyTasks.forEach(t => {
      if (t.summary) return; // exclude summary containers from density to reflect real work
      for (let d = t.startDayNum; d <= t.finishDayNum; d++) {
        if (d >= 1 && d <= monthInfo.totalDays) {
          counts[d - 1]++;
          if (t.critical) {
            criticalCounts[d - 1]++;
          }
        }
      }
    });

    const maxDensity = Math.max(1, ...counts);
    const peakDay = counts.indexOf(maxDensity) + 1;

    return { counts, criticalCounts, maxDensity, peakDay };
  }, [monthlyTasks, monthInfo.totalDays]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToMonth = (val) => {
    const [y, m] = val.split('-').map(Number);
    setCurrentYear(y);
    setCurrentMonth(m);
  };

  const handleResetToCurrentMonth = () => {
    setCurrentYear(defaultYear);
    setCurrentMonth(defaultMonthIndex);
    if (showToast) showToast(`Jumped to ${MONTH_NAMES[defaultMonthIndex]} ${defaultYear}`, 'info');
  };

  // Export Month Tasks to CSV
  const handleExportCSV = () => {
    if (monthlyTasks.length === 0) {
      if (showToast) showToast('No activities to export for this month.', 'info');
      return;
    }

    const headers = ['WBS', 'Task Name', 'Start Date', 'Finish Date', 'Total Days', 'Days in Month', 'Month Status', 'Critical', 'Milestone', 'Percent Complete'];
    const rows = filteredTasks.map(t => [
      `"${t.wbs}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      t.start,
      t.finish,
      t.duration_days,
      t.monthDuration,
      `"${t.lifecycleStatus}"`,
      t.critical ? 'YES' : 'NO',
      t.milestone ? 'YES' : 'NO',
      `${t.percent_complete}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Look_at_Schedule_${MONTH_NAMES[currentMonth]}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) showToast(`Exported ${filteredTasks.length} activities to CSV!`, 'success');
  };

  // Chart Data 1: Daily Workload Density Area Chart
  const densityChartData = useMemo(() => {
    const labels = monthInfo.days.map(d => `${d.dayNum} ${d.dayName}`);
    return {
      labels,
      datasets: [
        {
          label: 'Total Active Tasks',
          data: dailyWorkload.counts,
          fill: true,
          borderColor: '#2EC4B6',
          backgroundColor: isDark ? 'rgba(46, 196, 182, 0.22)' : 'rgba(46, 196, 182, 0.15)',
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2EC4B6',
          borderWidth: 2.5
        },
        {
          label: 'Critical Path Tasks',
          data: dailyWorkload.criticalCounts,
          fill: true,
          borderColor: '#EF476F',
          backgroundColor: isDark ? 'rgba(239, 71, 111, 0.25)' : 'rgba(239, 71, 111, 0.15)',
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#EF476F',
          borderWidth: 2
        }
      ]
    };
  }, [monthInfo.days, dailyWorkload, isDark]);

  const ganttContainerRef = useRef(null);

  return (
    <div className="lookahead-container">
      {/* Top Banner Toolbar */}
      <div className="lookahead-header-banner">
        <div className="banner-left">
          <div className="banner-badge">
            <FiEye size={15} /> Look at Schedule
          </div>
          <h1 className="banner-title">
            {monthInfo.label} — Monthly Look-Ahead
          </h1>
          <p className="banner-subtitle">
            Deep-dive day-by-day activity tracking, critical path intensity, and high-definition Gantt scheduling.
          </p>
        </div>

        <div className="banner-right">
          {/* Month Navigator Controls */}
          <div className="month-nav-pill-group">
            <button 
              className="month-nav-btn" 
              onClick={handlePrevMonth} 
              title="Go to Previous Month"
            >
              <FiChevronLeft size={18} /> Prev Month
            </button>

            <select 
              className="month-nav-select"
              value={`${currentYear}-${currentMonth}`}
              onChange={(e) => handleJumpToMonth(e.target.value)}
              title="Select any project month"
            >
              {availableMonths.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <button 
              className="month-nav-btn" 
              onClick={handleNextMonth} 
              title="Go to Next Month"
            >
              Next Month <FiChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn-today-reset" 
              onClick={handleResetToCurrentMonth}
              title="Reset to current month (September 2026)"
            >
              <span className="live-pulse-dot"></span> Current Month
            </button>

            <button 
              className="btn-export-csv" 
              onClick={handleExportCSV}
              title="Download filtered month activities as CSV"
            >
              <FiDownload size={15} /> Export Month CSV
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Strip */}
      <div className="lookahead-date-strip">
        <div className="strip-item">
          <FiCalendar size={16} className="text-teal" />
          <span><strong>Window:</strong> {formatDateDisplay(monthInfo.startIso)} to {formatDateDisplay(monthInfo.endIso)} ({monthInfo.totalDays} Calendar Days)</span>
        </div>
        <div className="strip-item">
          <FiActivity size={16} className="text-cyan" />
          <span><strong>Peak Workload Day:</strong> Day {dailyWorkload.peakDay} ({dailyWorkload.maxDensity} concurrent tasks)</span>
        </div>
        <div className="strip-item">
          <FiDatabase size={16} className="text-blue" />
          <span><strong>Project Database:</strong> Synchronized ({allTasks.length} total activities)</span>
        </div>
      </div>

      {/* Monthly High-Impact KPIs */}
      <div className="lookahead-kpi-grid">
        <div className="lookahead-kpi-card teal">
          <div className="kpi-header">
            <span className="kpi-title">Active in Month</span>
            <div className="kpi-icon-circle teal"><FiLayers size={18} /></div>
          </div>
          <div className="kpi-value">{kpis.total}</div>
          <div className="kpi-meta">
            <span>{kpis.leaves} leaf activities</span>
            <span>{kpis.summaries} phase summaries</span>
          </div>
        </div>

        <div className="lookahead-kpi-card green">
          <div className="kpi-header">
            <span className="kpi-title">Starting This Month</span>
            <div className="kpi-icon-circle green"><FiTrendingUp size={18} /></div>
          </div>
          <div className="kpi-value">{kpis.starting}</div>
          <div className="kpi-meta">
            <span>Mobilization &amp; kickoff gates</span>
          </div>
        </div>

        <div className="lookahead-kpi-card blue">
          <div className="kpi-header">
            <span className="kpi-title">Finishing This Month</span>
            <div className="kpi-icon-circle blue"><FiCheckCircle size={18} /></div>
          </div>
          <div className="kpi-value">{kpis.finishing}</div>
          <div className="kpi-meta">
            <span>Critical handovers &amp; sign-offs</span>
          </div>
        </div>

        <div className="lookahead-kpi-card red">
          <div className="kpi-header">
            <span className="kpi-title">Critical Path Tasks</span>
            <div className="kpi-icon-circle red">
              <span className="critical-pulse-indicator"></span>
              <FiAlertCircle size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.critical}</div>
          <div className="kpi-meta">
            <span>Zero float activities (Delays risk 2028 finish)</span>
          </div>
        </div>

        <div className="lookahead-kpi-card gold">
          <div className="kpi-header">
            <span className="kpi-title">Milestones in Month</span>
            <div className="kpi-icon-circle gold"><FiZap size={18} /></div>
          </div>
          <div className="kpi-value">{kpis.milestones}</div>
          <div className="kpi-meta">
            <span>Key project completion targets</span>
          </div>
        </div>

        <div className="lookahead-kpi-card purple">
          <div className="kpi-header">
            <span className="kpi-title">Monthly Task Days</span>
            <div className="kpi-icon-circle purple"><FiClock size={18} /></div>
          </div>
          <div className="kpi-value">{kpis.totalTaskDays}</div>
          <div className="kpi-meta">
            <span>Cumulative task work volume</span>
          </div>
        </div>
      </div>

      {/* Navigation View Switcher Tabs */}
      <div className="lookahead-view-nav">
        <div className="view-tabs">
          <button 
            className={`view-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FiActivity size={16} /> Overview &amp; Gantt
          </button>
          <button 
            className={`view-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <FiActivity size={16} /> Workload Density
          </button>
          <button 
            className={`view-tab-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            <FiList size={16} /> Activities Table ({filteredTasks.length})
          </button>
        </div>

        {/* Search & Filter Group */}
        <div className="lookahead-filter-bar">
          <div className="search-box-wrapper">
            <FiSearch className="search-icon" size={16} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by activity name or WBS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-pill-group">
            <button 
              className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({monthlyTasks.length})
            </button>
            <button 
              className={`filter-pill ${statusFilter === 'CRITICAL' ? 'active critical' : ''}`}
              onClick={() => setStatusFilter('CRITICAL')}
            >
              Critical ({kpis.critical})
            </button>
            <button 
              className={`filter-pill ${statusFilter === 'STARTING' ? 'active' : ''}`}
              onClick={() => setStatusFilter('STARTING')}
            >
              Starting ({kpis.starting})
            </button>
            <button 
              className={`filter-pill ${statusFilter === 'FINISHING' ? 'active' : ''}`}
              onClick={() => setStatusFilter('FINISHING')}
            >
              Finishing ({kpis.finishing})
            </button>
            {kpis.milestones > 0 && (
              <button 
                className={`filter-pill ${statusFilter === 'MILESTONE' ? 'active' : ''}`}
                onClick={() => setStatusFilter('MILESTONE')}
              >
                Milestones ({kpis.milestones})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW (Daily Gantt Chart + Quick Insights) */}
      {(activeTab === 'overview' || activeTab === 'gantt') && (
        <div className="lookahead-gantt-section">
          <div className="section-toolbar">
            <div className="toolbar-info">
              <h3><FiCalendar size={18} /> Daily Gantt Timeline — {monthInfo.label}</h3>
              <p>Day 1 to Day {monthInfo.totalDays} exact task schedule with critical path indicators &amp; boundary flags.</p>
            </div>

            <div className="gantt-controls">
              <span className="zoom-label">Day Scale:</span>
              <button 
                className={`btn-zoom ${dayColWidth === 28 ? 'active' : ''}`}
                onClick={() => setDayColWidth(28)}
                title="Compact View (28px/day)"
              >
                Compact
              </button>
              <button 
                className={`btn-zoom ${dayColWidth === 36 ? 'active' : ''}`}
                onClick={() => setDayColWidth(36)}
                title="Standard View (36px/day)"
              >
                Standard
              </button>
              <button 
                className={`btn-zoom ${dayColWidth === 48 ? 'active' : ''}`}
                onClick={() => setDayColWidth(48)}
                title="Expanded View (48px/day)"
              >
                Expanded
              </button>
            </div>
          </div>

          {/* Daily Gantt Table Container */}
          <div className="daily-gantt-wrapper" ref={ganttContainerRef}>
            {filteredTasks.length === 0 ? (
              <div className="empty-schedule-box">
                <FiAlertCircle size={32} style={{ color: 'var(--text-muted)' }} />
                <h4>No Activities Scheduled in {monthInfo.label} matching filters</h4>
                <p>Try switching months using the navigator above or clearing your search filters.</p>
              </div>
            ) : (
              <div className="daily-gantt-table">
                {/* Gantt Header Row */}
                <div className="gantt-header-row">
                  <div className="task-col-header" style={{ width: '360px', minWidth: '360px' }}>
                    Activity Name &amp; WBS
                  </div>
                  <div className="meta-col-header" style={{ width: '190px', minWidth: '190px' }}>
                    Dates
                  </div>
                  <div className="meta-col-header" style={{ width: '85px', minWidth: '85px' }}>
                    Days in Month
                  </div>

                  {/* Day Columns */}
                  <div className="timeline-days-header" style={{ width: `${monthInfo.totalDays * dayColWidth}px` }}>
                    {monthInfo.days.map(d => (
                      <div 
                        key={d.dayNum} 
                        className={`day-cell-header ${d.isWeekend ? 'weekend' : ''} ${d.isToday ? 'today' : ''}`}
                        style={{ width: `${dayColWidth}px`, minWidth: `${dayColWidth}px` }}
                        title={`${d.dayNum} ${monthInfo.label} (${d.dayName})${d.isToday ? ' - TODAY' : ''}`}
                      >
                        <span className="day-name">{d.dayName}</span>
                        <span className="day-number">{d.dayNum}</span>
                        {d.isToday && <span className="today-chip">TODAY</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gantt Body Rows */}
                <div className="gantt-body-rows">
                  {filteredTasks.map(t => {
                    const isHovered = hoveredTask === t.id;
                    const barLeft = (t.startDayNum - 1) * dayColWidth;
                    const barWidth = Math.max(dayColWidth - 4, (t.finishDayNum - t.startDayNum + 1) * dayColWidth - 4);

                    return (
                      <div 
                        key={t.id} 
                        className={`gantt-row ${t.summary ? 'is-summary' : ''} ${t.critical ? 'is-critical' : ''} ${isHovered ? 'hovered' : ''}`}
                        onMouseEnter={() => setHoveredTask(t.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        {/* Task Title Cell */}
                        <div 
                          className="task-cell-title" 
                          style={{ 
                            width: '360px', 
                            minWidth: '360px',
                            paddingLeft: `${16 + Math.min(t.outline_level || 1, 4) * 14}px` 
                          }}
                        >
                          <span className="task-wbs-tag">{t.wbs}</span>
                          <span className="task-name-text" title={t.name}>{t.name}</span>
                          {t.critical && <span className="critical-tag-badge">CRITICAL</span>}
                          {t.milestone && <span className="milestone-tag-badge">MILESTONE</span>}
                        </div>

                        {/* Schedule Dates Cell */}
                        <div className="task-cell-dates" style={{ width: '190px', minWidth: '190px' }}>
                          <span className="date-badge" style={{ whiteSpace: 'nowrap', fontSize: '0.73rem', fontWeight: 600 }}>
                            {formatDateDisplay(t.start)} <span style={{ color: 'var(--text-muted)', margin: '0 2px' }}>→</span> {formatDateDisplay(t.finish)}
                          </span>
                        </div>

                        {/* Month Days Cell */}
                        <div className="task-cell-days" style={{ width: '85px', minWidth: '85px' }}>
                          <span className="duration-pill">{t.monthDuration}d</span>
                        </div>

                        {/* Gantt Timeline Bar Canvas */}
                        <div 
                          className="gantt-timeline-canvas" 
                          style={{ width: `${monthInfo.totalDays * dayColWidth}px` }}
                        >
                          {/* Weekend Background Columns */}
                          {monthInfo.days.map(d => (
                            <div 
                              key={d.dayNum}
                              className={`day-col-strip ${d.isWeekend ? 'weekend' : ''} ${d.isToday ? 'today' : ''}`}
                              style={{ 
                                left: `${(d.dayNum - 1) * dayColWidth}px`, 
                                width: `${dayColWidth}px` 
                              }}
                            />
                          ))}

                          {/* Task Bar */}
                          <div 
                            className={`daily-gantt-bar ${t.critical ? 'bar-critical' : (t.summary ? 'bar-summary' : 'bar-standard')} ${t.milestone ? 'bar-milestone' : ''}`}
                            style={{
                              left: `${barLeft + 2}px`,
                              width: `${barWidth}px`
                            }}
                            title={`${t.name} (${t.wbs})\nDates in ${monthInfo.label}: Day ${t.startDayNum} to Day ${t.finishDayNum} (${t.monthDuration} days)\nFull Span: ${t.start} to ${t.finish}\nStatus: ${t.lifecycleStatus}`}
                          >
                            {/* Left indicator if started in earlier month */}
                            {t.startedEarlier && (
                              <span className="boundary-indicator left" title={`Started earlier on ${t.start}`}>
                                ◀
                              </span>
                            )}

                            <span className="bar-label">
                              {t.milestone ? '◆ MILESTONE' : `${t.monthDuration}d • ${t.name}`}
                            </span>

                            {/* Right indicator if continues into next month */}
                            {t.continuesNext && (
                              <span className="boundary-indicator right" title={`Continues until ${t.finish}`}>
                                ▶
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADVANCED WORKLOAD INSIGHTS & CHARTS */}
      {(activeTab === 'overview' || activeTab === 'analytics') && (
        <div className="lookahead-analytics-grid">
          {/* Chart 1: Daily Workload Intensity */}
          <div className="analytics-card chart-full">
            <div className="analytics-card-header">
              <div>
                <h3 className="card-heading">
                  <FiActivity className="text-teal" /> Daily Workload Density &amp; Concurrency
                </h3>
                <p className="card-subheading">
                  Concurrent active tasks on each day of {monthInfo.label}. Highlights labor congestion &amp; site coordination peaks.
                </p>
              </div>
              <div className="peak-day-badge">
                Peak: Day {dailyWorkload.peakDay} ({dailyWorkload.maxDensity} concurrent activities)
              </div>
            </div>
            <div style={{ height: '240px', width: '100%', position: 'relative' }}>
              <Line 
                data={densityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    datalabels: { display: false },
                    legend: {
                      position: 'top',
                      labels: { 
                        color: isDark ? '#f1f5f9' : '#0f172a', 
                        font: { family: 'Poppins', size: 12, weight: '600' },
                        usePointStyle: true,
                        boxWidth: 8
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(7, 59, 76, 0.95)',
                      titleFont: { family: 'Poppins', size: 13, weight: '700' },
                      bodyFont: { family: 'Poppins', size: 12 },
                      padding: 12,
                      cornerRadius: 8,
                      callbacks: {
                        title: (items) => `Day ${items[0].label} (${monthInfo.label})`,
                        label: (item) => ` ${item.dataset.label}: ${item.raw} tasks`
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                      ticks: { color: isDark ? '#cbd5e1' : '#475569', font: { family: 'Poppins', size: 11, weight: '500' } }
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                      ticks: { precision: 0, color: isDark ? '#cbd5e1' : '#475569', font: { family: 'Poppins', size: 11, weight: '600' } }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETAILED ACTIVITIES TABLE */}
      {(activeTab === 'overview' || activeTab === 'table') && (
        <div className="lookahead-table-section">
          <div className="section-toolbar">
            <div className="toolbar-info">
              <h3><FiList size={18} /> Detailed Activity Roster — {monthInfo.label}</h3>
              <p>Showing {filteredTasks.length} of {monthlyTasks.length} activities active in this calendar window.</p>
            </div>
          </div>

          <div className="lookahead-table-wrapper">
            <table className="lookahead-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>WBS</th>
                  <th style={{ width: '380px' }}>Activity Description</th>
                  <th style={{ width: '130px', minWidth: '130px', whiteSpace: 'nowrap' }}>Schedule Start</th>
                  <th style={{ width: '130px', minWidth: '130px', whiteSpace: 'nowrap' }}>Schedule Finish</th>
                  <th style={{ width: '90px' }}>Days in Month</th>
                  <th style={{ width: '90px' }}>Total Duration</th>
                  <th style={{ width: '150px' }}>Status in Month</th>
                  <th style={{ width: '100px' }}>Critical Path</th>
                  <th style={{ width: '100px' }}>Milestone</th>
                  <th style={{ width: '100px' }}>Completion</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-empty-message">
                      No activities match your current search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr 
                      key={t.id} 
                      className={`${t.summary ? 'row-summary' : ''} ${t.critical ? 'row-critical' : ''}`}
                    >
                      <td className="wbs-cell font-mono">{t.wbs}</td>
                      <td className="name-cell" style={{ paddingLeft: `${14 + Math.min(t.outline_level || 1, 4) * 12}px` }}>
                        <span className="task-name-text">{t.name}</span>
                      </td>
                      <td className="date-cell" style={{ width: '130px', minWidth: '130px', whiteSpace: 'nowrap' }}>
                        <span className={`date-tag ${t.startsInMonth ? 'tag-highlight' : ''}`} style={{ whiteSpace: 'nowrap' }}>
                          {formatDateDisplay(t.start)}
                        </span>
                      </td>
                      <td className="date-cell" style={{ width: '130px', minWidth: '130px', whiteSpace: 'nowrap' }}>
                        <span className={`date-tag ${t.finishesInMonth ? 'tag-highlight' : ''}`} style={{ whiteSpace: 'nowrap' }}>
                          {formatDateDisplay(t.finish)}
                        </span>
                      </td>
                      <td className="days-cell font-bold text-teal">{t.monthDuration} days</td>
                      <td className="days-cell text-muted">{t.duration_days} days</td>
                      <td className="status-cell">
                        <span className={`lifecycle-badge ${t.lifecycleBadgeClass}`}>
                          {t.lifecycleStatus}
                        </span>
                      </td>
                      <td className="critical-cell">
                        {t.critical ? (
                          <span className="badge-critical-pulse">
                            <span className="dot"></span> Critical
                          </span>
                        ) : (
                          <span className="badge-normal">Standard</span>
                        )}
                      </td>
                      <td className="milestone-cell">
                        {t.milestone ? (
                          <span className="badge-milestone-gold">◆ Yes</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="progress-cell">
                        <div className="table-progress-bar">
                          <div 
                            className="table-progress-fill" 
                            style={{ width: `${t.percent_complete || 0}%` }}
                          />
                        </div>
                        <span className="progress-text">{t.percent_complete || 0}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookAtSchedulePage;
