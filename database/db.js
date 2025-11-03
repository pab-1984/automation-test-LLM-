/**
 * Servicio de Base de Datos SQLite
 * Gestión de proyectos, test suites, tests, ejecuciones y evidencias
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'testing_automation.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

class DatabaseService {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    try {
      // Crear directorio si no existe
      if (!fs.existsSync(__dirname)) {
        fs.mkdirSync(__dirname, { recursive: true });
      }

      // Abrir/crear base de datos
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      // Ejecutar schema si es necesario
      this.setupSchema();

      console.log('✅ Base de datos inicializada:', DB_PATH);
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
      throw error;
    }
  }

  setupSchema() {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    this.db.exec(schema);
  }

  // ==========================================
  // PROYECTOS
  // ==========================================

  getAllProjects() {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    return stmt.all();
  }

  getProjectById(id) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id);
  }

  createProject(name, description = '') {
    const stmt = this.db.prepare(
      'INSERT INTO projects (name, description) VALUES (?, ?)'
    );
    const result = stmt.run(name, description);
    return this.getProjectById(result.lastInsertRowid);
  }

  updateProject(id, name, description) {
    const stmt = this.db.prepare(
      'UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(name, description, id);
    return this.getProjectById(id);
  }

  deleteProject(id) {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    return stmt.run(id);
  }

  // ==========================================
  // TEST SUITES
  // ==========================================

  getAllSuites() {
    const stmt = this.db.prepare(`
      SELECT ts.*, p.name as project_name
      FROM test_suites ts
      JOIN projects p ON ts.project_id = p.id
      ORDER BY ts.created_at DESC
    `);
    return stmt.all();
  }

  getSuitesByProject(projectId) {
    const stmt = this.db.prepare(`
      SELECT ts.*,
        (SELECT COUNT(*) FROM tests WHERE suite_id = ts.id) as test_count
      FROM test_suites ts
      WHERE ts.project_id = ?
      ORDER BY ts.created_at DESC
    `);
    return stmt.all(projectId);
  }

  getSuiteById(id) {
    const stmt = this.db.prepare(`
      SELECT ts.*, p.name as project_name,
        (SELECT COUNT(*) FROM tests WHERE suite_id = ts.id) as test_count
      FROM test_suites ts
      JOIN projects p ON ts.project_id = p.id
      WHERE ts.id = ?
    `);
    return stmt.get(id);
  }

  createSuite(projectId, name, description = '') {
    const stmt = this.db.prepare(
      'INSERT INTO test_suites (project_id, name, description) VALUES (?, ?, ?)'
    );
    const result = stmt.run(projectId, name, description);
    return this.getSuiteById(result.lastInsertRowid);
  }

  updateSuite(id, name, description) {
    const stmt = this.db.prepare(
      'UPDATE test_suites SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(name, description, id);
    return this.getSuiteById(id);
  }

  deleteSuite(id) {
    const stmt = this.db.prepare('DELETE FROM test_suites WHERE id = ?');
    return stmt.run(id);
  }

  // ==========================================
  // TESTS
  // ==========================================

  getAllTests() {
    const stmt = this.db.prepare(`
      SELECT t.*, ts.name as suite_name, p.name as project_name
      FROM tests t
      JOIN test_suites ts ON t.suite_id = ts.id
      JOIN projects p ON ts.project_id = p.id
      ORDER BY t.created_at DESC
    `);
    return stmt.all();
  }

  getTestsBySuite(suiteId) {
    const stmt = this.db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM executions WHERE test_id = t.id) as execution_count,
        (SELECT COUNT(*) FROM executions WHERE test_id = t.id AND status = 'success') as success_count
      FROM tests t
      WHERE t.suite_id = ?
      ORDER BY t.created_at DESC
    `);
    return stmt.all(suiteId);
  }

  getTestById(id) {
    const stmt = this.db.prepare(`
      SELECT t.*, ts.name as suite_name, ts.project_id,
        (SELECT COUNT(*) FROM executions WHERE test_id = t.id) as execution_count
      FROM tests t
      JOIN test_suites ts ON t.suite_id = ts.id
      WHERE t.id = ?
    `);
    return stmt.get(id);
  }

  createTest(suiteId, name, type, filePath, description = '', url = '') {
    const stmt = this.db.prepare(`
      INSERT INTO tests (suite_id, name, type, file_path, description, url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(suiteId, name, type, filePath, description, url);
    return this.getTestById(result.lastInsertRowid);
  }

  updateTest(id, name, description, url) {
    const stmt = this.db.prepare(`
      UPDATE tests SET name = ?, description = ?, url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, description, url, id);
    return this.getTestById(id);
  }

  deleteTest(id) {
    const stmt = this.db.prepare('DELETE FROM tests WHERE id = ?');
    return stmt.run(id);
  }

  // ==========================================
  // EJECUCIONES
  // ==========================================

  getAllExecutions() {
    const stmt = this.db.prepare(`
      SELECT e.*, t.name as test_name, t.type as test_type
      FROM executions e
      JOIN tests t ON e.test_id = t.id
      ORDER BY e.started_at DESC
      LIMIT 100
    `);
    return stmt.all();
  }

  getExecutionsByTest(testId) {
    const stmt = this.db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM evidences WHERE execution_id = e.id) as evidence_count
      FROM executions e
      WHERE e.test_id = ?
      ORDER BY e.started_at DESC
    `);
    return stmt.all(testId);
  }

  getExecutionById(id) {
    const stmt = this.db.prepare(`
      SELECT e.*, t.name as test_name, t.type as test_type
      FROM executions e
      JOIN tests t ON e.test_id = t.id
      WHERE e.id = ?
    `);
    return stmt.get(id);
  }

  createExecution(testId, mode = 'auto') {
    const stmt = this.db.prepare(`
      INSERT INTO executions (test_id, status, mode)
      VALUES (?, 'running', ?)
    `);
    const result = stmt.run(testId, mode);
    return this.getExecutionById(result.lastInsertRowid);
  }

  updateExecution(id, status, duration = null, logs = null, errorMessage = null) {
    const stmt = this.db.prepare(`
      UPDATE executions
      SET status = ?,
          finished_at = CURRENT_TIMESTAMP,
          duration = ?,
          logs = ?,
          error_message = ?
      WHERE id = ?
    `);
    stmt.run(status, duration, logs, errorMessage, id);
    return this.getExecutionById(id);
  }

  updateExecutionLogs(id, logs) {
    const stmt = this.db.prepare('UPDATE executions SET logs = ? WHERE id = ?');
    stmt.run(logs, id);
  }

  // ==========================================
  // EVIDENCIAS
  // ==========================================

  getEvidencesByExecution(executionId) {
    const stmt = this.db.prepare(`
      SELECT * FROM evidences
      WHERE execution_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(executionId);
  }

  createEvidence(executionId, type, filePath, metadata = null) {
    const stmt = this.db.prepare(`
      INSERT INTO evidences (execution_id, type, file_path, metadata)
      VALUES (?, ?, ?, ?)
    `);
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    const result = stmt.run(executionId, type, filePath, metadataJson);
    return result.lastInsertRowid;
  }

  deleteEvidence(id) {
    const stmt = this.db.prepare('DELETE FROM evidences WHERE id = ?');
    return stmt.run(id);
  }

  getEvidenceById(id) {
    const stmt = this.db.prepare('SELECT * FROM evidences WHERE id = ?');
    return stmt.get(id);
  }

  // Método helper para crear múltiples evidencias en una transacción
  createEvidencesBatch(executionId, evidences) {
    const stmt = this.db.prepare(`
      INSERT INTO evidences (execution_id, type, file_path, metadata)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((items) => {
      const ids = [];
      for (const evidence of items) {
        const metadataJson = evidence.metadata ? JSON.stringify(evidence.metadata) : null;
        const result = stmt.run(executionId, evidence.type, evidence.filePath, metadataJson);
        ids.push(result.lastInsertRowid);
      }
      return ids;
    });

    return transaction(evidences);
  }

  // Método para guardar reporte completo con logs estructurados
  saveExecutionReport(executionId, reportData) {
    const {
      status,
      duration,
      consoleLogs,
      networkRequests,
      performanceData,
      steps,
      errorMessage
    } = reportData;

    // Estructurar logs en formato JSON
    const logsJson = JSON.stringify({
      console: consoleLogs || [],
      network: networkRequests || [],
      performance: performanceData || {},
      steps: steps || []
    });

    return this.updateExecution(executionId, status, duration, logsJson, errorMessage);
  }

  // Obtener reporte completo de una ejecución con evidencias
  getExecutionReport(executionId) {
    const execution = this.getExecutionById(executionId);
    if (!execution) return null;

    const evidences = this.getEvidencesByExecution(executionId);

    // Parsear logs JSON
    let logs = { console: [], network: [], performance: {}, steps: [] };
    if (execution.logs) {
      try {
        logs = JSON.parse(execution.logs);
      } catch (e) {
        console.warn('No se pudo parsear logs de ejecución:', e.message);
      }
    }

    return {
      ...execution,
      logs,
      evidences
    };
  }

  // Obtener últimas N ejecuciones con evidencias
  getRecentExecutions(limit = 20) {
    const stmt = this.db.prepare(`
      SELECT e.*, t.name as test_name, t.type as test_type,
        (SELECT COUNT(*) FROM evidences WHERE execution_id = e.id) as evidence_count
      FROM executions e
      JOIN tests t ON e.test_id = t.id
      ORDER BY e.started_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // Limpiar ejecuciones antiguas (más de X días)
  cleanupOldExecutions(daysToKeep = 30) {
    const stmt = this.db.prepare(`
      DELETE FROM executions
      WHERE started_at < datetime('now', '-' || ? || ' days')
    `);
    const result = stmt.run(daysToKeep);
    return result.changes;
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  getStatistics() {
    const totalTests = this.db.prepare('SELECT COUNT(*) as count FROM tests').get().count;
    const totalExecutions = this.db.prepare('SELECT COUNT(*) as count FROM executions').get().count;
    const successExecutions = this.db.prepare(
      "SELECT COUNT(*) as count FROM executions WHERE status = 'success'"
    ).get().count;
    const failedExecutions = this.db.prepare(
      "SELECT COUNT(*) as count FROM executions WHERE status = 'failed'"
    ).get().count;
    const runningExecutions = this.db.prepare(
      "SELECT COUNT(*) as count FROM executions WHERE status = 'running'"
    ).get().count;

    return {
      totalTests,
      totalExecutions,
      successExecutions,
      failedExecutions,
      runningExecutions,
      successRate: totalExecutions > 0
        ? Math.round((successExecutions / totalExecutions) * 100)
        : 0
    };
  }

  getProjectStatistics(projectId) {
    const suites = this.getSuitesByProject(projectId);
    const suiteIds = suites.map(s => s.id);

    if (suiteIds.length === 0) {
      return {
        totalTests: 0,
        totalExecutions: 0,
        successExecutions: 0,
        failedExecutions: 0,
        successRate: 0
      };
    }

    const placeholders = suiteIds.map(() => '?').join(',');

    const totalTests = this.db.prepare(
      `SELECT COUNT(*) as count FROM tests WHERE suite_id IN (${placeholders})`
    ).get(...suiteIds).count;

    const execData = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN e.status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM executions e
      JOIN tests t ON e.test_id = t.id
      WHERE t.suite_id IN (${placeholders})
    `).get(...suiteIds);

    return {
      totalTests,
      totalExecutions: execData.total || 0,
      successExecutions: execData.success || 0,
      failedExecutions: execData.failed || 0,
      successRate: execData.total > 0
        ? Math.round((execData.success / execData.total) * 100)
        : 0
    };
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton
let instance = null;

function getDatabase() {
  if (!instance) {
    instance = new DatabaseService();
  }
  return instance;
}

module.exports = { getDatabase, DatabaseService };
