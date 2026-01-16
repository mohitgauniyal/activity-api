-- status items (building / learning)

CREATE TABLE IF NOT EXISTS status_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,            -- 'building' | 'learning'
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- activity logs

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,               -- tech | life | meta
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
