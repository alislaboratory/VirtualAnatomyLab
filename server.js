import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure models directory exists
const modelsDir = join(__dirname, 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, modelsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'model/gltf-binary' || file.originalname.endsWith('.glb')) {
            cb(null, true);
        } else {
            cb(new Error('Only GLB files are allowed'));
        }
    }
});

// Simple file-based JSON database (no WebAssembly, no memory issues)
const dbPath = 'anatomy_lab.json';

// Load database from file or create new one
function loadDatabase() {
    if (fs.existsSync(dbPath)) {
        try {
            const data = fs.readFileSync(dbPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.warn('Error loading database, creating new one:', e.message);
            return { models: [], labels: [], questions: [] };
        }
    }
    return { models: [], labels: [], questions: [] };
}

// Save database to file
function saveDatabase(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

// Initialize database
let dbData = loadDatabase();

// Ensure question_type column exists (migration)
dbData.questions.forEach(q => {
    if (!q.question_type) {
        q.question_type = 'mcq';
    }
});
saveDatabase(dbData);

// Helper class to mimic better-sqlite3 API
class PreparedStatement {
    constructor(sql, dbDataRef) {
        this.sql = sql;
        this.dbDataRef = dbDataRef;
        this.parseSQL();
    }

    parseSQL() {
        // Simple SQL parser for our use case
        const sql = this.sql.trim();
        
        if (sql.startsWith('SELECT')) {
            this.type = 'SELECT';
            if (sql.includes('COUNT(*)')) {
                this.isCount = true;
            }
            if (sql.includes('WHERE id = ?')) {
                this.whereId = true;
            } else if (sql.includes('WHERE model_id = ?')) {
                this.whereModelId = true;
            } else if (sql.includes('ORDER BY created_at DESC')) {
                this.orderByDesc = true;
            } else if (sql.includes('ORDER BY created_at ASC')) {
                this.orderByAsc = true;
            }
        } else if (sql.startsWith('INSERT')) {
            this.type = 'INSERT';
            if (sql.includes('models')) this.table = 'models';
            else if (sql.includes('labels')) this.table = 'labels';
            else if (sql.includes('questions')) this.table = 'questions';
        } else if (sql.startsWith('UPDATE')) {
            this.type = 'UPDATE';
            if (sql.includes('models')) this.table = 'models';
            else if (sql.includes('labels')) this.table = 'labels';
            else if (sql.includes('questions')) this.table = 'questions';
        } else if (sql.startsWith('DELETE')) {
            this.type = 'DELETE';
            if (sql.includes('models')) this.table = 'models';
            else if (sql.includes('labels')) this.table = 'labels';
            else if (sql.includes('questions')) this.table = 'questions';
        } else if (sql.startsWith('ALTER')) {
            this.type = 'ALTER';
            // Ignore ALTER TABLE for question_type (already handled)
        }
    }

    run(...params) {
        const data = loadDatabase();
        
        if (this.type === 'INSERT') {
            if (this.table === 'models') {
                const now = new Date().toISOString();
                data.models.push({
                    id: params[0],
                    name: params[1],
                    description: params[2] || '',
                    file_path: params[3],
                    created_at: now,
                    updated_at: now
                });
            } else if (this.table === 'labels') {
                const now = new Date().toISOString();
                data.labels.push({
                    id: params[0],
                    model_id: params[1],
                    text: params[2],
                    color: params[3],
                    position_x: params[4],
                    position_y: params[5],
                    position_z: params[6],
                    created_at: now
                });
            } else if (this.table === 'questions') {
                const now = new Date().toISOString();
                data.questions.push({
                    id: params[0],
                    model_id: params[1],
                    text: params[2],
                    question_type: params[3] || 'mcq',
                    options: params[4],
                    correct_answer: params[5],
                    position_x: params[6],
                    position_y: params[7],
                    position_z: params[8],
                    camera_position_x: params[9],
                    camera_position_y: params[10],
                    camera_position_z: params[11],
                    camera_target_x: params[12],
                    camera_target_y: params[13],
                    camera_target_z: params[14],
                    created_at: now
                });
            }
        } else if (this.type === 'UPDATE') {
            if (this.table === 'models') {
                const index = data.models.findIndex(m => m.id === params[2]);
                if (index !== -1) {
                    data.models[index].name = params[0];
                    data.models[index].description = params[1];
                    data.models[index].updated_at = new Date().toISOString();
                }
            } else if (this.table === 'questions') {
                const index = data.questions.findIndex(q => q.id === params[14]);
                if (index !== -1) {
                    data.questions[index] = {
                        ...data.questions[index],
                        text: params[0],
                        question_type: params[1] || 'mcq',
                        options: params[2],
                        correct_answer: params[3],
                        position_x: params[4],
                        position_y: params[5],
                        position_z: params[6],
                        camera_position_x: params[7],
                        camera_position_y: params[8],
                        camera_position_z: params[9],
                        camera_target_x: params[10],
                        camera_target_y: params[11],
                        camera_target_z: params[12]
                    };
                }
            }
        } else if (this.type === 'DELETE') {
            if (this.table === 'models') {
                const id = params[0];
                data.models = data.models.filter(m => m.id !== id);
                // Cascade delete labels and questions
                data.labels = data.labels.filter(l => l.model_id !== id);
                data.questions = data.questions.filter(q => q.model_id !== id);
            } else if (this.table === 'labels') {
                data.labels = data.labels.filter(l => l.id !== params[0]);
            } else if (this.table === 'questions') {
                data.questions = data.questions.filter(q => q.id !== params[0]);
            }
        }
        
        saveDatabase(data);
        this.dbDataRef = data;
        return { changes: 1 };
    }

    get(...params) {
        const data = loadDatabase();
        
        if (this.type === 'SELECT') {
            if (this.whereId) {
                if (this.sql.includes('models')) {
                    return data.models.find(m => m.id === params[0]);
                } else if (this.sql.includes('labels')) {
                    return data.labels.find(l => l.id === params[0]);
                } else if (this.sql.includes('questions')) {
                    return data.questions.find(q => q.id === params[0]);
                }
            } else if (this.isCount && this.whereModelId) {
                const count = data.questions.filter(q => q.model_id === params[0]).length;
                return { count };
            }
        }
        
        return undefined;
    }

    all(...params) {
        const data = loadDatabase();
        
        if (this.type === 'SELECT') {
            if (this.sql.includes('SELECT * FROM models')) {
                let results = [...data.models];
                if (this.orderByDesc) {
                    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                }
                return results;
            } else if (this.sql.includes('SELECT * FROM labels') && this.whereModelId) {
                return data.labels
                    .filter(l => l.model_id === params[0])
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            } else if (this.sql.includes('SELECT * FROM questions') && this.whereModelId) {
                return data.questions
                    .filter(q => q.model_id === params[0])
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }
        }
        
        return [];
    }
}

// Wrapper to mimic better-sqlite3 Database API
const db = {
    prepare: (sql) => new PreparedStatement(sql, dbData),
    exec: (sql) => {
        // Handle CREATE TABLE and CREATE INDEX - just ensure structure exists
        // The JSON structure is already set up, so we can ignore these
        if (sql.includes('CREATE TABLE') || sql.includes('CREATE INDEX')) {
            // Tables/indexes are handled by the JSON structure
            return;
        }
    }
};

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        text TEXT NOT NULL,
        color TEXT NOT NULL,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        position_z REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        text TEXT NOT NULL,
        question_type TEXT NOT NULL DEFAULT 'mcq',
        options TEXT NOT NULL,
        correct_answer TEXT,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        position_z REAL NOT NULL,
        camera_position_x REAL,
        camera_position_y REAL,
        camera_position_z REAL,
        camera_target_x REAL,
        camera_target_y REAL,
        camera_target_z REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_labels_model_id ON labels(model_id);
    CREATE INDEX IF NOT EXISTS idx_questions_model_id ON questions(model_id);
`);

// API Routes

// Models
app.get('/api/models', (req, res) => {
    try {
        const models = db.prepare('SELECT * FROM models ORDER BY created_at DESC').all();
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/models/:id', (req, res) => {
    try {
        const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json(model);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/models', upload.single('model'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const modelId = uuidv4();
        const filePath = `/models/${req.file.filename}`;

        db.prepare(`
            INSERT INTO models (id, name, description, file_path)
            VALUES (?, ?, ?, ?)
        `).run(
            modelId,
            req.body.name || req.file.originalname,
            req.body.description || '',
            filePath
        );

        const model = db.prepare('SELECT * FROM models WHERE id = ?').get(modelId);
        res.status(201).json(model);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/models/:id', (req, res) => {
    try {
        const { name, description } = req.body;
        db.prepare(`
            UPDATE models 
            SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name, description, req.params.id);

        const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json(model);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/models/:id', (req, res) => {
    try {
        const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }

        // Delete file
        const filePath = join(__dirname, model.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database (cascade will delete labels and questions)
        db.prepare('DELETE FROM models WHERE id = ?').run(req.params.id);
        res.json({ message: 'Model deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Labels
app.get('/api/models/:modelId/labels', (req, res) => {
    try {
        const labels = db.prepare(`
            SELECT * FROM labels 
            WHERE model_id = ? 
            ORDER BY created_at ASC
        `).all(req.params.modelId);
        res.json(labels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/models/:modelId/labels', (req, res) => {
    try {
        const { text, color, position_x, position_y, position_z } = req.body;
        const labelId = uuidv4();

        db.prepare(`
            INSERT INTO labels (id, model_id, text, color, position_x, position_y, position_z)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(labelId, req.params.modelId, text, color, position_x, position_y, position_z);

        const label = db.prepare('SELECT * FROM labels WHERE id = ?').get(labelId);
        res.status(201).json(label);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/labels/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM labels WHERE id = ?').run(req.params.id);
        res.json({ message: 'Label deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Questions
app.get('/api/models/:modelId/questions', (req, res) => {
    try {
        const questions = db.prepare(`
            SELECT * FROM questions 
            WHERE model_id = ? 
            ORDER BY created_at ASC
        `).all(req.params.modelId);
        
        // Parse options JSON and ensure question_type exists
        const parsedQuestions = questions.map(q => ({
            ...q,
            options: JSON.parse(q.options),
            question_type: q.question_type || 'mcq'
        }));
        
        res.json(parsedQuestions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/models/:modelId/questions', (req, res) => {
    try {
        const { 
            text, 
            question_type = 'mcq',
            options, 
            correct_answer, 
            position_x, 
            position_y, 
            position_z,
            camera_position_x,
            camera_position_y,
            camera_position_z,
            camera_target_x,
            camera_target_y,
            camera_target_z
        } = req.body;
        
        const questionId = uuidv4();
        
        // Ensure question_type column exists (migration)
        try {
            db.prepare('ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT \'mcq\'').run();
        } catch (e) {
            // Column already exists, ignore
        }

        db.prepare(`
            INSERT INTO questions (
                id, model_id, text, question_type, options, correct_answer,
                position_x, position_y, position_z,
                camera_position_x, camera_position_y, camera_position_z,
                camera_target_x, camera_target_y, camera_target_z
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            questionId,
            req.params.modelId,
            text,
            question_type,
            JSON.stringify(options),
            typeof correct_answer === 'number' ? correct_answer.toString() : correct_answer,
            position_x,
            position_y,
            position_z,
            camera_position_x,
            camera_position_y,
            camera_position_z,
            camera_target_x,
            camera_target_y,
            camera_target_z
        );

        const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
        const parsedQuestion = {
            ...question,
            options: JSON.parse(question.options),
            question_type: question.question_type || 'mcq'
        };
        res.status(201).json(parsedQuestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questions/:id', (req, res) => {
    try {
        const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        const parsedQuestion = {
            ...question,
            options: JSON.parse(question.options),
            question_type: question.question_type || 'mcq'
        };
        res.json(parsedQuestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/questions/:id', (req, res) => {
    try {
        const { 
            text, 
            question_type,
            options, 
            correct_answer, 
            position_x, 
            position_y, 
            position_z,
            camera_position_x,
            camera_position_y,
            camera_position_z,
            camera_target_x,
            camera_target_y,
            camera_target_z
        } = req.body;
        
        // Ensure question_type column exists (migration)
        try {
            db.prepare('ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT \'mcq\'').run();
        } catch (e) {
            // Column already exists, ignore
        }

        db.prepare(`
            UPDATE questions 
            SET text = ?, question_type = ?, options = ?, correct_answer = ?,
                position_x = ?, position_y = ?, position_z = ?,
                camera_position_x = ?, camera_position_y = ?, camera_position_z = ?,
                camera_target_x = ?, camera_target_y = ?, camera_target_z = ?
            WHERE id = ?
        `).run(
            text,
            question_type || 'mcq',
            JSON.stringify(options),
            typeof correct_answer === 'number' ? correct_answer.toString() : correct_answer,
            position_x,
            position_y,
            position_z,
            camera_position_x,
            camera_position_y,
            camera_position_z,
            camera_target_x,
            camera_target_y,
            camera_target_z,
            req.params.id
        );

        const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        const parsedQuestion = {
            ...question,
            options: JSON.parse(question.options),
            question_type: question.question_type || 'mcq'
        };
        res.json(parsedQuestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/questions/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Embed route - serves a simplified version for embedding (must be before static middleware)
app.get('/embed/:modelId', (req, res) => {
    const modelId = req.params.modelId;
    
    // Check if questions exist for this model
    const questions = db.prepare('SELECT COUNT(*) as count FROM questions WHERE model_id = ?').get(modelId);
    const hasQuestions = questions && questions.count > 0;
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UNSW Virtual Anatomy Lab - Model Viewer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #ffffff;
            overflow: hidden;
        }
        #viewer-container {
            width: 100vw;
            height: 100vh;
            position: relative;
            background: #ffffff;
        }
        #viewer-canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
        #label-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #333;
            z-index: 100;
        }
        .loading.hidden {
            display: none;
        }
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.3);
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .embed-controls {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 100;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .btn-quiz {
            padding: 12px 24px;
            background: #ffc107;
            color: #333;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .btn-quiz:hover {
            background: #e0a800;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(255, 193, 7, 0.4);
        }
        .labels-panel {
            position: absolute;
            top: 0;
            right: 0;
            width: 350px;
            height: 100%;
            background: rgba(255, 255, 255, 0.98);
            z-index: 200;
            display: flex;
            flex-direction: column;
            box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
        }
        .labels-panel.hidden {
            display: none;
        }
        .labels-panel-header {
            padding: 16px 20px;
            border-bottom: 2px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .labels-panel-header h3 {
            margin: 0;
            font-size: 1.2rem;
        }
        .btn-close {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .btn-close:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .labels-list {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        .label-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-left: 4px solid #667eea;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .label-item-content {
            flex: 1;
        }
        .label-item-text {
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
        }
        .label-item-position {
            font-size: 12px;
            color: #666;
        }
        .label-item-actions {
            display: flex;
            gap: 8px;
        }
        .label-hover-popup {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
            display: none;
            flex-direction: row;
            gap: 4px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            pointer-events: auto;
        }
        .label-hover-popup::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid white;
            margin-top: -1px;
        }
        .label-hover-btn {
            padding: 6px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .label-hover-btn-toggle {
            background: #6b7280;
            color: white;
        }
        .label-hover-btn-toggle:hover {
            background: #4b5563;
        }
        .question-hover-popup {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
            display: none;
            flex-direction: column;
            gap: 8px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            pointer-events: auto;
            min-width: 200px;
            max-width: 300px;
        }
        .question-hover-popup::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid white;
            margin-top: -1px;
        }
        .question-hover-text {
            font-size: 14px;
            color: #333;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .question-hover-buttons {
            display: flex;
            gap: 6px;
        }
        .question-hover-btn {
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .question-hover-btn-preview {
            background: #667eea;
            color: white;
        }
        .question-hover-btn-preview:hover {
            background: #5568d3;
        }
        ${hasQuestions ? `
        .quiz-overlay {
            position: absolute;
            top: 0;
            right: 0;
            width: 400px;
            height: 100%;
            background: rgba(255, 255, 255, 0.98);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
        }
        .quiz-overlay.hidden {
            display: none;
        }
        .quiz-container {
            background: white;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .quiz-header {
            padding: 16px 20px;
            border-bottom: 2px solid #ffc107;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
            color: white;
            flex-shrink: 0;
        }
        .quiz-progress {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.1rem;
            font-weight: 600;
        }
        .quiz-content {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }
        .quiz-content h2 {
            color: #333;
            margin-bottom: 24px;
            font-size: 1.5rem;
            line-height: 1.4;
        }
        .quiz-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }
        .quiz-option {
            padding: 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f8f9fa;
            font-size: 1rem;
        }
        .quiz-option:hover {
            border-color: #667eea;
            background: #f0f4ff;
            transform: translateX(4px);
        }
        .quiz-option.selected {
            border-color: #667eea;
            background: #e7edff;
            font-weight: 600;
        }
        .quiz-option.correct {
            border-color: #28a745;
            background: #d4edda;
        }
        .quiz-option.incorrect {
            border-color: #dc3545;
            background: #f8d7da;
        }
        .quiz-feedback {
            padding: 16px;
            border-radius: 8px;
            margin-top: 16px;
            font-weight: 500;
        }
        .quiz-feedback.correct {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .quiz-feedback.incorrect {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .quiz-feedback.hidden {
            display: none;
        }
        .quiz-footer {
            padding: 16px 20px;
            border-top: 2px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            background: #f8f9fa;
            flex-shrink: 0;
        }
        .quiz-footer .btn {
            flex: 1;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5568d3;
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background: #5a6268;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
        }
        .btn-small {
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        .btn-small:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .btn.hidden {
            display: none;
        }
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            backdrop-filter: blur(4px);
        }
        .modal.hidden {
            display: none;
        }
        .modal-content {
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 500px;
            overflow: hidden;
        }
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .modal-header h3 {
            margin: 0;
            font-size: 1.2rem;
        }
        .btn-close {
            background: none;
            border: none;
            font-size: 24px;
            color: white;
            cursor: pointer;
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        .btn-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        .modal-body {
            padding: 20px;
        }
        .results-content {
            text-align: center;
        }
        .score-display {
            margin-bottom: 24px;
        }
        .score-display h2 {
            font-size: 3rem;
            color: #667eea;
            margin-bottom: 8px;
        }
        .score-display p {
            font-size: 1.5rem;
            color: #666;
        }
        .results-summary {
            text-align: left;
            margin-top: 20px;
        }
        .result-item {
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
        }
        .result-item.correct {
            background: #d4edda;
            border-left-color: #28a745;
        }
        .result-item.incorrect {
            background: #f8d7da;
            border-left-color: #dc3545;
        }
        .result-item-number {
            font-weight: 600;
            margin-bottom: 4px;
        }
        .result-item-answer {
            font-size: 0.9rem;
            color: #666;
        }
        .form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 20px;
        }
        @media (max-width: 768px) {
            .quiz-overlay {
                width: 100%;
                height: 50%;
                bottom: 0;
                top: auto;
            }
        }
        ` : ''}
    </style>
</head>
<body>
    <div id="viewer-container">
        <canvas id="viewer-canvas"></canvas>
        <div id="label-container"></div>
        <div class="embed-controls">
            <button id="reset-camera-btn" class="btn-quiz">Reset Camera</button>
            <button id="show-labels-btn" class="btn-quiz">Show Labels</button>
            <button id="view-labels-list-btn" class="btn-quiz">View Labels List</button>
            ${hasQuestions ? '<button id="start-quiz-btn" class="btn-quiz">Start Quiz</button>' : ''}
        </div>
        <!-- Label Management Panel -->
        <div id="labels-panel" class="labels-panel hidden">
            <div class="labels-panel-header">
                <h3>Labels</h3>
                <button id="close-labels-panel" class="btn-close">×</button>
            </div>
            <div id="labels-list" class="labels-list"></div>
        </div>
        ${hasQuestions ? `
        <div id="quiz-overlay" class="quiz-overlay hidden">
            <div class="quiz-container">
                <div class="quiz-header">
                    <div class="quiz-progress">
                        <span id="quiz-question-number">Question 1</span>
                        <span id="quiz-progress-text">of 0</span>
                    </div>
                    <button id="exit-quiz-btn" class="btn-small">Exit Quiz</button>
                </div>
                <div class="quiz-content">
                    <h2 id="quiz-question-text">Question text will appear here</h2>
                    <div id="quiz-options" class="quiz-options"></div>
                    <div id="quiz-feedback" class="quiz-feedback hidden"></div>
                </div>
                <div class="quiz-footer">
                    <button id="quiz-prev-btn" class="btn btn-secondary">Previous</button>
                    <button id="quiz-next-btn" class="btn btn-primary">Next</button>
                    <button id="quiz-submit-btn" class="btn btn-success hidden">Submit Quiz</button>
                </div>
            </div>
        </div>
        <div id="quiz-results-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Quiz Results</h3>
                    <button id="close-results-modal" class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="results-content">
                        <div class="score-display">
                            <h2 id="quiz-score">0/0</h2>
                            <p id="quiz-percentage">0%</p>
                        </div>
                        <div id="results-summary" class="results-summary"></div>
                    </div>
                    <div class="form-actions">
                        <button id="close-results" class="btn btn-primary">Close</button>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Loading model...</p>
        </div>
    </div>
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
        }
    }
    </script>
    <script type="module">
        import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

        const API_BASE = window.location.origin;
        const MODEL_ID = '${modelId}';
        const canvas = document.getElementById('viewer-canvas');
        const loadingEl = document.getElementById('loading');
        const labelContainer = document.getElementById('label-container');

        let scene, camera, renderer, controls, labelRenderer;
        let currentModel = null;
        let animationMixer = null;
        let clock = new THREE.Clock();
        let labels = []; // Array of {id, text, color, position, object}
        let labelsVisible = false;
        const labelToggleButtons = new Map(); // labelId -> [button1, button2, ...]
        let isAnimating = false;
        ${hasQuestions ? `
        let questions = [];
        let quizMode = false;
        let currentQuizQuestion = 0;
        let quizAnswers = [];
        ` : ''}

        // Initialize scene
        function initScene() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xffffff);

            const aspect = canvas.clientWidth / canvas.clientHeight;
            camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
            camera.position.set(5, 5, 5);

            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            labelRenderer = new CSS2DRenderer();
            labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
            labelRenderer.domElement.style.position = 'absolute';
            labelRenderer.domElement.style.top = '0';
            labelRenderer.domElement.style.left = '0';
            labelRenderer.domElement.style.pointerEvents = 'none';
            labelContainer.appendChild(labelRenderer.domElement);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight1.position.set(5, 10, 5);
            scene.add(directionalLight1);

            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
            directionalLight2.position.set(-5, 5, -5);
            scene.add(directionalLight2);

            window.addEventListener('resize', onWindowResize);
            loadModel();
        }

        async function loadModel() {
            try {
                const modelResponse = await fetch(\`\${API_BASE}/api/models/\${MODEL_ID}\`);
                if (!modelResponse.ok) {
                    throw new Error('Model not found');
                }
                
                const model = await modelResponse.json();
                const fileResponse = await fetch(model.file_path);
                const arrayBuffer = await fileResponse.arrayBuffer();
                
                const loader = new GLTFLoader();
                loader.parse(arrayBuffer, '', function(gltf) {
                    currentModel = gltf.scene;
                    scene.add(currentModel);

                    if (gltf.animations && gltf.animations.length > 0) {
                        animationMixer = new THREE.AnimationMixer(currentModel);
                        gltf.animations.forEach((clip) => {
                            animationMixer.clipAction(clip).play();
                        });
                    }

                    centerAndScaleModel(currentModel);
                    resetCamera();
                    loadingEl.classList.add('hidden');
                    loadLabels();
                    ${hasQuestions ? 'loadQuestions();' : ''}
                }, function(error) {
                    console.error('Error loading GLB:', error);
                    loadingEl.textContent = 'Failed to load model';
                });
            } catch (error) {
                console.error('Error loading model:', error);
                loadingEl.textContent = 'Failed to load model';
            }
        }

        function centerAndScaleModel(model) {
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Center the model (matching main viewer)
            model.position.x += (model.position.x - center.x);
            model.position.y += (model.position.y - center.y);
            model.position.z += (model.position.z - center.z);

            // Calculate scale to fit model in view
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim;
            model.scale.multiplyScalar(scale);

            // Update bounding box after scaling
            box.setFromObject(model);
            const newCenter = box.getCenter(new THREE.Vector3());
            
            // Adjust model position to center it
            model.position.x = -newCenter.x;
            model.position.y = -newCenter.y;
            model.position.z = -newCenter.z;
        }

        function resetCamera() {
            if (!currentModel) return;
            if (isAnimating) return; // Don't interrupt ongoing animation
            
            const box = new THREE.Box3().setFromObject(currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const distance = maxDim * 2;
            
            const targetPosition = new THREE.Vector3(distance, distance * 0.6, distance);
            const targetTarget = center.clone();
            
            // Animate to the reset position
            animateCameraToResetPosition(targetPosition, targetTarget);
        }
        
        // Animate camera to reset position
        function animateCameraToResetPosition(targetPosition, targetTarget) {
            if (isAnimating) return;
            
            isAnimating = true;
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            
            const duration = 1000; // 1 second
            const startTime = Date.now();
            
            function animate() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function (ease-in-out)
                const eased = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                camera.position.lerpVectors(startPosition, targetPosition, eased);
                controls.target.lerpVectors(startTarget, targetTarget, eased);
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    isAnimating = false;
                }
            }
            
            animate();
        }

        async function loadLabels() {
            try {
                const response = await fetch(\`\${API_BASE}/api/models/\${MODEL_ID}/labels\`);
                if (!response.ok) return;
                
                const savedLabels = await response.json();
                savedLabels.forEach(savedLabel => {
                    const position = new THREE.Vector3(
                        savedLabel.position_x,
                        savedLabel.position_y,
                        savedLabel.position_z
                    );
                    
                    const labelDiv = document.createElement('div');
                    labelDiv.className = 'label-3d';
                    labelDiv.textContent = savedLabel.text;
                    labelDiv.style.backgroundColor = savedLabel.color;
                    labelDiv.style.borderColor = savedLabel.color;
                    labelDiv.style.padding = '8px 12px';
                    labelDiv.style.borderRadius = '6px';
                    labelDiv.style.fontSize = '14px';
                    labelDiv.style.fontWeight = '500';
                    labelDiv.style.color = 'white';
                    labelDiv.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    labelDiv.style.border = '2px solid white';
                    labelDiv.style.position = 'relative';

                    const label = new CSS2DObject(labelDiv);
                    label.position.copy(position);
                    // Hide labels by default in embedded view
                    label.visible = false;
                    if (label.element) {
                        label.element.style.display = 'none';
                    }
                    scene.add(label);
                    
                    // Store label data with ID for hover popups and list
                    labels.push({
                        id: savedLabel.id,
                        text: savedLabel.text,
                        color: savedLabel.color,
                        position: position,
                        object: label
                    });
                    
                    // Add hover popup (without edit/delete buttons)
                    addLabelHoverPopup(labelDiv, savedLabel.id);
                });
                updateLabelsList();
            } catch (error) {
                console.error('Error loading labels:', error);
            }
        }
        
        function getOpenEyeIcon() {
            return \`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>\`;
        }
        
        function getClosedEyeIcon() {
            return \`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>\`;
        }
        
        function addLabelHoverPopup(labelDiv, labelId) {
            const popup = document.createElement('div');
            popup.className = 'label-hover-popup';
            
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'label-hover-btn label-hover-btn-toggle';
            const labelData = labels.find(l => l.id === labelId);
            const isCurrentlyVisible = labelData && labelData.object ? labelData.object.visible : false;
            toggleBtn.innerHTML = isCurrentlyVisible ? getOpenEyeIcon() : getClosedEyeIcon();
            toggleBtn.title = isCurrentlyVisible ? 'Hide label' : 'Show label';
            
            if (!labelToggleButtons.has(labelId)) {
                labelToggleButtons.set(labelId, []);
            }
            labelToggleButtons.get(labelId).push(toggleBtn);
            
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                toggleLabelVisibility(labelId);
            };
            
            popup.appendChild(toggleBtn);
            labelDiv.appendChild(popup);
            
            // Use JavaScript hover events
            let hoverTimeout = null;
            let isHovering = false;
            
            const showPopup = () => {
                if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    hoverTimeout = null;
                }
                isHovering = true;
                popup.style.display = 'flex';
            };
            
            const hidePopup = () => {
                isHovering = false;
                hoverTimeout = setTimeout(() => {
                    if (!isHovering) {
                        popup.style.display = 'none';
                    }
                    hoverTimeout = null;
                }, 200);
            };
            
            labelDiv.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                showPopup();
            });
            labelDiv.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                hidePopup();
            });
            popup.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                showPopup();
            });
            popup.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                hidePopup();
            });
        }
        
        function toggleLabelVisibility(labelId) {
            const labelData = labels.find(l => l.id === labelId);
            if (!labelData || !labelData.object) return;
            
            const newVisibility = !labelData.object.visible;
            labelData.object.visible = newVisibility;
            if (labelData.object.element) {
                labelData.object.element.style.display = newVisibility ? 'block' : 'none';
            }
            
            // Update all toggle buttons for this label
            updateLabelToggleButtons(labelId, newVisibility);
        }
        
        function updateLabelToggleButtons(labelId, isVisible) {
            const buttons = labelToggleButtons.get(labelId) || [];
            const validButtons = buttons.filter(btn => btn && btn.parentElement);
            validButtons.forEach(btn => {
                btn.innerHTML = isVisible ? getOpenEyeIcon() : getClosedEyeIcon();
                btn.title = isVisible ? 'Hide label' : 'Show label';
            });
            if (validButtons.length !== buttons.length) {
                labelToggleButtons.set(labelId, validButtons);
            }
        }
        
        function updateLabelsList() {
            const labelsList = document.getElementById('labels-list');
            if (!labelsList) return;
            
            labelsList.innerHTML = '';
            
            if (labels.length === 0) {
                labelsList.innerHTML = '<p style="padding: 16px; color: #666; text-align: center;">No labels available.</p>';
                return;
            }
            
            labels.forEach(labelData => {
                const item = document.createElement('div');
                item.className = 'label-item';
                item.style.borderLeftColor = labelData.color;
                
                const content = document.createElement('div');
                content.className = 'label-item-content';
                
                const text = document.createElement('div');
                text.className = 'label-item-text';
                text.textContent = labelData.text;
                content.appendChild(text);
                
                const position = document.createElement('div');
                position.className = 'label-item-position';
                position.textContent = \`Position: (\${labelData.position.x.toFixed(2)}, \${labelData.position.y.toFixed(2)}, \${labelData.position.z.toFixed(2)})\`;
                content.appendChild(position);
                
                const actions = document.createElement('div');
                actions.className = 'label-item-actions';
                
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'btn-small';
                toggleBtn.style.background = '#6b7280';
                toggleBtn.style.color = 'white';
                toggleBtn.style.fontSize = '14px';
                toggleBtn.style.padding = '6px 10px';
                toggleBtn.style.display = 'flex';
                toggleBtn.style.alignItems = 'center';
                toggleBtn.style.justifyContent = 'center';
                const isCurrentlyVisible = labelData.object ? labelData.object.visible : false;
                toggleBtn.innerHTML = isCurrentlyVisible ? getOpenEyeIcon() : getClosedEyeIcon();
                toggleBtn.title = isCurrentlyVisible ? 'Hide label' : 'Show label';
                
                if (!labelToggleButtons.has(labelData.id)) {
                    labelToggleButtons.set(labelData.id, []);
                }
                labelToggleButtons.get(labelData.id).push(toggleBtn);
                
                toggleBtn.onclick = () => {
                    toggleLabelVisibility(labelData.id);
                };
                actions.appendChild(toggleBtn);
                
                item.appendChild(content);
                item.appendChild(actions);
                labelsList.appendChild(item);
            });
        }
        
        function toggleLabelsPanel() {
            const panel = document.getElementById('labels-panel');
            if (!panel) return;
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                updateLabelsList();
            }
        }
        
        function toggleLabels() {
            labelsVisible = !labelsVisible;
            labels.forEach(labelData => {
                if (labelData && labelData.object) {
                    labelData.object.visible = labelsVisible;
                    if (labelData.object.element) {
                        labelData.object.element.style.display = labelsVisible ? 'block' : 'none';
                    }
                    // Update toggle buttons
                    updateLabelToggleButtons(labelData.id, labelsVisible);
                }
            });
            const btn = document.getElementById('show-labels-btn');
            if (btn) {
                btn.textContent = labelsVisible ? 'Hide Labels' : 'Show Labels';
            }
        }

        function onWindowResize() {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            labelRenderer.setSize(width, height);
        }

        ${hasQuestions ? `
        async function loadQuestions() {
            try {
                const response = await fetch(\`\${API_BASE}/api/models/\${MODEL_ID}/questions\`);
                if (!response.ok) return;
                
                const savedQuestions = await response.json();
                questions = savedQuestions.map(savedQuestion => {
                    const position = new THREE.Vector3(
                        savedQuestion.position_x,
                        savedQuestion.position_y,
                        savedQuestion.position_z
                    );
                    
                    const questionDiv = document.createElement('div');
                    questionDiv.className = 'label-3d';
                    questionDiv.textContent = '?';
                    questionDiv.style.backgroundColor = '#ffc107';
                    questionDiv.style.borderColor = '#ff9800';
                    questionDiv.style.fontSize = '20px';
                    questionDiv.style.fontWeight = 'bold';
                    questionDiv.style.width = '32px';
                    questionDiv.style.height = '32px';
                    questionDiv.style.display = 'flex';
                    questionDiv.style.alignItems = 'center';
                    questionDiv.style.justifyContent = 'center';
                    questionDiv.style.borderRadius = '50%';
                    questionDiv.style.padding = '0';
                    questionDiv.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    questionDiv.style.border = '2px solid white';
                    questionDiv.style.position = 'relative';

                    const questionMarker = new CSS2DObject(questionDiv);
                    questionMarker.position.copy(position);
                    // Hide questions by default in embedded view
                    questionMarker.visible = false;
                    if (questionMarker.element) {
                        questionMarker.element.style.display = 'none';
                    }
                    scene.add(questionMarker);

                    // Camera view positions (already in transformed space)
                    let cameraView = null;
                    if (savedQuestion.camera_position_x !== null) {
                        cameraView = {
                            position: new THREE.Vector3(
                                savedQuestion.camera_position_x,
                                savedQuestion.camera_position_y,
                                savedQuestion.camera_position_z
                            ),
                            target: new THREE.Vector3(
                                savedQuestion.camera_target_x,
                                savedQuestion.camera_target_y,
                                savedQuestion.camera_target_z
                            )
                        };
                    }

                    const questionData = {
                        id: savedQuestion.id,
                        text: savedQuestion.text,
                        question_type: savedQuestion.question_type || 'mcq',
                        options: savedQuestion.options,
                        correctAnswer: savedQuestion.correct_answer,
                        position: position,
                        marker: questionMarker,
                        cameraView: cameraView
                    };
                    
                    // Add hover popup (only preview button, no edit/delete)
                    addQuestionHoverPopup(questionDiv, questionData);
                    
                    return questionData;
                });
            } catch (error) {
                console.error('Error loading questions:', error);
            }
        }
        
        function addQuestionHoverPopup(questionDiv, questionData) {
            const popup = document.createElement('div');
            popup.className = 'question-hover-popup';
            
            const questionText = document.createElement('div');
            questionText.className = 'question-hover-text';
            questionText.textContent = questionData.text;
            popup.appendChild(questionText);
            
            const buttons = document.createElement('div');
            buttons.className = 'question-hover-buttons';
            
            const previewBtn = document.createElement('button');
            previewBtn.className = 'question-hover-btn question-hover-btn-preview';
            previewBtn.textContent = 'Preview';
            previewBtn.onclick = (e) => {
                e.stopPropagation();
                previewQuestion(questionData);
            };
            
            buttons.appendChild(previewBtn);
            popup.appendChild(buttons);
            questionDiv.appendChild(popup);
            
            // Use JavaScript hover events
            let hoverTimeout = null;
            let isHovering = false;
            
            const showPopup = () => {
                if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    hoverTimeout = null;
                }
                isHovering = true;
                popup.style.display = 'flex';
            };
            
            const hidePopup = () => {
                isHovering = false;
                hoverTimeout = setTimeout(() => {
                    if (!isHovering) {
                        popup.style.display = 'none';
                    }
                    hoverTimeout = null;
                }, 200);
            };
            
            questionDiv.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                showPopup();
            });
            questionDiv.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                hidePopup();
            });
            popup.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                showPopup();
            });
            popup.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                hidePopup();
            });
        }
        
        function previewQuestion(questionData) {
            // Find the question index
            const questionIndex = questions.findIndex(q => q.id === questionData.id);
            if (questionIndex === -1) return;
            
            // Open quiz overlay
            const quizOverlay = document.getElementById('quiz-overlay');
            if (!quizOverlay) return;
            quizOverlay.classList.remove('hidden');
            
            // Set current question
            currentQuizQuestion = questionIndex;
            quizAnswers = new Array(questions.length).fill(-1);
            
            // Update UI to show this question
            updateQuizUI();
            
            // Disable navigation buttons in preview mode
            const prevBtn = document.getElementById('quiz-prev-btn');
            const nextBtn = document.getElementById('quiz-next-btn');
            const submitBtn = document.getElementById('quiz-submit-btn');
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'View Answer';
            }
            
            // Hide feedback area initially
            const feedback = document.getElementById('quiz-feedback');
            if (feedback) {
                feedback.style.display = 'none';
            }
            
            // Animate camera to question view
            if (questionData.cameraView) {
                animateCameraToSavedView(questionData.cameraView, () => {
                    // Camera animation complete
                });
            } else {
                animateCameraToPosition(questionData.position, () => {
                    // Camera animation complete
                });
            }
        }

        function startQuiz() {
            if (questions.length === 0) return;
            if (!currentModel) {
                alert('Model is still loading. Please wait...');
                return;
            }
            quizMode = true;
            currentQuizQuestion = 0;
            quizAnswers = new Array(questions.length).fill(-1);
            // Keep controls enabled so user can move the model during quiz
            controls.enabled = true;
            
            // Hide labels and show questions during quiz
            labels.forEach(labelData => {
                if (labelData && labelData.object) {
                    labelData.object.visible = false;
                    if (labelData.object.element) {
                        labelData.object.element.style.display = 'none';
                    }
                }
            });
            
            questions.forEach(question => {
                if (question.marker) {
                    question.marker.visible = true;
                    if (question.marker.element) {
                        question.marker.element.style.display = 'block';
                    }
                }
            });
            
            document.getElementById('quiz-overlay').classList.remove('hidden');
            
            // Wait a bit to ensure model is ready, then focus on first question
            setTimeout(() => {
                focusOnQuestion(0);
            }, 100);
        }

        function exitQuiz() {
            if (confirm('Are you sure you want to exit the quiz? Your progress will be lost.')) {
                quizMode = false;
                document.getElementById('quiz-overlay').classList.add('hidden');
                controls.enabled = true;
                
                // Restore label visibility based on labelsVisible state
                labels.forEach(labelData => {
                    if (labelData && labelData.object) {
                        labelData.object.visible = labelsVisible;
                        if (labelData.object.element) {
                            labelData.object.element.style.display = labelsVisible ? 'block' : 'none';
                        }
                    }
                });
                
                // Hide questions after quiz
                questions.forEach(question => {
                    if (question.marker) {
                        question.marker.visible = false;
                        if (question.marker.element) {
                            question.marker.element.style.display = 'none';
                        }
                    }
                });
                
                currentQuizQuestion = 0;
                quizAnswers = [];
            }
        }

        function focusOnQuestion(index) {
            if (index < 0 || index >= questions.length) return;
            if (!currentModel) {
                console.warn('Model not loaded yet, cannot focus on question');
                return;
            }
            const question = questions[index];
            currentQuizQuestion = index;
            
            // Ensure controls are updated before animating
            controls.update();
            
            if (question.cameraView) {
                animateCameraToSavedView(question.cameraView, () => {
                    updateQuizUI();
                });
            } else {
                animateCameraToPosition(question.position, () => {
                    updateQuizUI();
                });
            }
        }

        function animateCameraToSavedView(cameraView, callback) {
            if (isAnimating) return;
            if (!currentModel) {
                if (callback) callback();
                return;
            }
            isAnimating = true;
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            const endPosition = cameraView.position.clone();
            const endTarget = cameraView.target.clone();
            
            const duration = 1000;
            const startTime = Date.now();
            
            function animate() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                camera.position.lerpVectors(startPosition, endPosition, eased);
                controls.target.lerpVectors(startTarget, endTarget, eased);
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    isAnimating = false;
                    if (callback) callback();
                }
            }
            animate();
        }

        function animateCameraToPosition(targetPosition, callback) {
            if (isAnimating) return;
            if (!currentModel) {
                if (callback) callback();
                return;
            }
            isAnimating = true;
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            
            // Calculate good viewing position
            const box = new THREE.Box3().setFromObject(currentModel);
            const modelCenter = box.getCenter(new THREE.Vector3());
            
            // Calculate direction from target to model center for better viewing angle
            const direction = new THREE.Vector3().subVectors(modelCenter, targetPosition);
            const distance = direction.length();
            
            // If direction is too small, use a default direction
            if (distance < 0.1) {
                direction.set(1, 1, 1).normalize();
            } else {
                direction.normalize();
            }
            
            const viewDistance = Math.max(5, distance * 0.5);
            const endPosition = targetPosition.clone().add(direction.multiplyScalar(viewDistance));
            endPosition.y += 2; // Slight upward angle
            const endTarget = targetPosition.clone();
            
            const duration = 1000;
            const startTime = Date.now();
            
            function animate() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                camera.position.lerpVectors(startPosition, endPosition, eased);
                controls.target.lerpVectors(startTarget, endTarget, eased);
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    isAnimating = false;
                    if (callback) callback();
                }
            }
            animate();
        }

        function updateQuizUI() {
            if (currentQuizQuestion < 0 || currentQuizQuestion >= questions.length) return;
            const question = questions[currentQuizQuestion];
            
            document.getElementById('quiz-question-number').textContent = \`Question \${currentQuizQuestion + 1}\`;
            document.getElementById('quiz-progress-text').textContent = \`of \${questions.length}\`;
            document.getElementById('quiz-question-text').textContent = question.text;
            
            const quizOptions = document.getElementById('quiz-options');
            quizOptions.innerHTML = '';
            
            // Check question type (default to 'mcq' if not set)
            const questionType = question.question_type || 'mcq';
            
            if (questionType === 'text') {
                // Text input question
                const textInput = document.createElement('input');
                textInput.type = 'text';
                textInput.className = 'quiz-text-input';
                textInput.placeholder = 'Enter your answer...';
                textInput.style.width = '100%';
                textInput.style.padding = '12px';
                textInput.style.border = '2px solid #e0e0e0';
                textInput.style.borderRadius = '8px';
                textInput.style.fontSize = '1rem';
                textInput.style.boxSizing = 'border-box';
                textInput.value = quizAnswers[currentQuizQuestion] !== -1 && quizAnswers[currentQuizQuestion] !== null && quizAnswers[currentQuizQuestion] !== '' ? quizAnswers[currentQuizQuestion] : '';
                textInput.addEventListener('input', (e) => {
                    quizAnswers[currentQuizQuestion] = e.target.value.trim();
                });
                quizOptions.appendChild(textInput);
            } else {
                // MCQ question
                question.options.forEach((option, index) => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'quiz-option';
                    optionDiv.textContent = \`\${String.fromCharCode(65 + index)}. \${option}\`;
                    optionDiv.dataset.index = index;
                    
                    if (quizAnswers[currentQuizQuestion] === index) {
                        optionDiv.classList.add('selected');
                    }
                    
                    optionDiv.addEventListener('click', () => selectQuizOption(index));
                    quizOptions.appendChild(optionDiv);
                });
            }
            
            document.getElementById('quiz-prev-btn').disabled = currentQuizQuestion === 0;
            
            if (quizAnswers[currentQuizQuestion] !== -1 && quizAnswers[currentQuizQuestion] !== '') {
                showQuestionFeedback();
            } else {
                document.getElementById('quiz-feedback').classList.add('hidden');
            }
            
            if (currentQuizQuestion === questions.length - 1) {
                document.getElementById('quiz-next-btn').classList.add('hidden');
                document.getElementById('quiz-submit-btn').classList.remove('hidden');
            } else {
                document.getElementById('quiz-next-btn').classList.remove('hidden');
                document.getElementById('quiz-submit-btn').classList.add('hidden');
            }
        }

        function selectQuizOption(index) {
            if (!quizMode) return;
            quizAnswers[currentQuizQuestion] = index;
            const options = document.getElementById('quiz-options').querySelectorAll('.quiz-option');
            options.forEach((opt, i) => {
                opt.classList.remove('selected');
                if (i === index) {
                    opt.classList.add('selected');
                }
            });
        }

        function previousQuestion() {
            if (currentQuizQuestion > 0) {
                focusOnQuestion(currentQuizQuestion - 1);
            }
        }

        function nextQuestion() {
            if (currentQuizQuestion < questions.length - 1) {
                focusOnQuestion(currentQuizQuestion + 1);
            }
        }

        function showQuestionFeedback() {
            const question = questions[currentQuizQuestion];
            const selectedAnswer = quizAnswers[currentQuizQuestion];
            let isCorrect = false;
            const questionType = question.question_type || 'mcq';
            
            if (questionType === 'text') {
                // For text input, compare case-insensitively
                isCorrect = selectedAnswer && selectedAnswer.toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
            } else {
                // For MCQ, compare indices
                isCorrect = selectedAnswer === question.correctAnswer;
            }
            
            const feedback = document.getElementById('quiz-feedback');
            feedback.classList.remove('hidden', 'correct', 'incorrect');
            feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
            
            if (isCorrect) {
                feedback.textContent = '✓ Correct!';
            } else {
                if (questionType === 'text') {
                    feedback.textContent = \`✗ Incorrect. The correct answer is: \${question.correctAnswer}\`;
                } else {
                    feedback.textContent = \`✗ Incorrect. The correct answer is: \${String.fromCharCode(65 + question.correctAnswer)}. \${question.options[question.correctAnswer]}\`;
                }
            }
            
            // Update option colors (only for MCQ)
            if (questionType === 'mcq') {
                const options = document.getElementById('quiz-options').querySelectorAll('.quiz-option');
                options.forEach((opt, i) => {
                    opt.classList.remove('correct', 'incorrect');
                    if (i === question.correctAnswer) {
                        opt.classList.add('correct');
                    } else if (i === selectedAnswer && !isCorrect) {
                        opt.classList.add('incorrect');
                    }
                });
            }
        }

        function submitQuiz() {
            const currentAnswer = quizAnswers[currentQuizQuestion];
            if (currentAnswer === -1 || currentAnswer === '' || currentAnswer === null) {
                alert('Please provide an answer before submitting.');
                return;
            }
            showQuizResults();
        }

        function showQuizResults() {
            let correctCount = 0;
            questions.forEach((question, index) => {
                const userAnswer = quizAnswers[index];
                let isCorrect = false;
                const questionType = question.question_type || 'mcq';
                
                if (questionType === 'text') {
                    isCorrect = userAnswer && userAnswer.toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
                } else {
                    isCorrect = userAnswer === question.correctAnswer;
                }
                
                if (isCorrect) {
                    correctCount++;
                }
            });
            
            const totalQuestions = questions.length;
            const percentage = Math.round((correctCount / totalQuestions) * 100);
            
            document.getElementById('quiz-score').textContent = \`\${correctCount}/\${totalQuestions}\`;
            document.getElementById('quiz-percentage').textContent = \`\${percentage}%\`;
            
            const resultsSummary = document.getElementById('results-summary');
            resultsSummary.innerHTML = '';
            questions.forEach((question, index) => {
                const userAnswer = quizAnswers[index];
                let isCorrect = false;
                let correctAnswerText = '';
                let userAnswerText = '';
                const questionType = question.question_type || 'mcq';
                
                if (questionType === 'text') {
                    isCorrect = userAnswer && userAnswer.toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
                    correctAnswerText = question.correctAnswer;
                    userAnswerText = userAnswer || 'No answer';
                } else {
                    isCorrect = userAnswer === question.correctAnswer;
                    correctAnswerText = question.options[question.correctAnswer];
                    userAnswerText = userAnswer !== -1 && userAnswer !== null ? question.options[userAnswer] : 'No answer';
                }
                
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item ' + (isCorrect ? 'correct' : 'incorrect');
                
                const number = document.createElement('div');
                number.className = 'result-item-number';
                number.textContent = 'Question ' + (index + 1) + ': ' + (isCorrect ? '✓' : '✗');
                
                const answer = document.createElement('div');
                answer.className = 'result-item-answer';
                if (isCorrect) {
                    answer.textContent = \`Correct: \${correctAnswerText}\`;
                } else {
                    answer.textContent = \`Your answer: \${userAnswerText} | Correct: \${correctAnswerText}\`;
                }
                
                resultItem.appendChild(number);
                resultItem.appendChild(answer);
                resultsSummary.appendChild(resultItem);
            });
            
            document.getElementById('quiz-overlay').classList.add('hidden');
            document.getElementById('quiz-results-modal').classList.remove('hidden');
        }

        function closeResultsModal() {
            document.getElementById('quiz-results-modal').classList.add('hidden');
            quizMode = false;
            controls.enabled = true;
            
            // Restore label visibility based on labelsVisible state
            labels.forEach(label => {
                if (label) {
                    label.visible = labelsVisible;
                    if (label.element) {
                        label.element.style.display = labelsVisible ? 'block' : 'none';
                    }
                }
            });
            
            // Hide questions after quiz
            questions.forEach(question => {
                if (question.marker) {
                    question.marker.visible = false;
                    if (question.marker.element) {
                        question.marker.element.style.display = 'none';
                    }
                }
            });
            
            currentQuizQuestion = 0;
            quizAnswers = [];
        }
        ` : ''}

        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            if (animationMixer) {
                animationMixer.update(delta);
            }
            controls.update();
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        }

        initScene();
        document.getElementById('reset-camera-btn').addEventListener('click', resetCamera);
        document.getElementById('show-labels-btn').addEventListener('click', toggleLabels);
        document.getElementById('view-labels-list-btn').addEventListener('click', toggleLabelsPanel);
        document.getElementById('close-labels-panel').addEventListener('click', toggleLabelsPanel);
        ${hasQuestions ? `
        document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
        document.getElementById('exit-quiz-btn').addEventListener('click', exitQuiz);
        document.getElementById('quiz-prev-btn').addEventListener('click', previousQuestion);
        document.getElementById('quiz-next-btn').addEventListener('click', nextQuestion);
        document.getElementById('quiz-submit-btn').addEventListener('click', submitQuiz);
        document.getElementById('close-results-modal').addEventListener('click', closeResultsModal);
        document.getElementById('close-results').addEventListener('click', closeResultsModal);
        ` : ''}
        animate();
    </script>
</body>
</html>
    `);
});

// Serve static files (after all API and embed routes)
app.use(express.static(__dirname));

// Serve models directory
app.use('/models', express.static(modelsDir));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database initialized: anatomy_lab.db`);
    console.log(`Embed URLs: http://localhost:${PORT}/embed/:modelId`);
});
