-- Schema de la base de datos para Testing Automation Framework
-- SQLite Database

-- Tabla de Proyectos
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Test Suites
CREATE TABLE IF NOT EXISTS test_suites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);

-- Tabla de Tests
-- NOTA: suite_id permite NULL para tests "huérfanos" (sin suite asignada)
-- Al eliminar una suite, los tests quedan sin suite pero NO se eliminan
CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  suite_id INTEGER,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('natural', 'yaml')),
  file_path TEXT NOT NULL,
  description TEXT,
  url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE SET NULL
);

-- Tabla de Ejecuciones
CREATE TABLE IF NOT EXISTS executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running', 'success', 'failed', 'error')),
  mode TEXT CHECK(mode IN ('auto', 'llm', 'direct')),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  duration INTEGER,
  logs TEXT,
  error_message TEXT,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- Tabla de Evidencias
CREATE TABLE IF NOT EXISTS evidences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('screenshot', 'log', 'network', 'performance', 'report')),
  file_path TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_test_suites_project_id ON test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_tests_suite_id ON tests(suite_id);
CREATE INDEX IF NOT EXISTS idx_executions_test_id ON executions(test_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_evidences_execution_id ON evidences(execution_id);

-- Datos iniciales (proyecto por defecto)
INSERT OR IGNORE INTO projects (id, name, description)
VALUES (1, 'Proyecto Principal', 'Proyecto por defecto del sistema');

-- Suites por defecto
INSERT OR IGNORE INTO test_suites (id, project_id, name, description)
VALUES
  (1, 1, 'Regression Tests', 'Tests de regresión completos'),
  (2, 1, 'Smoke Tests', 'Tests básicos de funcionalidad');
