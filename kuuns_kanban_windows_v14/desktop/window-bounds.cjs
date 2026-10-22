 'use strict';

// BrowserWindow bounds are Electron logical pixels (DIP).
// Center the normal calendar on the current monitor, never outside its work area.
const DEFAULT_CALENDAR_SIZE = Object.freeze({width: 1400, height: 1050});
const DISPLAY_MARGIN = 16;

function centeredCalendarBounds(area, requested = DEFAULT_CALENDAR_SIZE, margin = DISPLAY_MARGIN) {
  if (!area || !Number.isFinite(area.width) || !Number.isFinite(area.height) || area.width <= 0 || area.height <= 0) {
    throw new TypeError('A valid display workArea is required');
  }
  const inset = Math.max(0, Math.floor(Number(margin) || 0));
  const roomW = Math.max(1, Math.floor(area.width) - inset * 2);
  const roomH = Math.max(1, Math.floor(area.height) - inset * 2);
  const width = Math.min(roomW, Math.max(1, Math.floor(requested.width)));
  const height = Math.min(roomH, Math.max(1, Math.floor(requested.height)));
  const x = Math.round(area.x + (area.width - width) / 2);
  const y = Math.round(area.y + (area.height - height) / 2);
  return {x, y, width, height};
}

module.exports = { DEFAULT_CALENDAR_SIZE, DISPLAY_MARGIN, centeredCalendarBounds };
