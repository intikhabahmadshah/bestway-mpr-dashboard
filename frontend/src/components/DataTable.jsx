import React, { useState } from 'react';

const DataTable = ({ data, selectedMonth, onSelectMonth }) => {
  // Default sort by duration (chronological order 1 to 20)
  const [sortConfig, setSortConfig] = useState({ key: 'duration', direction: 'asc' });

  if (!data || data.length === 0) return null;

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    // Handle Date sorting properly (convert date strings to timestamps)
    if (sortConfig.key === 'month' || sortConfig.key === 'month_ending') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    } else {
      valA = Number(valA);
      valB = Number(valB);
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const formatPercent = (val) => {
    if (val === null || val === undefined) return '—';
    return (val * 100).toFixed(2) + '%';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('default', { month: 'short', year: 'numeric', day: 'numeric' });
  };

  const getStatusBadge = (row) => {
    if (row.accumulative_actual === null || row.accumulative_actual === undefined) {
      return <span className="status-badge pending">Pending</span>;
    }
    
    const variance = (row.accumulative_actual - row.accumulative_planned) * 100;
    
    if (Math.abs(variance) <= 0.5) {
      return <span className="status-badge on-track">On Track</span>;
    } else if (variance > 0) {
      return <span className="status-badge ahead">Ahead</span>;
    } else {
      return <span className="status-badge behind">Behind</span>;
    }
  };

  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('duration')}>#</th>
              <th onClick={() => handleSort('month')}>Month Start</th>
              <th onClick={() => handleSort('month_ending')}>Month Ending</th>
              <th onClick={() => handleSort('duration')}>Duration (Days)</th>
              <th onClick={() => handleSort('monthly_planned')}>Monthly Planned %</th>
              <th onClick={() => handleSort('monthly_actual')}>Monthly Actual %</th>
              <th onClick={() => handleSort('accumulative_planned')}>Accum. Planned %</th>
              <th onClick={() => handleSort('accumulative_actual')}>Accum. Actual %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => {
              const isSelected = selectedMonth && selectedMonth.month === row.month;
              return (
                <tr 
                  key={index} 
                  className={isSelected ? 'selected-row' : ''}
                  onClick={() => onSelectMonth && onSelectMonth(row)}
                  style={{ cursor: 'pointer' }}
                  title="Click to select this month for full dashboard inspection"
                >
                  <td style={{ fontWeight: 600 }}>{row.id || index + 1}</td>
                  <td>{formatDate(row.month)}</td>
                  <td>{formatDate(row.month_ending)}</td>
                  <td>{row.duration}</td>
                  <td>{formatPercent(row.monthly_planned)}</td>
                  <td>{formatPercent(row.monthly_actual)}</td>
                  <td>{formatPercent(row.accumulative_planned)}</td>
                  <td style={{ fontWeight: isSelected ? 800 : 'normal', color: isSelected ? '#10b981' : 'inherit' }}>
                    {formatPercent(row.accumulative_actual)}
                  </td>
                  <td>{getStatusBadge(row)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
