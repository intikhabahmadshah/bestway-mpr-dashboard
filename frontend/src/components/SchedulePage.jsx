import React, { useState, useMemo } from 'react';
import { 
  FiCalendar, 
  FiClock, 
  FiSearch, 
  FiFilter, 
  FiLayers, 
  FiCheckCircle, 
  FiChevronDown, 
  FiChevronRight, 
  FiBarChart2, 
  FiFileText, 
  FiDatabase, 
  FiDownload, 
  FiList, 
  FiZap,
  FiZoomIn,
  FiZoomOut
} from 'react-icons/fi';
import scheduleData from '../data/schedule_tasks.json';

const SchedulePage = ({ onNavigate, theme, showToast }) => {
  const isDark = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'MILESTONE' | 'SUMMARY'
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'table' | 'gantt'
  const [collapsedWBS, setCollapsedWBS] = useState(new Set());
  const [hoveredTask, setHoveredTask] = useState(null);
  const [zoomScale, setZoomScale] = useState(130); // px per month (90, 130, 190, 260)

  const tasks = useMemo(() => scheduleData.tasks || [], []);
  const projectStart = new Date(scheduleData.project_start || '2026-01-01');
  const projectFinish = new Date(scheduleData.project_finish || '2028-09-16');
  const totalProjectDays = Math.max(1, Math.round((projectFinish - projectStart) / (1000 * 60 * 60 * 24)));

  // Generate Month Columns for Gantt Timeline (Jan 2026 to Oct 2028)
  const timelineMonths = useMemo(() => {
    const months = [];
    const cur = new Date(projectStart.getFullYear(), projectStart.getMonth(), 1);
    const end = new Date(projectFinish.getFullYear(), projectFinish.getMonth() + 1, 1);

    while (cur <= end) {
      months.push({
        key: `${cur.getFullYear()}-${cur.getMonth()}`,
        year: cur.getFullYear(),
        monthName: cur.toLocaleDateString('default', { month: 'short' }),
        date: new Date(cur)
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }, [projectStart, projectFinish]);

  const totalTimelineWidth = timelineMonths.length * zoomScale;

  // Key KPI metrics
  const kpis = useMemo(() => {
    const total = tasks.length;
    const criticalCount = tasks.filter(t => t.critical).length;
    const milestonesCount = tasks.filter(t => t.milestone).length;
    const summariesCount = tasks.filter(t => t.summary).length;
    const completedCount = tasks.filter(t => t.percent_complete === 100).length;
    return { total, criticalCount, milestonesCount, summariesCount, completedCount };
  }, [tasks]);

  // Toggle Collapse on summary tasks
  const toggleCollapse = (wbs) => {
    const next = new Set(collapsedWBS);
    if (next.has(wbs)) {
      next.delete(wbs);
    } else {
      next.add(wbs);
    }
    setCollapsedWBS(next);
  };

  const expandAll = () => setCollapsedWBS(new Set());
  const collapseAll = () => {
    const allSummaries = tasks.filter(t => t.summary).map(t => t.wbs);
    setCollapsedWBS(new Set(allSummaries));
  };

  // Filter tasks based on search, phase, filters, and collapsed parents
  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      // Check collapsed parent
      if (collapsedWBS.size > 0) {
        for (const collapsed of collapsedWBS) {
          if (task.wbs !== collapsed && task.wbs.startsWith(collapsed + '.')) {
            return false;
          }
        }
      }

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(term);
        const matchesWbs = task.wbs.toLowerCase().includes(term);
        if (!matchesName && !matchesWbs) return false;
      }

      // Phase Filter
      if (selectedPhase !== 'ALL') {
        if (selectedPhase === 'SHORING' && !task.wbs.startsWith('2')) return false;
        if (selectedPhase === 'GREY' && !task.wbs.startsWith('3')) return false;
        if (selectedPhase === 'OTHER' && (task.wbs.startsWith('2') || task.wbs.startsWith('3'))) return false;
      }

      // Filter Type
      if (filterType === 'CRITICAL' && !task.critical) return false;
      if (filterType === 'MILESTONE' && !task.milestone) return false;
      if (filterType === 'SUMMARY' && !task.summary) return false;

      return true;
    });
  }, [tasks, collapsedWBS, searchTerm, selectedPhase, filterType]);

  // Calculate Gantt bar percentage position & width
  const getGanttBarMetrics = (task) => {
    if (!task.start || !task.finish) return { leftPx: 0, widthPx: 0 };
    const taskStart = new Date(task.start);
    const taskFinish = new Date(task.finish);

    const startOffsetDays = Math.max(0, (taskStart - projectStart) / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(1, (taskFinish - taskStart) / (1000 * 60 * 60 * 24));

    const leftPercent = startOffsetDays / totalProjectDays;
    const widthPercent = durationDays / totalProjectDays;

    const leftPx = leftPercent * totalTimelineWidth;
    const widthPx = Math.max(task.milestone ? 14 : 10, widthPercent * totalTimelineWidth);

    return { leftPx, widthPx };
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'WBS', 'Task Name', 'Level', 'Duration (Days)', 'Start Date', 'Finish Date', '% Complete', 'Critical', 'Predecessors'];
    const rows = tasks.map(t => [
      t.id,
      `"${t.wbs}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      t.outline_level,
      t.duration_days,
      t.start,
      t.finish,
      t.percent_complete,
      t.critical ? 'Yes' : 'No',
      `"${(t.predecessors || []).join(';')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bestway_Tower_MS_Project_Schedule_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Project Schedule exported as CSV successfully!', 'success');
  };

  return (
    <div className="schedule-page-container">
      {/* Top Navigation Bar */}
      <div className="page-navigation-bar">
        <button className="btn-confirm" onClick={() => onNavigate('home')}>
          Return to Portal
        </button>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-shortcut" onClick={() => onNavigate('grey_structure')}>
            <FiBarChart2 /> Grey Structure Dashboard
          </button>
          <button className="btn-shortcut" onClick={() => onNavigate('bills_data')}>
            <FiFileText /> Bills & Log Files
          </button>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="schedule-header-card">
        <div className="schedule-icon-container">
          <FiCalendar size={38} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="phase-pill" style={{ background: 'rgba(46, 196, 182, 0.2)', color: '#2EC4B6', border: '1px solid rgba(46, 196, 182, 0.4)' }}>
              MS Project 2026-2028
            </span>
            <span className="phase-pill" style={{ background: 'rgba(17, 138, 178, 0.2)', color: '#118AB2', border: '1px solid rgba(17, 138, 178, 0.4)' }}>
              <FiDatabase size={12} /> Aiven MySQL Cloud Sync Active
            </span>
          </div>
          <h1 className="schedule-title">Project Activity Schedule (WBS & Gantt)</h1>
          <p className="schedule-subtitle">
            Complete construction activity breakdown with horizontal scrolling calendar timeline, critical path analysis, and full task labels.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn-confirm"
            onClick={handleExportCSV}
            style={{ background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)' }}
            title="Download Schedule as CSV Spreadsheet"
          >
            <FiDownload size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="schedule-kpi-grid">
        <div className="kpi-card cyan">
          <div className="kpi-icon cyan"><FiList /></div>
          <div className="kpi-label">Total Activities</div>
          <div className="kpi-value">{kpis.total}</div>
          <div className="kpi-sub"><span>MS Project Work Packages</span></div>
        </div>

        <div className="kpi-card blue">
          <div className="kpi-icon blue"><FiClock /></div>
          <div className="kpi-label">Total Duration</div>
          <div className="kpi-value">990 Days</div>
          <div className="kpi-sub"><span>01 Jan 2026 $\rightarrow$ 16 Sep 2028</span></div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon green"><FiCheckCircle /></div>
          <div className="kpi-label">Project Start</div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>01 Jan 2026</div>
          <div className="kpi-sub"><span>Mobilization & Shoring</span></div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-icon amber"><FiCalendar /></div>
          <div className="kpi-label">Target Completion</div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>16 Sep 2028</div>
          <div className="kpi-sub"><span>Handover & Finishing</span></div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-icon red"><FiZap /></div>
          <div className="kpi-label">Critical Path Tasks</div>
          <div className="kpi-value" style={{ color: '#EF476F' }}>{kpis.criticalCount}</div>
          <div className="kpi-sub"><span>Zero Float Driving Tasks</span></div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon purple"><FiLayers /></div>
          <div className="kpi-label">WBS Summary Phases</div>
          <div className="kpi-value">{kpis.summariesCount}</div>
          <div className="kpi-sub"><span>Structured Project Levels</span></div>
        </div>
      </div>

      {/* Toolbar & Filter Controls */}
      <div className="schedule-toolbar">
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search by Activity Name or WBS Code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="schedule-search-input"
            />
          </div>

          {/* Phase Filter */}
          <select 
            value={selectedPhase}
            onChange={e => setSelectedPhase(e.target.value)}
            className="schedule-select"
          >
            <option value="ALL">All Project Phases</option>
            <option value="SHORING">WBS 2: Balance Shoring Works</option>
            <option value="GREY">WBS 3: Grey Structure Works</option>
            <option value="OTHER">Other Stages & Finishes</option>
          </select>
        </div>

        {/* Quick Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className={`btn-pill-filter ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All ({tasks.length})
          </button>
          <button 
            className={`btn-pill-filter critical ${filterType === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setFilterType('CRITICAL')}
          >
            <FiZap size={13} /> Critical Path ({kpis.criticalCount})
          </button>
          <button 
            className={`btn-pill-filter ${filterType === 'SUMMARY' ? 'active' : ''}`}
            onClick={() => setFilterType('SUMMARY')}
          >
            <FiLayers size={13} /> Summaries ({kpis.summariesCount})
          </button>
        </div>

        {/* Timeline Zoom Scale Controller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Calendar Zoom:
          </span>
          <button 
            className={`btn-zoom-pill ${zoomScale === 90 ? 'active' : ''}`} 
            onClick={() => setZoomScale(90)}
            title="Compact View (90px/month)"
          >
            Compact
          </button>
          <button 
            className={`btn-zoom-pill ${zoomScale === 130 ? 'active' : ''}`} 
            onClick={() => setZoomScale(130)}
            title="Standard View (130px/month)"
          >
            Standard
          </button>
          <button 
            className={`btn-zoom-pill ${zoomScale === 190 ? 'active' : ''}`} 
            onClick={() => setZoomScale(190)}
            title="Wide View (190px/month)"
          >
            Wide
          </button>
          <button 
            className={`btn-zoom-pill ${zoomScale === 260 ? 'active' : ''}`} 
            onClick={() => setZoomScale(260)}
            title="Ultra Expanded View (260px/month)"
          >
            Ultra
          </button>
        </div>

        {/* View Mode Switcher & Hierarchy Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="view-mode-group">
            <button 
              className={`btn-view-toggle ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Split View (WBS Table + Gantt)"
            >
              Split View
            </button>
            <button 
              className={`btn-view-toggle ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="WBS Table Only"
            >
              Table Only
            </button>
            <button 
              className={`btn-view-toggle ${viewMode === 'gantt' ? 'active' : ''}`}
              onClick={() => setViewMode('gantt')}
              title="Gantt Timeline Only"
            >
              Gantt Only
            </button>
          </div>

          <button className="btn-shortcut" onClick={expandAll} title="Expand All WBS Branches" style={{ padding: '8px 12px' }}>
            Expand All
          </button>
          <button className="btn-shortcut" onClick={collapseAll} title="Collapse All WBS Branches" style={{ padding: '8px 12px' }}>
            Collapse All
          </button>
        </div>
      </div>

      {/* Active Count Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginBottom: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <span>Showing <strong>{visibleTasks.length}</strong> of <strong>{tasks.length}</strong> project activities | Calendar Width: <strong>{totalTimelineWidth}px</strong> (Scroll horizontally below)</span>
        {filterType !== 'ALL' && <span style={{ color: '#EF476F', fontWeight: 600 }}>Filter Active: {filterType}</span>}
      </div>

      {/* Split Interactive Container */}
      <div className={`schedule-workspace ${viewMode}`}>
        {/* LEFT PANEL: WBS ACTIVITY TABLE */}
        {(viewMode === 'split' || viewMode === 'table') && (
          <div className="schedule-table-panel">
            <div className="schedule-table-wrapper">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '90px' }}>WBS</th>
                    <th style={{ minWidth: '240px' }}>Task Name</th>
                    <th style={{ width: '75px', textAlign: 'center' }}>Dur (d)</th>
                    <th style={{ width: '100px' }}>Start</th>
                    <th style={{ width: '100px' }}>Finish</th>
                    <th style={{ width: '75px', textAlign: 'center' }}>% Comp</th>
                    <th style={{ width: '85px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((t) => {
                    const isSummary = t.summary;
                    const isCollapsed = collapsedWBS.has(t.wbs);
                    const indentPx = (t.outline_level - 1) * 16;

                    return (
                      <tr 
                        key={t.id} 
                        className={`schedule-row ${isSummary ? 'summary-row' : ''} ${t.critical ? 'critical-row' : ''}`}
                        onMouseEnter={() => setHoveredTask(t)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{t.id}</td>
                        <td style={{ fontWeight: 700, color: isSummary ? '#2EC4B6' : 'var(--text-primary)', fontSize: '0.8rem' }}>
                          {t.wbs}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${indentPx}px` }}>
                            {isSummary ? (
                              <button 
                                className="btn-wbs-toggle"
                                onClick={() => toggleCollapse(t.wbs)}
                                title={isCollapsed ? 'Expand branch' : 'Collapse branch'}
                              >
                                {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronDown size={14} />}
                              </button>
                            ) : (
                              <span style={{ width: '18px', display: 'inline-block', color: 'var(--text-muted)' }}>•</span>
                            )}
                            <span 
                              style={{ 
                                fontWeight: isSummary ? 800 : 500, 
                                color: isSummary ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: isSummary ? '0.88rem' : '0.84rem'
                              }}
                            >
                              {t.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.duration_days}</td>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{t.start || '—'}</td>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{t.finish || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          <span style={{ color: t.percent_complete === 100 ? '#2EC4B6' : 'var(--text-primary)' }}>
                            {t.percent_complete}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {t.critical ? (
                            <span className="badge-critical">Critical</span>
                          ) : t.percent_complete === 100 ? (
                            <span className="badge-done">Done</span>
                          ) : (
                            <span className="badge-normal">Planned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RIGHT PANEL: INTERACTIVE GANTT TIMELINE WITH HORIZONTAL SCROLL */}
        {(viewMode === 'split' || viewMode === 'gantt') && (
          <div className="schedule-gantt-panel custom-scrollbar">
            {/* Timeline Month Header */}
            <div className="gantt-header-sticky" style={{ width: `${totalTimelineWidth}px`, minWidth: `${totalTimelineWidth}px` }}>
              <div className="gantt-months-track">
                {timelineMonths.map((m) => (
                  <div key={m.key} className="gantt-month-cell" style={{ width: `${zoomScale}px`, minWidth: `${zoomScale}px` }}>
                    <span className="gantt-month-name">{m.monthName}</span>
                    <span className="gantt-year-name">{m.year}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Bars Rows */}
            <div className="gantt-body" style={{ width: `${totalTimelineWidth}px`, minWidth: `${totalTimelineWidth}px` }}>
              {visibleTasks.map((t) => {
                const { leftPx, widthPx } = getGanttBarMetrics(t);
                const isSummary = t.summary;
                const isCritical = t.critical;
                const isHovered = hoveredTask && hoveredTask.id === t.id;

                return (
                  <div 
                    key={t.id} 
                    className={`gantt-row ${isSummary ? 'summary-row' : ''} ${isHovered ? 'hovered' : ''}`}
                    onMouseEnter={() => setHoveredTask(t)}
                    onMouseLeave={() => setHoveredTask(null)}
                  >
                    {/* Background Grid Lines */}
                    <div className="gantt-grid-lines">
                      {timelineMonths.map((m) => (
                        <div key={m.key} className="gantt-grid-column" style={{ width: `${zoomScale}px`, minWidth: `${zoomScale}px` }}></div>
                      ))}
                    </div>

                    {/* Gantt Bar Wrapper with External Label for 100% Full Text Visibility */}
                    <div 
                      className="gantt-bar-wrapper"
                      style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                      title={`[${t.wbs}] ${t.name}\nStart: ${t.start}\nFinish: ${t.finish}\nDuration: ${t.duration_days} Days\nProgress: ${t.percent_complete}%`}
                    >
                      {/* Visual Graphic Bar */}
                      <div 
                        className={`gantt-bar ${isSummary ? 'summary-bar' : (isCritical ? 'critical-bar' : 'normal-bar')} ${t.milestone ? 'milestone-diamond' : ''}`}
                        style={{ width: `${widthPx}px` }}
                      >
                        {/* Actual Progress Fill */}
                        {!isSummary && !t.milestone && t.percent_complete > 0 && (
                          <div 
                            className="gantt-progress-fill" 
                            style={{ width: `${t.percent_complete}%` }}
                          />
                        )}
                      </div>

                      {/* External Label: Always Full Text Visible to the Right */}
                      <span className={`gantt-external-label ${isSummary ? 'summary-label' : ''} ${isCritical ? 'critical-label' : ''}`}>
                        {isSummary ? t.name : `${t.name} (${t.duration_days}d)`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Box */}
      <div className="schedule-footer-note">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiDatabase size={18} style={{ color: '#2EC4B6' }} />
          <span>
            Data synchronized from <strong>MS Project (.mpp)</strong> and stored in <strong>Aiven Cloud MySQL Database</strong> (<code>bestwaytowerproject-intikhabgillani.l.aivencloud.com:21951</code>).
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tip: Drag the horizontal scrollbar at the bottom of the Gantt chart to inspect all months up to 2028.
        </span>
      </div>
    </div>
  );
};

export default SchedulePage;
