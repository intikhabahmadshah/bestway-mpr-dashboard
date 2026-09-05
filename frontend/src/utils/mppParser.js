import { XMLParser } from 'fast-xml-parser';

/**
 * Parses ISO 8601 duration format into days (assuming 8h standard workday).
 * E.g., 'PT7920H0M0S' -> 990 days, 'PT24H' -> 3 days, 'PT0S' -> 0 days.
 */
export function parseDurationDays(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const match = durationStr.match(/PT(?:([0-9.]+)H)?(?:([0-9.]+)M)?(?:([0-9.]+)S)?/);
  if (match) {
    const hours = parseFloat(match[1] || 0);
    const minutes = parseFloat(match[2] || 0);
    return Math.round(((hours + (minutes / 60)) / 8) * 10) / 10;
  }
  const num = parseFloat(durationStr);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses MS Project MSPDI XML string into clean tasks structure matching schedule_tasks.json.
 */
export function parseMspdiXml(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('Invalid XML string provided');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true
  });

  const jsonObj = parser.parse(xmlString);
  const proj = jsonObj.Project || jsonObj['ns:Project'] || jsonObj;

  if (!proj || !proj.Tasks) {
    throw new Error('Invalid MS Project XML: <Tasks> element not found.');
  }

  const rawTasks = Array.isArray(proj.Tasks.Task) 
    ? proj.Tasks.Task 
    : (proj.Tasks.Task ? [proj.Tasks.Task] : []);

  // Filter out dummy/root project task (UID 0 or ID 0 without a name)
  const validTasks = rawTasks.filter(t => {
    const id = parseInt(t.ID || 0, 10);
    const uid = parseInt(t.UID || 0, 10);
    return id > 0 || (uid > 0 && t.Name);
  });

  const tasks = validTasks.map((t, idx) => {
    const preds = [];
    if (t.PredecessorLink) {
      const pLinks = Array.isArray(t.PredecessorLink) ? t.PredecessorLink : [t.PredecessorLink];
      pLinks.forEach(pl => {
        if (pl && pl.PredecessorUID !== undefined) {
          preds.push(parseInt(pl.PredecessorUID, 10));
        }
      });
    }

    const durationDays = parseDurationDays(t.Duration);
    const isMilestone = t.Milestone === 1 || t.Milestone === '1' || t.Milestone === true || durationDays === 0;
    const isSummary = t.Summary === 1 || t.Summary === '1' || t.Summary === true;
    const isCritical = t.Critical === 1 || t.Critical === '1' || t.Critical === true;

    return {
      id: parseInt(t.ID || idx + 1, 10),
      unique_id: parseInt(t.UID || t.ID || idx + 1, 10),
      name: String(t.Name || 'Untitled Task').trim(),
      wbs: String(t.WBS || t.OutlineNumber || t.ID || idx + 1),
      outline_level: parseInt(t.OutlineLevel || 1, 10),
      outline_number: String(t.OutlineNumber || t.WBS || ''),
      summary: isSummary,
      milestone: isMilestone,
      critical: isCritical,
      duration_days: durationDays,
      start: t.Start ? String(t.Start).split('T')[0] : null,
      finish: t.Finish ? String(t.Finish).split('T')[0] : null,
      actual_start: t.ActualStart ? String(t.ActualStart).split('T')[0] : null,
      actual_finish: t.ActualFinish ? String(t.ActualFinish).split('T')[0] : null,
      percent_complete: parseInt(t.PercentComplete || 0, 10),
      predecessors: preds,
      resource_names: String(t.ResourceNames || '')
    };
  });

  // Calculate project boundary dates
  let projectStart = proj.StartDate ? String(proj.StartDate).split('T')[0] : null;
  let projectFinish = proj.FinishDate ? String(proj.FinishDate).split('T')[0] : null;

  // Filter out overall Project Timeline root task from activities list
  const filteredTasks = [];
  tasks.forEach(t => {
    const tName = (t.name || '').trim().toLowerCase();
    const isTimelineRoot = tName === 'project time line' || tName === 'project timeline' || (t.wbs === '1' && tName.includes('project time line'));
    if (isTimelineRoot) {
      if (!projectStart && t.start) projectStart = t.start;
      if (!projectFinish && t.finish) projectFinish = t.finish;
    } else {
      filteredTasks.push(t);
    }
  });

  if (!projectStart) projectStart = filteredTasks[0]?.start || '2026-01-01';
  if (!projectFinish) projectFinish = filteredTasks[filteredTasks.length - 1]?.finish || '2028-09-16';

  // Renumber tasks starting sequentially from 1 and shift WBS if root was removed
  const renumberedTasks = filteredTasks.map((t, idx) => {
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

  return {
    project_name: proj.Title || proj.Name || 'Bestway Tower Project',
    project_start: projectStart,
    project_finish: projectFinish,
    total_tasks: renumberedTasks.length,
    tasks: renumberedTasks
  };
}
