const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Controller para el editor de tests
 */
class EditorController {
  /**
   * GET /api/editor/load - Cargar contenido de un test
   */
  async loadTest(req, res) {
    try {
      const { path: testPath, type } = req.query;

      if (!testPath) {
        return res.status(400).json({
          success: false,
          error: 'Path del test es requerido'
        });
      }

      const absolutePath = path.resolve(testPath);
      const isNaturalTest = type === 'natural' || testPath.includes('tests/natural') || testPath.endsWith('.txt');

      // Verificar que el path sea seguro
      let basePath;
      if (isNaturalTest) {
        basePath = path.resolve('./tests/natural');
      } else {
        basePath = path.resolve('./tests/suites');
      }

      if (!absolutePath.startsWith(basePath)) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: path fuera del directorio de tests'
        });
      }

      // Verificar que el archivo existe
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({
          success: false,
          error: 'Test no encontrado'
        });
      }

      // Leer contenido del archivo
      const content = fs.readFileSync(absolutePath, 'utf8');

      let metadata = {};

      if (isNaturalTest) {
        // Para tests naturales, extraer metadata del contenido
        const lines = content.split('\n');
        let platform = 'web';
        let testName = path.basename(absolutePath, '.txt');

        // Buscar línea de plataforma
        const platformLine = lines.find(line => line.startsWith('Plataforma:'));
        if (platformLine) {
          const plat = platformLine.split(':')[1].trim().toLowerCase();
          if (plat.includes('mobile') || plat.includes('móvil')) platform = 'mobile';
          else if (plat.includes('api')) platform = 'api';
        }

        // Buscar línea de TEST:
        const testLine = lines.find(line => line.startsWith('TEST:'));
        if (testLine) {
          testName = testLine.replace('TEST:', '').trim();
        }

        metadata = {
          suite: testName,
          platform: platform,
          description: 'Test en lenguaje natural'
        };
      } else {
        // Parsear YAML para obtener metadata
        try {
          const parsed = yaml.load(content);
          metadata = {
            suite: parsed.suite || 'Sin nombre',
            platform: parsed.platform || 'web',
            description: parsed.description || ''
          };
        } catch (e) {
          console.warn('Warning: No se pudo parsear YAML para metadata:', e.message);
        }
      }

      res.json({
        success: true,
        content: content,
        name: path.basename(absolutePath),
        platform: metadata.platform,
        suite: metadata.suite
      });

    } catch (error) {
      console.error('Error loading test:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/editor/save - Guardar test editado
   */
  async saveTest(req, res) {
    try {
      const { path: testPath, content } = req.body;

      if (!testPath || content === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Path y content son requeridos'
        });
      }

      const absolutePath = path.resolve(testPath);
      const isNaturalTest = testPath.includes('tests/natural') || testPath.endsWith('.txt');

      // Verificar que el path sea seguro
      let basePath;
      if (isNaturalTest) {
        basePath = path.resolve('./tests/natural');
      } else {
        basePath = path.resolve('./tests/suites');
      }

      if (!absolutePath.startsWith(basePath)) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: path fuera del directorio de tests'
        });
      }

      // Validar contenido según el tipo
      if (!isNaturalTest) {
        // Validar que el contenido sea YAML válido
        try {
          yaml.load(content);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'YAML inválido: ' + error.message
          });
        }
      }

      // Crear backup del archivo original si existe
      if (fs.existsSync(absolutePath)) {
        const backupPath = absolutePath + '.bak';
        fs.copyFileSync(absolutePath, backupPath);
      }

      // Guardar archivo
      fs.writeFileSync(absolutePath, content, 'utf8');

      res.json({
        success: true,
        message: 'Test guardado correctamente',
        path: testPath
      });

    } catch (error) {
      console.error('Error saving test:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/editor/create - Crear nuevo test
   */
  async createTest(req, res) {
    try {
      const { name, platform, content } = req.body;

      if (!name || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Name y platform son requeridos'
        });
      }

      // Sanitizar nombre del archivo
      const sanitizedName = name.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
      const filename = `${sanitizedName}.yml`;

      // Determinar directorio según plataforma
      const platformDir = path.join('./tests/suites', platform);

      // Crear directorio si no existe
      if (!fs.existsSync(platformDir)) {
        fs.mkdirSync(platformDir, { recursive: true });
      }

      const filePath = path.join(platformDir, filename);

      // Verificar que no exista
      if (fs.existsSync(filePath)) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un test con ese nombre'
        });
      }

      // Validar contenido YAML si se proporcionó
      const testContent = content || this.getDefaultTemplate(platform, name);

      try {
        yaml.load(testContent);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'YAML inválido: ' + error.message
        });
      }

      // Guardar archivo
      fs.writeFileSync(filePath, testContent, 'utf8');

      res.json({
        success: true,
        message: 'Test creado correctamente',
        path: filePath,
        name: filename
      });

    } catch (error) {
      console.error('Error creating test:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene plantilla por defecto para un tipo de plataforma
   */
  getDefaultTemplate(platform, name) {
    const templates = {
      web: `suite: "${name}"
description: "Test para plataforma web"
baseUrl: "https://ejemplo.com"
platform: "web"
timeout: 30000

tests:
  - name: "Primer test"
    description: "Navegación básica"
    steps:
      - action: navigate
        url: "/"
        description: "Ir a la página principal"

      - action: verify
        selector: "body"
        description: "Verificar que la página cargó"

expectedResult: "Test debe completarse exitosamente"
`,
      mobile: `suite: "${name}"
description: "Test para plataforma móvil"
platform: "mobile"
packageName: "com.example.app"
timeout: 30000

tests:
  - name: "Primer test"
    description: "Interacción básica"
    steps:
      - action: tap
        text: "Botón Principal"
        description: "Tocar botón"

expectedResult: "Test debe completarse exitosamente"
`,
      api: `suite: "${name}"
description: "Test para API REST"
baseUrl: "https://api.ejemplo.com"
platform: "api"
timeout: 10000

tests:
  - name: "GET - Test básico"
    steps:
      - action: api.get
        url: "/endpoint"
        description: "Request GET"

      - action: api.validateStatus
        expected: 200

expectedResult: "API responde correctamente"
`
    };

    return templates[platform] || templates.web;
  }
}

module.exports = new EditorController();
