# UNSW Virtual Anatomy Lab

A web-based 3D anatomy model viewer that brings anatomical models to life using photogrammetry and 3D scanning. This project enables students to have 24/7 access to high-quality 3D anatomical models for interactive learning, complete with labeling, quizzes, and embeddable viewers.

## About

The UNSW Virtual Anatomy Lab is an innovative educational platform that transforms physical anatomical models into interactive 3D digital experiences. What makes this project unique is its accessibility - all 3D models were created using only iPhone cameras and photogrammetry software, demonstrating that high-quality 3D scanning doesn't require expensive equipment or specialized programming knowledge.

## How It Was Created

### 3D Model Creation Process

The 3D anatomical models in this project were created using a simple, accessible workflow:

1. **Photogrammetry with iPhone**: Physical anatomical models were photographed from multiple angles using standard iPhone cameras. No special equipment, lighting rigs, or professional cameras were needed.

2. **Photogrammetry Software**: The photos were processed using photogrammetry software (such as RealityCapture, Agisoft Metashape, or similar tools) to generate 3D models. These software solutions handle the complex mathematics of reconstructing 3D geometry from 2D images automatically - no programming required.

3. **Model Export**: The generated 3D models were exported as GLB files (GLTF Binary format), which is a standard, efficient format for web-based 3D content.

4. **Upload to Platform**: The GLB files were uploaded to this platform, where they can be viewed, labeled, and used for quizzes.

**Key Takeaway**: This approach proves that creating high-quality 3D educational content is accessible to anyone with a smartphone and photogrammetry software - no expensive 3D scanners, specialized equipment, or programming expertise required.

## Features

### Interactive 3D Viewer
- **Full 3D Navigation**: Rotate, pan, and zoom models with intuitive mouse/touch controls
- **Multiple Models**: Support for multiple anatomical models in a single platform
- **Responsive Design**: Works on desktop and mobile devices

### Labeling System
- **3D Labels**: Add interactive labels directly on the 3D model at specific points
- **Customizable Colors**: Color-code labels for different anatomical structures
- **Label Management**: View, edit, and delete labels through an intuitive panel
- **Visibility Toggle**: Show/hide labels as needed

### Quiz System
- **Multiple Question Types**:
  - **Multiple Choice Questions (MCQ)**: Traditional multiple choice with 2-4 options
  - **Text Input Questions**: Free-form text answers with case-insensitive matching
- **Interactive Quiz Mode**: 
  - Camera automatically focuses on question locations
  - Model remains fully interactive during quiz
  - Real-time feedback on answers
  - Comprehensive results summary
- **Question Management**: Create, edit, and delete questions with saved camera views
- **Camera Views**: Each question can have a saved camera position for optimal viewing

### Embeddable Viewers
- **Shareable Links**: Generate embed URLs for any model
- **Customizable Display**: 
  - Labels hidden by default (toggleable)
  - Questions hidden by default
  - Quiz mode available when questions exist
- **Full Functionality**: Embedded viewers support all interactive features

### Model Management
- **Upload Models**: Upload GLB files with custom names and descriptions
- **Edit Metadata**: Update model names and descriptions
- **Delete Models**: Remove models and all associated data

## Technology Stack

### Frontend
- **Three.js**: 3D graphics library for rendering GLB models
- **CSS2DRenderer**: For 3D labels and question markers
- **OrbitControls**: Camera controls for model navigation
- **Vanilla JavaScript**: No framework dependencies

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web server framework
- **Better-SQLite3**: Lightweight database for models, labels, and questions
- **Multer**: File upload handling

### 3D Model Format
- **GLB/GLTF**: Industry-standard 3D model format optimized for web delivery

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VirtualAnatomyLab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - The database will be automatically created on first run

## Usage Guide

### Uploading a Model

1. Click "Select a model..." dropdown
2. Click "+ New Model"
3. Enter a model name and optional description
4. Select a GLB file from your computer
5. Click "Upload Model"
6. The model will load automatically

### Adding Labels

1. Load a model
2. Click "Add Label" button
3. Click on the 3D model where you want to place the label
4. Enter label text and choose a color
5. Click "Save Label"
6. Use "View Labels List" to manage all labels
7. Use "Show/Hide Labels" to toggle visibility

### Creating Questions

1. Load a model
2. Click "Add Question" button
3. Click on the 3D model where you want to place the question marker
4. Enter question text
5. Choose question type:
   - **MCQ**: Enter 2-4 answer options and select the correct one
   - **Text Input**: Enter the correct answer text
6. Click "Add Camera View" to set the viewing angle for this question
   - The modal will hide, allowing you to adjust the camera
   - Click "Confirm Camera View" when ready
7. Click "Save Question"
8. Use "View Questions List" to manage all questions

### Taking a Quiz

1. Load a model with questions
2. Click "Start Quiz"
3. The camera will focus on the first question
4. Answer each question (you can still move the model)
5. Navigate between questions using "Previous" and "Next"
6. Submit the quiz when finished
7. View your results and score

### Embedding a Model

1. Click "Select a model..." dropdown
2. Find the model you want to embed
3. Click the `</>` button next to the model
4. The embed URL is copied to your clipboard
5. Use this URL in an iframe or share directly:
   ```html
   <iframe src="http://your-domain.com/embed/model-id" width="100%" height="600px"></iframe>
   ```

## API Endpoints

### Models
- `GET /api/models` - Get all models
- `GET /api/models/:id` - Get a specific model
- `POST /api/models` - Upload a new model
- `PUT /api/models/:id` - Update model metadata
- `DELETE /api/models/:id` - Delete a model

### Labels
- `GET /api/models/:modelId/labels` - Get all labels for a model
- `POST /api/models/:modelId/labels` - Create a new label
- `DELETE /api/labels/:id` - Delete a label

### Questions
- `GET /api/models/:modelId/questions` - Get all questions for a model
- `GET /api/questions/:id` - Get a specific question
- `POST /api/models/:modelId/questions` - Create a new question
- `PUT /api/questions/:id` - Update a question
- `DELETE /api/questions/:id` - Delete a question

### Embedding
- `GET /embed/:modelId` - Embedded viewer page for a model

## Project Structure

```
VirtualAnatomyLab/
├── server.js              # Express server and API routes
├── viewer.js              # Main 3D viewer and quiz logic
├── index.html             # Main application page
├── style.css              # Application styles
├── package.json           # Dependencies and scripts
├── anatomy_lab.db         # SQLite database (auto-created)
├── models/                # Uploaded GLB model files
├── ModelsToUpload/        # Sample models directory
└── README.md             # This file
```

## Database Schema

### Models Table
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `description` (TEXT)
- `file_path` (TEXT)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Labels Table
- `id` (TEXT, PRIMARY KEY)
- `model_id` (TEXT, FOREIGN KEY)
- `text` (TEXT)
- `color` (TEXT)
- `position_x`, `position_y`, `position_z` (REAL)
- `created_at` (DATETIME)

### Questions Table
- `id` (TEXT, PRIMARY KEY)
- `model_id` (TEXT, FOREIGN KEY)
- `text` (TEXT)
- `question_type` (TEXT) - 'mcq' or 'text'
- `options` (TEXT) - JSON array for MCQ
- `correct_answer` (TEXT) - Index for MCQ, text for text input
- `position_x`, `position_y`, `position_z` (REAL)
- `camera_position_x`, `camera_position_y`, `camera_position_z` (REAL)
- `camera_target_x`, `camera_target_y`, `camera_target_z` (REAL)
- `created_at` (DATETIME)

## Creating Your Own 3D Models

### Using iPhone Photogrammetry

1. **Prepare Your Subject**
   - Place the anatomical model on a neutral background
   - Ensure good, even lighting
   - Remove any distracting objects

2. **Capture Photos**
   - Use your iPhone camera (any recent model works)
   - Take 50-200 photos from different angles:
     - Move around the object in a circle
     - Take photos from above and below
     - Ensure 60-80% overlap between adjacent photos
   - Keep the object in focus and well-lit

3. **Process with Photogrammetry Software**
   - Upload photos to photogrammetry software (RealityCapture, Agisoft Metashape, Meshroom, etc.)
   - Let the software automatically align photos and generate 3D mesh
   - Clean up the model if needed (remove background, fill holes)
   - Export as GLB or GLTF format

4. **Upload to Platform**
   - Use the "Upload New Model" feature
   - Your model is ready for labeling and quiz creation!

### Recommended Photogrammetry Software
- **RealityCapture** (Epic Games) - Free for educational use, excellent results
- **Agisoft Metashape** - Professional-grade, paid but very accurate
- **Meshroom** - Open-source, free alternative
- **Polycam** (iOS app) - Direct iPhone app, can export GLB

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

ISC

## Contributing

This project is part of UNSW's educational initiatives. For contributions or questions, please contact the project maintainers.

## Acknowledgments

- Created using accessible photogrammetry techniques
- Built with open-source technologies
- Designed for educational accessibility

---

**Note**: This project demonstrates that high-quality 3D educational content can be created without expensive equipment or specialized programming knowledge. All models were scanned using only iPhone cameras and processed with standard photogrammetry software.
