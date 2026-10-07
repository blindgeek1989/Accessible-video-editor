/**
 * MarkerManager — manages the list of time-based markers.
 * No DOM dependencies; pure data logic consumed by app.js.
 */
class MarkerManager {
  constructor() {
    this._markers = [];
    this._counter = 0;
  }

  /**
   * Add a marker at a given time (seconds).
   * Returns the new marker object.
   */
  add(timeSeconds, label) {
    this._counter++;
    const autoLabel = label && label.trim() ? label.trim() : `Marker ${this._counter}`;
    const marker = {
      id: `marker-${this._counter}`,
      time: timeSeconds,
      label: autoLabel,
    };
    this._markers.push(marker);
    this._markers.sort((a, b) => a.time - b.time);
    return marker;
  }

  /**
   * Remove a marker by id. Returns true if found and removed.
   */
  remove(id) {
    const before = this._markers.length;
    this._markers = this._markers.filter(m => m.id !== id);
    return this._markers.length < before;
  }

  /** Return all markers in time order. */
  getAll() {
    return [...this._markers];
  }

  /** Find a marker by id. */
  getById(id) {
    return this._markers.find(m => m.id === id) || null;
  }

  /** Return the count of markers. */
  get count() {
    return this._markers.length;
  }

  /** Clear all markers and reset counter. */
  clear() {
    this._markers = [];
    this._counter = 0;
  }
}
