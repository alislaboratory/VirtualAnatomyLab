// Import Three.js modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Initialize Three.js scene
let scene, camera, renderer, controls, labelRenderer;
let currentModel = null;
let animationMixer = null;
let clock = new THREE.Clock();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let labels = [];
let labelMode = false;
let pendingLabelPosition = null;
let labelsVisible = true; // Track labels visibility state
let questions = [];
let questionMode = false;
let pendingQuestionPosition = null;
let pendingCameraView = null;
let cameraAdjustmentMode = false;
let quizMode = false;
let currentQuizQuestion = 0;
let quizAnswers = [];
let isAnimating = false;
let currentModelId = null;
let originHelper = null;
const API_BASE = window.location.origin;

// DOM elements
const canvas = document.getElementById('viewer-canvas');
const modelSelectBtn = document.getElementById('model-select-btn');
const modelSelectText = document.getElementById('model-select-text');
const modelDropdownMenu = document.getElementById('model-dropdown-menu');
const modelDropdownList = document.getElementById('model-dropdown-list');
const resetCameraBtn = document.getElementById('reset-camera');
const editModelModal = document.getElementById('edit-model-modal');
const closeEditModelModalBtn = document.getElementById('close-edit-model-modal');
const cancelEditModelBtn = document.getElementById('cancel-edit-model');
const editModelNameInput = document.getElementById('edit-model-name-input');
const editModelDescriptionInput = document.getElementById('edit-model-description-input');
const saveEditModelBtn = document.getElementById('save-edit-model-btn');
const newModelModal = document.getElementById('new-model-modal');
const closeNewModelModalBtn = document.getElementById('close-new-model-modal');
const cancelNewModelBtn = document.getElementById('cancel-new-model');
const newModelFileInput = document.getElementById('new-model-file-input');
const modelNameInput = document.getElementById('model-name-input');
const modelDescriptionInput = document.getElementById('model-description-input');
const uploadModelBtn = document.getElementById('upload-model-btn');
const fileNameDisplay = document.getElementById('file-name-display');
const fileInputLabelText = document.getElementById('file-input-label-text');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const infoEl = document.getElementById('info');
const addLabelBtn = document.getElementById('add-label-btn');
const toggleLabelsBtn = document.getElementById('toggle-labels-btn');
const viewLabelsBtn = document.getElementById('view-labels-btn');
const labelsPanel = document.getElementById('labels-panel');
const closeLabelsPanelBtn = document.getElementById('close-labels-panel');
const labelsList = document.getElementById('labels-list');
const questionsPanel = document.getElementById('questions-panel');
const closeQuestionsPanelBtn = document.getElementById('close-questions-panel');
const questionsList = document.getElementById('questions-list');
const viewQuestionsBtn = document.getElementById('view-questions-btn');
const questionTypeSelect = document.getElementById('question-type');
const mcqOptionsContainer = document.getElementById('mcq-options-container');
const textAnswerContainer = document.getElementById('text-answer-container');
const textCorrectAnswerInput = document.getElementById('text-correct-answer');
const questionModalTitle = document.getElementById('question-modal-title');
const labelModal = document.getElementById('label-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelLabelBtn = document.getElementById('cancel-label');
const saveLabelBtn = document.getElementById('save-label');
const labelTextInput = document.getElementById('label-text');
const labelColorInput = document.getElementById('label-color');
const labelContainer = document.getElementById('label-container');

// Question and Quiz DOM elements
const addQuestionBtn = document.getElementById('add-question-btn');
const startQuizBtn = document.getElementById('start-quiz-btn');
const questionModal = document.getElementById('question-modal');
const closeQuestionModalBtn = document.getElementById('close-question-modal');
const cancelQuestionBtn = document.getElementById('cancel-question');
const saveQuestionBtn = document.getElementById('save-question');
const questionTextInput = document.getElementById('question-text');
const quizOverlay = document.getElementById('quiz-overlay');
const quizQuestionText = document.getElementById('quiz-question-text');
const quizOptions = document.getElementById('quiz-options');
const quizFeedback = document.getElementById('quiz-feedback');
const quizPrevBtn = document.getElementById('quiz-prev-btn');
const quizNextBtn = document.getElementById('quiz-next-btn');
const quizSubmitBtn = document.getElementById('quiz-submit-btn');
const exitQuizBtn = document.getElementById('exit-quiz-btn');
const quizQuestionNumber = document.getElementById('quiz-question-number');
const quizProgressText = document.getElementById('quiz-progress-text');
const quizResultsModal = document.getElementById('quiz-results-modal');
const closeResultsModalBtn = document.getElementById('close-results-modal');
const closeResultsBtn = document.getElementById('close-results');
const quizScore = document.getElementById('quiz-score');
const quizPercentage = document.getElementById('quiz-percentage');
const resultsSummary = document.getElementById('results-summary');
const addCameraViewBtn = document.getElementById('add-camera-view-btn');
const cameraViewStatus = document.getElementById('camera-view-status');
const cameraAdjustmentOverlay = document.getElementById('camera-adjustment-overlay');
const confirmCameraViewBtn = document.getElementById('confirm-camera-view-btn');
const cancelCameraAdjustmentBtn = document.getElementById('cancel-camera-adjustment-btn');

// Initialize the 3D scene
function initScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Create camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create CSS2D renderer for labels
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelContainer.appendChild(labelRenderer.domElement);

    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controls.minDistance = 1;
    controls.maxDistance = 100;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 5);
    directionalLight1.castShadow = true;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    // Add origin helper (shown when no model is loaded)
    createOriginHelper();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Handle custom dropdown
    modelSelectBtn.addEventListener('click', toggleModelDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!modelSelectBtn.contains(e.target) && !modelDropdownMenu.contains(e.target)) {
            modelDropdownMenu.classList.add('hidden');
        }
    });
    
    // Handle edit model modal
    closeEditModelModalBtn.addEventListener('click', closeEditModelModal);
    cancelEditModelBtn.addEventListener('click', closeEditModelModal);
    saveEditModelBtn.addEventListener('click', saveEditModel);
    
    // Handle new model modal
    closeNewModelModalBtn.addEventListener('click', closeNewModelModal);
    cancelNewModelBtn.addEventListener('click', closeNewModelModal);
    newModelFileInput.addEventListener('change', handleNewModelFileSelect);
    uploadModelBtn.addEventListener('click', uploadNewModel);
    modelNameInput.addEventListener('input', validateNewModelForm);

    // Handle reset camera
    resetCameraBtn.addEventListener('click', resetCamera);
    
    // Load available models
    loadAvailableModels();

    // Handle label controls
    addLabelBtn.addEventListener('click', toggleLabelMode);
    toggleLabelsBtn.addEventListener('click', toggleLabelsVisibility);
    viewLabelsBtn.addEventListener('click', toggleLabelsPanel);
    closeLabelsPanelBtn.addEventListener('click', toggleLabelsPanel);
    closeModalBtn.addEventListener('click', closeLabelModal);
    cancelLabelBtn.addEventListener('click', closeLabelModal);
    saveLabelBtn.addEventListener('click', saveLabel);

    // Handle questions panel
    viewQuestionsBtn.addEventListener('click', toggleQuestionsPanel);
    closeQuestionsPanelBtn.addEventListener('click', toggleQuestionsPanel);
    
    // Handle question type change
    questionTypeSelect.addEventListener('change', handleQuestionTypeChange);

    // Handle question controls
    addQuestionBtn.addEventListener('click', toggleQuestionMode);
    closeQuestionModalBtn.addEventListener('click', closeQuestionModal);
    cancelQuestionBtn.addEventListener('click', closeQuestionModal);
    saveQuestionBtn.addEventListener('click', saveQuestion);
    addCameraViewBtn.addEventListener('click', startCameraAdjustment);
    confirmCameraViewBtn.addEventListener('click', confirmCameraView);
    cancelCameraAdjustmentBtn.addEventListener('click', cancelCameraAdjustment);

    // Handle quiz controls
    startQuizBtn.addEventListener('click', startQuiz);
    exitQuizBtn.addEventListener('click', exitQuiz);
    quizPrevBtn.addEventListener('click', previousQuestion);
    quizNextBtn.addEventListener('click', nextQuestion);
    quizSubmitBtn.addEventListener('click', submitQuiz);
    closeResultsModalBtn.addEventListener('click', closeResultsModal);
    closeResultsBtn.addEventListener('click', closeResultsModal);

    // Handle click on canvas for label/question placement
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMouseMove);

    // Start animation loop
    animate();
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb')) {
        showError('Please select a GLB file.');
        return;
    }

    loadGLB(file);
}

// Load GLB file
function loadGLB(file) {
    showLoading(true);
    hideError();

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        
        // Use GLTFLoader to load the GLB file
        const loader = new GLTFLoader();
        
        loader.parse(
            arrayBuffer,
            '',
            function(gltf) {
                // Remove previous model if exists
                if (currentModel) {
                    scene.remove(currentModel);
                    if (animationMixer) {
                        animationMixer = null;
                    }
                }

                // Clear existing labels and questions
                clearLabels();
                clearQuestions();

                // Remove origin helper when model is loaded
                removeOriginHelper();

                // Add new model to scene
                currentModel = gltf.scene;
                scene.add(currentModel);

                // Handle animations
                if (gltf.animations && gltf.animations.length > 0) {
                    animationMixer = new THREE.AnimationMixer(currentModel);
                    gltf.animations.forEach((clip) => {
                        animationMixer.clipAction(clip).play();
                    });
                }

                // Center and scale model
                centerAndScaleModel(currentModel);

                // Reset camera to view the model
                resetCamera();

                showLoading(false);
                infoEl.classList.remove('hidden');
            },
            function(error) {
                console.error('Error loading GLB:', error);
                showError('Failed to load GLB file. Please ensure it is a valid GLB file.');
                showLoading(false);
            }
        );
    };

    reader.onerror = function() {
        showError('Error reading file.');
        showLoading(false);
    };

    reader.readAsArrayBuffer(file);
}

// Center and scale model to fit in view
function centerAndScaleModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
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

// Reset camera position with animation
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

// Handle window resize
function onWindowResize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Update animation mixer if it exists
    if (animationMixer) {
        animationMixer.update(delta);
    }

    // Update controls
    controls.update();

    // Render scene
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

// Show/hide loading indicator
function showLoading(show) {
    if (show) {
        loadingEl.classList.remove('hidden');
    } else {
        loadingEl.classList.add('hidden');
    }
}

// Show error message
function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    errorEl.classList.add('hidden');
}

// Create origin helper
function createOriginHelper() {
    if (originHelper) return; // Already exists
    
    // Create axes helper (X=red, Y=green, Z=blue)
    const axesHelper = new THREE.AxesHelper(2);
    
    // Create a small sphere at origin
    const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    
    // Group them together
    originHelper = new THREE.Group();
    originHelper.add(axesHelper);
    originHelper.add(sphere);
    
    scene.add(originHelper);
}

// Remove origin helper
function removeOriginHelper() {
    if (originHelper) {
        scene.remove(originHelper);
        originHelper = null;
    }
}

// Show origin helper (when model is removed)
function showOriginHelper() {
    if (!currentModel && !originHelper) {
        createOriginHelper();
    }
}

// Toggle model dropdown
function toggleModelDropdown() {
    modelDropdownMenu.classList.toggle('hidden');
}

// Load available models from database
async function loadAvailableModels() {
    try {
        const response = await fetch(`${API_BASE}/api/models`);
        const models = await response.json();
        
        modelDropdownList.innerHTML = '';
        
        // Add "New Model" option at the top
        const newModelItem = document.createElement('div');
        newModelItem.className = 'dropdown-item new-model-item';
        newModelItem.innerHTML = '<span>+ New Model</span>';
        newModelItem.onclick = () => {
            openNewModelModal();
            modelDropdownMenu.classList.add('hidden');
        };
        modelDropdownList.appendChild(newModelItem);
        
        // Add each model with edit/delete buttons
        models.forEach(model => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.modelId = model.id;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'dropdown-item-name';
            nameSpan.textContent = model.name;
            nameSpan.onclick = () => selectModel(model.id);
            
            const actions = document.createElement('div');
            actions.className = 'dropdown-item-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'dropdown-action-btn edit-btn';
            editBtn.innerHTML = '✏️';
            editBtn.title = 'Edit model';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                openEditModelModal(model);
            };
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'dropdown-action-btn delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Delete model';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteModel(model.id, model.name);
            };
            
            const embedBtn = document.createElement('button');
            embedBtn.className = 'dropdown-action-btn embed-btn';
            embedBtn.innerHTML = '&lt;/&gt;';
            embedBtn.title = 'Copy embed URL';
            embedBtn.onclick = (e) => {
                e.stopPropagation();
                copyEmbedUrl(model.id, embedBtn);
            };
            
            actions.appendChild(editBtn);
            actions.appendChild(embedBtn);
            actions.appendChild(deleteBtn);
            
            item.appendChild(nameSpan);
            item.appendChild(actions);
            modelDropdownList.appendChild(item);
        });
        
        // Update selected model text if one is loaded
        if (currentModelId) {
            const currentModel = models.find(m => m.id === currentModelId);
            if (currentModel) {
                modelSelectText.textContent = currentModel.name;
            }
        }
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

// Select a model
async function selectModel(modelId) {
    modelDropdownMenu.classList.add('hidden');
    await loadModelFromDatabase(modelId);
}

// Open edit model modal
function openEditModelModal(model) {
    modelDropdownMenu.classList.add('hidden');
    editModelModal.classList.remove('hidden');
    editModelNameInput.value = model.name;
    editModelDescriptionInput.value = model.description || '';
    editModelNameInput.dataset.modelId = model.id;
    editModelNameInput.focus();
}

// Close edit model modal
function closeEditModelModal() {
    editModelModal.classList.add('hidden');
    editModelNameInput.value = '';
    editModelDescriptionInput.value = '';
    delete editModelNameInput.dataset.modelId;
}

// Save edited model
async function saveEditModel() {
    const modelId = editModelNameInput.dataset.modelId;
    const name = editModelNameInput.value.trim();
    const description = editModelDescriptionInput.value.trim();

    if (!name) {
        showError('Please enter a model name.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/models/${modelId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            throw new Error('Failed to update model');
        }

        // Reload model list
        await loadAvailableModels();
        
        // Update current selection if this is the active model
        if (currentModelId === modelId) {
            modelSelectText.textContent = name;
        }

        closeEditModelModal();
    } catch (error) {
        console.error('Error updating model:', error);
        showError('Failed to update model: ' + error.message);
    }
}

// Copy embed URL to clipboard
function copyEmbedUrl(modelId, buttonElement) {
    const embedUrl = `${API_BASE}/embed/${modelId}`;
    
    // Show visual feedback on button
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = '✓';
    buttonElement.style.color = '#28a745';
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(embedUrl).then(() => {
            showError('Embed URL copied to clipboard!');
            setTimeout(() => {
                buttonElement.innerHTML = originalText;
                buttonElement.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopy(embedUrl);
            setTimeout(() => {
                buttonElement.innerHTML = originalText;
                buttonElement.style.color = '';
            }, 2000);
        });
    } else {
        fallbackCopy(embedUrl);
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.style.color = '';
        }, 2000);
    }
}

// Fallback copy method
function fallbackCopy(embedUrl) {
    const textarea = document.createElement('textarea');
    textarea.value = embedUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showError('Embed URL copied to clipboard!');
    } catch (err) {
        showError('Failed to copy. URL: ' + embedUrl);
    }
    document.body.removeChild(textarea);
}

// Delete model
async function deleteModel(modelId, modelName) {
    if (!confirm(`Are you sure you want to delete "${modelName}"? This will also delete all associated labels and questions.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/models/${modelId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete model');
        }

        // If the deleted model was currently loaded, clear it
        if (currentModelId === modelId) {
            clearModel();
            modelSelectText.textContent = 'Select a model...';
        }

        // Reload model list
        await loadAvailableModels();
    } catch (error) {
        console.error('Error deleting model:', error);
        showError('Failed to delete model: ' + error.message);
    }
}

// Handle new model file selection
function handleNewModelFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        fileNameDisplay.classList.add('hidden');
        fileInputLabelText.textContent = 'Choose GLB File';
        validateNewModelForm();
        return;
    }

    if (!file.name.toLowerCase().endsWith('.glb')) {
        showError('Please select a GLB file.');
        fileNameDisplay.classList.add('hidden');
        fileInputLabelText.textContent = 'Choose GLB File';
        validateNewModelForm();
        return;
    }

    // Display file name
    fileNameDisplay.textContent = `Selected: ${file.name}`;
    fileNameDisplay.classList.remove('hidden');
    fileInputLabelText.textContent = 'Change File';
    validateNewModelForm();
}

// Validate new model form
function validateNewModelForm() {
    const hasFile = newModelFileInput.files.length > 0;
    const hasName = modelNameInput.value.trim().length > 0;
    uploadModelBtn.disabled = !(hasFile && hasName);
}

// Open new model modal
function openNewModelModal() {
    newModelModal.classList.remove('hidden');
    modelNameInput.value = '';
    modelDescriptionInput.value = '';
    newModelFileInput.value = '';
    fileNameDisplay.classList.add('hidden');
    fileInputLabelText.textContent = 'Choose GLB File';
    uploadModelBtn.disabled = true;
    modelNameInput.focus();
}

// Close new model modal
function closeNewModelModal() {
    newModelModal.classList.add('hidden');
    modelNameInput.value = '';
    modelDescriptionInput.value = '';
    newModelFileInput.value = '';
    fileNameDisplay.classList.add('hidden');
    fileInputLabelText.textContent = 'Choose GLB File';
}

// Upload new model
async function uploadNewModel() {
    const file = newModelFileInput.files[0];
    const name = modelNameInput.value.trim();
    const description = modelDescriptionInput.value.trim();

    if (!file || !name) {
        showError('Please provide both a file and a name.');
        return;
    }

    if (!file.name.toLowerCase().endsWith('.glb')) {
        showError('Please select a GLB file.');
        return;
    }

    showLoading(true);
    uploadModelBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('model', file);
        formData.append('name', name);
        if (description) {
            formData.append('description', description);
        }

        const response = await fetch(`${API_BASE}/api/models`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload model');
        }

        const model = await response.json();

        // Reload model list
        await loadAvailableModels();

        // Update dropdown text and load the model
        modelSelectText.textContent = model.name;
        await loadModelFromDatabase(model.id);

        // Close modal
        closeNewModelModal();

        showLoading(false);
    } catch (error) {
        console.error('Error uploading model:', error);
        showError('Failed to upload model: ' + error.message);
        showLoading(false);
        uploadModelBtn.disabled = false;
    }
}

// Load model from database
async function loadModelFromDatabase(modelId) {
    showLoading(true);
    try {
        // Get model info
        const modelResponse = await fetch(`${API_BASE}/api/models/${modelId}`);
        if (!modelResponse.ok) {
            throw new Error('Model not found');
        }
        
        const model = await modelResponse.json();
        currentModelId = model.id;
        
        // Load the GLB file
        const fileResponse = await fetch(model.file_path);
        const arrayBuffer = await fileResponse.arrayBuffer();
        
        // Load GLB
        const loader = new GLTFLoader();
        loader.parse(
            arrayBuffer,
            '',
            async function(gltf) {
                // Remove previous model if exists
                if (currentModel) {
                    scene.remove(currentModel);
                    if (animationMixer) {
                        animationMixer = null;
                    }
                }

                // Clear existing labels and questions
                clearLabels();
                clearQuestions();

                // Remove origin helper when model is loaded
                removeOriginHelper();

                // Add new model to scene
                currentModel = gltf.scene;
                scene.add(currentModel);

                // Handle animations
                if (gltf.animations && gltf.animations.length > 0) {
                    animationMixer = new THREE.AnimationMixer(currentModel);
                    gltf.animations.forEach((clip) => {
                        animationMixer.clipAction(clip).play();
                    });
                }

                // Center and scale model
                centerAndScaleModel(currentModel);

                // Reset camera to view the model
                resetCamera();

                showLoading(false);
                infoEl.classList.remove('hidden');
                
                // Load labels and questions for this model
                await loadLabelsForModel(modelId);
                await loadQuestionsForModel(modelId);
            },
            function(error) {
                console.error('Error loading GLB:', error);
                showError('Failed to load GLB file. Please ensure it is a valid GLB file.');
                showLoading(false);
            }
        );
    } catch (error) {
        console.error('Error loading model:', error);
        showError('Failed to load model: ' + error.message);
        showLoading(false);
    }
}

// Label Management Functions
function toggleLabelMode() {
    if (cameraAdjustmentMode) return; // Don't allow toggling during camera adjustment
    labelMode = !labelMode;
    if (labelMode) {
        addLabelBtn.classList.add('active');
        addLabelBtn.textContent = 'Click on Model to Add Label';
        canvas.style.cursor = 'crosshair';
    } else {
        addLabelBtn.classList.remove('active');
        addLabelBtn.textContent = 'Add Label';
        canvas.style.cursor = 'default';
        pendingLabelPosition = null;
    }
}

function onCanvasClick(event) {
    if (quizMode) return; // Disable clicking during quiz mode
    
    if ((!labelMode && !questionMode) || !currentModel) return;

    // Calculate mouse position in normalized device coordinates
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Check for intersection with model
    const intersects = raycaster.intersectObject(currentModel, true);

    if (intersects.length > 0) {
        const intersection = intersects[0];
        
        if (labelMode) {
            pendingLabelPosition = intersection.point.clone();
            openLabelModal();
        } else if (questionMode) {
            pendingQuestionPosition = intersection.point.clone();
            openQuestionModal();
        }
    }
}

function onCanvasMouseMove(event) {
    if (!labelMode || !currentModel) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function openLabelModal() {
    labelModal.classList.remove('hidden');
    labelTextInput.value = '';
    labelColorInput.value = '#667eea';
    labelTextInput.focus();
}

function closeLabelModal() {
    labelModal.classList.add('hidden');
    labelMode = false;
    addLabelBtn.classList.remove('active');
    addLabelBtn.textContent = 'Add Label';
    canvas.style.cursor = 'default';
    pendingLabelPosition = null;
}

async function saveLabel() {
    const text = labelTextInput.value.trim();
    if (!text || !pendingLabelPosition) {
        showError('Please enter label text.');
        return;
    }

    const color = labelColorInput.value;
    await createLabel(text, pendingLabelPosition, color);
    closeLabelModal();
}

async function createLabel(text, position, color = '#667eea') {
    if (!currentModelId) {
        showError('Please load a model first.');
        return;
    }

    try {
        // Save to database
        const response = await fetch(`${API_BASE}/api/models/${currentModelId}/labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                color: color,
                position_x: position.x,
                position_y: position.y,
                position_z: position.z
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save label');
        }

        const savedLabel = await response.json();

        // Create HTML element for label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label-3d';
        labelDiv.textContent = text;
        labelDiv.style.backgroundColor = color;
        labelDiv.style.borderColor = color;

        // Add hover popup
        addLabelHoverPopup(labelDiv, savedLabel.id);

        // Create CSS2D object
        const label = new CSS2DObject(labelDiv);
        label.position.copy(position);

        // Add to scene
        scene.add(label);

        // Store label info
        const labelData = {
            id: savedLabel.id,
            text: text,
            position: position.clone(),
            color: color,
            object: label
        };

        labels.push(labelData);
        
        // Show labels panel
        if (labelsPanel.classList.contains('hidden')) {
            labelsPanel.classList.remove('hidden');
        }
        
        updateLabelsList();
    } catch (error) {
        console.error('Error creating label:', error);
        showError('Failed to save label: ' + error.message);
    }
}

// Helper function to add hover popup to label
function addLabelHoverPopup(labelDiv, labelId) {
    const popup = document.createElement('div');
    popup.className = 'label-hover-popup';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'label-hover-btn label-hover-btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        const labelData = labels.find(l => l.id === labelId);
        if (labelData) {
            // Delete the old label and create a new one at the same position
            // This is a simple way to "edit" since labels don't have an edit API
            deleteLabel(labelId).then(() => {
                // Set up for new label at same position
                pendingLabelPosition = labelData.position.clone();
                labelTextInput.value = labelData.text;
                labelColorInput.value = labelData.color;
                labelModal.classList.remove('hidden');
                labelMode = true;
                addLabelBtn.classList.add('active');
                addLabelBtn.textContent = 'Cancel';
            });
        }
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'label-hover-btn label-hover-btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this label?')) {
            deleteLabel(labelId);
        }
    };
    
    popup.appendChild(editBtn);
    popup.appendChild(deleteBtn);
    labelDiv.appendChild(popup);
}

// Helper function to add hover popup to question
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
    
    const editBtn = document.createElement('button');
    editBtn.className = 'question-hover-btn question-hover-btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        openQuestionModal(questionData);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'question-hover-btn question-hover-btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this question?')) {
            deleteQuestion(questionData.id);
        }
    };
    
    buttons.appendChild(previewBtn);
    buttons.appendChild(editBtn);
    buttons.appendChild(deleteBtn);
    popup.appendChild(buttons);
    questionDiv.appendChild(popup);
}

// Preview a question - opens quiz UI and focuses on it
function previewQuestion(questionData) {
    // Find the question index
    const questionIndex = questions.findIndex(q => q.id === questionData.id);
    if (questionIndex === -1) return;
    
    // Don't set quizMode - this is just a preview
    // But we need to set currentQuizQuestion for updateQuizUI to work
    currentQuizQuestion = questionIndex;
    quizAnswers = new Array(questions.length).fill(-1);
    
    // Open quiz overlay
    quizOverlay.classList.remove('hidden');
    
    // Update UI to show this question (but disable navigation buttons for preview)
    updateQuizUI();
    
    // Disable navigation buttons in preview mode
    quizPrevBtn.disabled = true;
    quizNextBtn.disabled = true;
    const submitBtn = document.getElementById('quiz-submit-btn');
    if (submitBtn) submitBtn.disabled = true;
    
    // Hide feedback area in preview
    if (quizFeedback) {
        quizFeedback.style.display = 'none';
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
    
    // Add exit button handler - close preview when exit is clicked
    const exitBtn = document.getElementById('exit-quiz-btn');
    if (exitBtn) {
        const exitHandler = () => {
            quizOverlay.classList.add('hidden');
            // Re-enable buttons
            quizPrevBtn.disabled = false;
            quizNextBtn.disabled = false;
            if (submitBtn) submitBtn.disabled = false;
            if (quizFeedback) quizFeedback.style.display = 'block';
            exitBtn.removeEventListener('click', exitHandler);
        };
        exitBtn.addEventListener('click', exitHandler);
    }
}

async function deleteLabel(labelId) {
    try {
        const response = await fetch(`${API_BASE}/api/labels/${labelId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete label');
        }

        const index = labels.findIndex(l => l.id === labelId);
        if (index !== -1) {
            const labelData = labels[index];
            scene.remove(labelData.object);
            labelData.object.element.remove();
            labels.splice(index, 1);
            updateLabelsList();
        }
    } catch (error) {
        console.error('Error deleting label:', error);
        showError('Failed to delete label: ' + error.message);
    }
}

function updateLabelsList() {
    labelsList.innerHTML = '';

    if (labels.length === 0) {
        labelsList.innerHTML = '<p style="padding: 16px; color: #666; text-align: center;">No labels yet. Click "Add Label" to create one.</p>';
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
        position.textContent = `Position: (${labelData.position.x.toFixed(2)}, ${labelData.position.y.toFixed(2)}, ${labelData.position.z.toFixed(2)})`;
        content.appendChild(position);

        const actions = document.createElement('div');
        actions.className = 'label-item-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-small danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteLabel(labelData.id);
        actions.appendChild(deleteBtn);

        item.appendChild(content);
        item.appendChild(actions);
        labelsList.appendChild(item);
    });
}

function toggleLabelsPanel() {
    labelsPanel.classList.toggle('hidden');
    if (!labelsPanel.classList.contains('hidden')) {
        updateLabelsList();
    }
}

function toggleLabelsVisibility() {
    if (labels.length === 0) {
        showError('No labels to show/hide.');
        return;
    }
    
    // Toggle the visibility state
    labelsVisible = !labelsVisible;
    
    // Apply visibility to all labels
    labels.forEach(labelData => {
        if (labelData.object) {
            // Set CSS2DObject visibility
            labelData.object.visible = labelsVisible;
            
            // Also set element display style for CSS2DRenderer
            if (labelData.object.element) {
                labelData.object.element.style.display = labelsVisible ? 'block' : 'none';
            }
        }
    });

    // Update button text
    if (labelsVisible) {
        toggleLabelsBtn.textContent = 'Hide Labels';
    } else {
        toggleLabelsBtn.textContent = 'Show Labels';
    }
}

// Clear labels when new model is loaded
function clearLabels() {
    labels.forEach(labelData => {
        scene.remove(labelData.object);
        labelData.object.element.remove();
    });
    labels = [];
    labelsVisible = true; // Reset visibility state
    updateLabelsList();
    if (!labelsPanel.classList.contains('hidden')) {
        labelsPanel.classList.add('hidden');
    }
    // Reset button text
    toggleLabelsBtn.textContent = 'Hide Labels';
}

// Clear model and show origin
function clearModel() {
    if (currentModel) {
        scene.remove(currentModel);
        currentModel = null;
        currentModelId = null;
        if (animationMixer) {
            animationMixer = null;
        }
    }
    clearLabels();
    clearQuestions();
    showOriginHelper();
}

// Question Management Functions
function toggleQuestionMode() {
    if (quizMode) return; // Don't allow adding questions during quiz
    if (cameraAdjustmentMode) return; // Don't allow toggling during camera adjustment
    
    questionMode = !questionMode;
    if (questionMode) {
        addQuestionBtn.classList.add('active');
        addQuestionBtn.textContent = 'Click on Model to Add Question';
        canvas.style.cursor = 'crosshair';
        // Disable label mode if active
        if (labelMode) {
            toggleLabelMode();
        }
    } else {
        addQuestionBtn.classList.remove('active');
        addQuestionBtn.textContent = 'Add Question';
        canvas.style.cursor = 'default';
        pendingQuestionPosition = null;
    }
}

let editingQuestionId = null;

function openQuestionModal(questionData = null) {
    questionModal.classList.remove('hidden');
    editingQuestionId = questionData ? questionData.id : null;
    
    if (questionData) {
        questionModalTitle.textContent = 'Edit Question';
        questionTextInput.value = questionData.text;
        questionTypeSelect.value = questionData.question_type || 'mcq';
        handleQuestionTypeChange();
        
        if (questionData.question_type === 'text') {
            textCorrectAnswerInput.value = questionData.correctAnswer || '';
        } else {
            const options = questionData.options || [];
            for (let i = 0; i < 4; i++) {
                const optionInput = document.getElementById(`option-${i}`);
                const correctRadio = document.getElementById(`correct-${i}`);
                if (i < options.length) {
                    optionInput.value = options[i];
                    correctRadio.checked = (i === questionData.correctAnswer);
                } else {
                    optionInput.value = '';
                    correctRadio.checked = false;
                }
            }
        }
        
        // Load camera view if exists
        if (questionData.cameraView) {
            pendingCameraView = questionData.cameraView;
        } else {
            pendingCameraView = null;
        }
        updateCameraViewStatus();
    } else {
        questionModalTitle.textContent = 'Add Question';
        questionTextInput.value = '';
        questionTypeSelect.value = 'mcq';
        handleQuestionTypeChange();
        for (let i = 0; i < 4; i++) {
            document.getElementById(`option-${i}`).value = '';
            document.getElementById(`correct-${i}`).checked = (i === 0);
        }
        textCorrectAnswerInput.value = '';
        pendingCameraView = null;
        updateCameraViewStatus();
    }
    questionTextInput.focus();
}

function handleQuestionTypeChange() {
    const questionType = questionTypeSelect.value;
    if (questionType === 'text') {
        // Show text input, hide MCQ options
        mcqOptionsContainer.classList.add('hidden');
        textAnswerContainer.classList.remove('hidden');
    } else {
        // Show MCQ options, hide text input
        mcqOptionsContainer.classList.remove('hidden');
        textAnswerContainer.classList.add('hidden');
    }
}

function closeQuestionModal() {
    questionModal.classList.add('hidden');
    cameraAdjustmentOverlay.classList.add('hidden');
    cameraAdjustmentMode = false;
    questionMode = false;
    addQuestionBtn.classList.remove('active');
    addQuestionBtn.textContent = 'Add Question';
    canvas.style.cursor = 'default';
    pendingQuestionPosition = null;
    pendingCameraView = null;
    editingQuestionId = null;
}

function startCameraAdjustment() {
    // Hide the question modal and show camera adjustment overlay
    cameraAdjustmentMode = true;
    questionModal.classList.add('hidden');
    cameraAdjustmentOverlay.classList.remove('hidden');
    
    // Enable controls so user can adjust camera
    controls.enabled = true;
    
    // Disable question mode temporarily
    if (questionMode) {
        questionMode = false;
        addQuestionBtn.classList.remove('active');
        addQuestionBtn.textContent = 'Add Question';
        canvas.style.cursor = 'default';
    }
}

function confirmCameraView() {
    // Save current camera position and target
    pendingCameraView = {
        position: camera.position.clone(),
        target: controls.target.clone()
    };
    
    // Hide camera adjustment overlay and show question modal again
    cameraAdjustmentMode = false;
    cameraAdjustmentOverlay.classList.add('hidden');
    questionModal.classList.remove('hidden');
    
    // Re-enable question mode if we were in it
    if (pendingQuestionPosition) {
        questionMode = true;
        addQuestionBtn.classList.add('active');
        addQuestionBtn.textContent = 'Click on Model to Add Question';
        canvas.style.cursor = 'crosshair';
    }
    
    updateCameraViewStatus();
    questionTextInput.focus();
}

function cancelCameraAdjustment() {
    // Hide camera adjustment overlay and show question modal again
    cameraAdjustmentMode = false;
    cameraAdjustmentOverlay.classList.add('hidden');
    questionModal.classList.remove('hidden');
    
    // Re-enable question mode if we were in it
    if (pendingQuestionPosition) {
        questionMode = true;
        addQuestionBtn.classList.add('active');
        addQuestionBtn.textContent = 'Click on Model to Add Question';
        canvas.style.cursor = 'crosshair';
    }
    
    questionTextInput.focus();
}

function updateCameraViewStatus() {
    if (pendingCameraView) {
        cameraViewStatus.textContent = 'Camera view saved';
        cameraViewStatus.classList.add('saved');
        addCameraViewBtn.textContent = 'Update Camera View';
        addCameraViewBtn.classList.add('saved');
    } else {
        cameraViewStatus.textContent = 'No camera view saved';
        cameraViewStatus.classList.remove('saved');
        addCameraViewBtn.textContent = 'Add Camera View';
        addCameraViewBtn.classList.remove('saved');
    }
}

async function saveQuestion() {
    const text = questionTextInput.value.trim();
    const questionType = questionTypeSelect.value;
    
    if (!text) {
        showError('Please enter question text.');
        return;
    }

    if (editingQuestionId) {
        // Editing existing question
        const questionData = questions.find(q => q.id === editingQuestionId);
        if (!questionData) {
            showError('Question not found.');
            return;
        }
        
        let options = [];
        let correctAnswer = null;
        
        if (questionType === 'text') {
            correctAnswer = textCorrectAnswerInput.value.trim();
            if (!correctAnswer) {
                showError('Please enter the correct answer.');
                return;
            }
        } else {
            for (let i = 0; i < 4; i++) {
                const optionText = document.getElementById(`option-${i}`).value.trim();
                if (optionText) {
                    options.push(optionText);
                    if (document.getElementById(`correct-${i}`).checked) {
                        correctAnswer = options.length - 1;
                    }
                }
            }
            
            if (options.length < 2) {
                showError('Please provide at least 2 answer options.');
                return;
            }
            
            if (correctAnswer === null) {
                showError('Please select the correct answer.');
                return;
            }
        }
        
        await updateQuestion(editingQuestionId, text, questionType, options, correctAnswer, questionData.position, pendingCameraView || questionData.cameraView);
        closeQuestionModal();
    } else {
        // Creating new question
        if (!pendingQuestionPosition) {
            showError('Please click on the model to place the question.');
            return;
        }
        
        let options = [];
        let correctAnswer = null;
        
        if (questionType === 'text') {
            correctAnswer = textCorrectAnswerInput.value.trim();
            if (!correctAnswer) {
                showError('Please enter the correct answer.');
                return;
            }
        } else {
            for (let i = 0; i < 4; i++) {
                const optionText = document.getElementById(`option-${i}`).value.trim();
                if (optionText) {
                    options.push(optionText);
                    if (document.getElementById(`correct-${i}`).checked) {
                        correctAnswer = options.length - 1;
                    }
                }
            }
            
            if (options.length < 2) {
                showError('Please provide at least 2 answer options.');
                return;
            }
            
            if (correctAnswer === null) {
                showError('Please select the correct answer.');
                return;
            }
        }
        
        if (!pendingCameraView) {
            showError('Please add a camera view before saving the question.');
            return;
        }

        await createQuestion(text, questionType, options, correctAnswer, pendingQuestionPosition, pendingCameraView);
        closeQuestionModal();
    }
}

async function createQuestion(text, questionType, options, correctAnswer, position, cameraView) {
    if (!currentModelId) {
        showError('Please load a model first.');
        return;
    }

    try {
        // Save to database
        const response = await fetch(`${API_BASE}/api/models/${currentModelId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                question_type: questionType,
                options: options,
                correct_answer: correctAnswer,
                position_x: position.x,
                position_y: position.y,
                position_z: position.z,
                camera_position_x: cameraView.position.x,
                camera_position_y: cameraView.position.y,
                camera_position_z: cameraView.position.z,
                camera_target_x: cameraView.target.x,
                camera_target_y: cameraView.target.y,
                camera_target_z: cameraView.target.z
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save question');
        }

        const savedQuestion = await response.json();

        // Create HTML element for question marker
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

        // Store question info first (needed for hover popup)
        const questionData = {
            id: savedQuestion.id,
            text: text,
            question_type: savedQuestion.question_type || 'mcq',
            options: savedQuestion.options,
            correctAnswer: savedQuestion.correct_answer,
            position: position.clone(),
            cameraView: {
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
            }
        };

        // Add hover popup
        addQuestionHoverPopup(questionDiv, questionData);

        // Create CSS2D object
        const questionMarker = new CSS2DObject(questionDiv);
        questionMarker.position.copy(position);
        questionData.marker = questionMarker;

        // Add to scene
        scene.add(questionMarker);

        questions.push(questionData);
        
        // Enable start quiz button if we have questions
        if (questions.length > 0) {
            startQuizBtn.disabled = false;
        }
        
        // Update questions list
        updateQuestionsList();
    } catch (error) {
        console.error('Error creating question:', error);
        showError('Failed to save question: ' + error.message);
    }
}

async function updateQuestion(questionId, text, questionType, options, correctAnswer, position, cameraView) {
    if (!currentModelId) {
        showError('Please load a model first.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/questions/${questionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                question_type: questionType,
                options: options,
                correct_answer: correctAnswer,
                position_x: position.x,
                position_y: position.y,
                position_z: position.z,
                camera_position_x: cameraView.position.x,
                camera_position_y: cameraView.position.y,
                camera_position_z: cameraView.position.z,
                camera_target_x: cameraView.target.x,
                camera_target_y: cameraView.target.y,
                camera_target_z: cameraView.target.z
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update question');
        }

        const savedQuestion = await response.json();

        // Update question in local array
        const index = questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            const questionData = questions[index];
            questionData.text = text;
            questionData.question_type = savedQuestion.question_type || 'mcq';
            questionData.options = savedQuestion.options;
            questionData.correctAnswer = savedQuestion.correct_answer;
            questionData.cameraView = {
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

        updateQuestionsList();
    } catch (error) {
        console.error('Error updating question:', error);
        showError('Failed to update question: ' + error.message);
    }
}

async function deleteQuestion(questionId) {
    try {
        const response = await fetch(`${API_BASE}/api/questions/${questionId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete question');
        }

        const index = questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            const questionData = questions[index];
            scene.remove(questionData.marker);
            questionData.marker.element.remove();
            questions.splice(index, 1);
            updateQuestionsList();
            
            // Disable start quiz button if no questions
            if (questions.length === 0) {
                startQuizBtn.disabled = true;
            }
        }
    } catch (error) {
        console.error('Error deleting question:', error);
        showError('Failed to delete question: ' + error.message);
    }
}

function toggleQuestionsPanel() {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
        updateQuestionsList();
    }
}

function updateQuestionsList() {
    questionsList.innerHTML = '';

    if (questions.length === 0) {
        questionsList.innerHTML = '<p style="padding: 16px; color: #666; text-align: center;">No questions yet. Click "Add Question" to create one.</p>';
        return;
    }

    questions.forEach(questionData => {
        const item = document.createElement('div');
        item.className = 'label-item';
        item.style.borderLeftColor = '#ffc107';

        const content = document.createElement('div');
        content.className = 'label-item-content';

        const text = document.createElement('div');
        text.className = 'label-item-text';
        text.textContent = questionData.text;
        content.appendChild(text);

        const meta = document.createElement('div');
        meta.className = 'label-item-position';
        const typeLabel = questionData.question_type === 'text' ? 'Text Input' : 'MCQ';
        meta.textContent = `Type: ${typeLabel} | Position: (${questionData.position.x.toFixed(2)}, ${questionData.position.y.toFixed(2)}, ${questionData.position.z.toFixed(2)})`;
        content.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'label-item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-small';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => {
            openQuestionModal(questionData);
            questionsPanel.classList.add('hidden');
        };
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-small danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteQuestion(questionData.id);
        actions.appendChild(deleteBtn);

        item.appendChild(content);
        item.appendChild(actions);
        questionsList.appendChild(item);
    });
}

function clearQuestions() {
    questions.forEach(questionData => {
        scene.remove(questionData.marker);
        questionData.marker.element.remove();
    });
    questions = [];
    startQuizBtn.disabled = true;
}

// Quiz Mode Functions
function startQuiz() {
    if (questions.length === 0) {
        showError('Please add at least one question before starting the quiz.');
        return;
    }

    quizMode = true;
    currentQuizQuestion = 0;
    quizAnswers = new Array(questions.length).fill(-1);
    
    // Keep controls enabled so user can move the model during quiz
    controls.enabled = true;
    
    // Hide other UI
    addLabelBtn.disabled = true;
    addQuestionBtn.disabled = true;
    
    // Hide labels and show questions during quiz
    labels.forEach(labelData => {
        if (labelData.object) {
            labelData.object.visible = false;
            if (labelData.object.element) {
                labelData.object.element.style.display = 'none';
            }
        }
    });
    
    questions.forEach(questionData => {
        if (questionData.marker) {
            questionData.marker.visible = true;
            if (questionData.marker.element) {
                questionData.marker.element.style.display = 'block';
            }
        }
    });
    
    // Show quiz overlay
    quizOverlay.classList.remove('hidden');
    
    // Disable label and question modes
    if (labelMode) toggleLabelMode();
    if (questionMode) toggleQuestionMode();
    
    // Focus on first question
    focusOnQuestion(0);
}

function exitQuiz() {
    if (confirm('Are you sure you want to exit the quiz? Your progress will be lost.')) {
        quizMode = false;
        quizOverlay.classList.add('hidden');
        
        // Re-enable controls
        controls.enabled = true;
        addLabelBtn.disabled = false;
        addQuestionBtn.disabled = false;
        
        // Restore label visibility based on labelsVisible state
        labels.forEach(labelData => {
            if (labelData.object) {
                labelData.object.visible = labelsVisible;
                if (labelData.object.element) {
                    labelData.object.element.style.display = labelsVisible ? 'block' : 'none';
                }
            }
        });
        
        // Hide questions after quiz
        questions.forEach(questionData => {
            if (questionData.marker) {
                questionData.marker.visible = false;
                if (questionData.marker.element) {
                    questionData.marker.element.style.display = 'none';
                }
            }
        });
        
        // Reset quiz state
        currentQuizQuestion = 0;
        quizAnswers = [];
    }
}

function focusOnQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    
    const question = questions[index];
    currentQuizQuestion = index;
    
    // Animate camera to saved camera view or calculate position
    if (question.cameraView) {
        animateCameraToSavedView(question.cameraView, () => {
            // Update quiz UI
            updateQuizUI();
        });
    } else {
        // Fallback to old method if no camera view saved
        animateCameraToPosition(question.position, () => {
            // Update quiz UI
            updateQuizUI();
        });
    }
}

function animateCameraToSavedView(cameraView, callback) {
    if (isAnimating) return;
    
    isAnimating = true;
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPosition = cameraView.position.clone();
    const endTarget = cameraView.target.clone();
    
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-in-out)
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
    
    isAnimating = true;
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    
    // Calculate good viewing position
    const box = currentModel ? new THREE.Box3().setFromObject(currentModel) : null;
    const modelCenter = box ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();
    
    // Calculate direction from target to model center for better viewing angle
    const direction = new THREE.Vector3().subVectors(modelCenter, targetPosition).normalize();
    const distance = 5; // Distance from target position
    const endPosition = targetPosition.clone().add(direction.multiplyScalar(distance));
    endPosition.y += 2; // Slight upward angle
    
    const endTarget = targetPosition.clone();
    
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-in-out)
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
    
    // Update question number
    quizQuestionNumber.textContent = `Question ${currentQuizQuestion + 1}`;
    quizProgressText.textContent = `of ${questions.length}`;
    
    // Update question text
    quizQuestionText.textContent = question.text;
    
    // Update options based on question type
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
            optionDiv.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
            optionDiv.dataset.index = index;
            
            // Check if this option was previously selected
            if (quizAnswers[currentQuizQuestion] === index) {
                optionDiv.classList.add('selected');
            }
            
            optionDiv.addEventListener('click', () => selectQuizOption(index));
            quizOptions.appendChild(optionDiv);
        });
    }
    
    // Update navigation buttons
    quizPrevBtn.disabled = currentQuizQuestion === 0;
    
    // Show feedback if answer was submitted
    if (quizAnswers[currentQuizQuestion] !== -1 && quizAnswers[currentQuizQuestion] !== '') {
        showQuestionFeedback();
    } else {
        quizFeedback.classList.add('hidden');
    }
    
    // Show submit button on last question
    if (currentQuizQuestion === questions.length - 1) {
        quizNextBtn.classList.add('hidden');
        quizSubmitBtn.classList.remove('hidden');
    } else {
        quizNextBtn.classList.remove('hidden');
        quizSubmitBtn.classList.add('hidden');
    }
}

function selectQuizOption(index) {
    if (!quizMode) return;
    
    quizAnswers[currentQuizQuestion] = index;
    
    // Update UI
    const options = quizOptions.querySelectorAll('.quiz-option');
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
    
    quizFeedback.classList.remove('hidden');
    quizFeedback.classList.remove('correct', 'incorrect');
    quizFeedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
        quizFeedback.textContent = '✓ Correct!';
    } else {
        if (questionType === 'text') {
            quizFeedback.textContent = `✗ Incorrect. The correct answer is: ${question.correctAnswer}`;
        } else {
            quizFeedback.textContent = `✗ Incorrect. The correct answer is: ${String.fromCharCode(65 + question.correctAnswer)}. ${question.options[question.correctAnswer]}`;
        }
    }
    
    // Update option colors (only for MCQ)
    if (questionType === 'mcq') {
        const options = quizOptions.querySelectorAll('.quiz-option');
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
    // Show feedback for current question if not shown yet
    const currentAnswer = quizAnswers[currentQuizQuestion];
    if (currentAnswer === -1 || currentAnswer === '' || currentAnswer === null) {
        showError('Please provide an answer before submitting.');
        return;
    }
    
    // Show results
    showQuizResults();
}

function showQuizResults() {
    // Calculate score
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
    
    // Update score display
    quizScore.textContent = `${correctCount}/${totalQuestions}`;
    quizPercentage.textContent = `${percentage}%`;
    
    // Build summary
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
        resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
        
        const number = document.createElement('div');
        number.className = 'result-item-number';
        number.textContent = `Question ${index + 1}: ${isCorrect ? '✓' : '✗'}`;
        
        const answer = document.createElement('div');
        answer.className = 'result-item-answer';
        if (isCorrect) {
            answer.textContent = `Correct: ${correctAnswerText}`;
        } else {
            answer.textContent = `Your answer: ${userAnswerText} | Correct: ${correctAnswerText}`;
        }
        
        resultItem.appendChild(number);
        resultItem.appendChild(answer);
        resultsSummary.appendChild(resultItem);
    });
    
    // Hide quiz overlay and show results
    quizOverlay.classList.add('hidden');
    quizResultsModal.classList.remove('hidden');
}

function closeResultsModal() {
    quizResultsModal.classList.add('hidden');
    
    // Exit quiz mode
    quizMode = false;
    controls.enabled = true;
    addLabelBtn.disabled = false;
    addQuestionBtn.disabled = false;
    
    // Restore label visibility based on labelsVisible state
    labels.forEach(labelData => {
        if (labelData.object) {
            labelData.object.visible = labelsVisible;
            if (labelData.object.element) {
                labelData.object.element.style.display = labelsVisible ? 'block' : 'none';
            }
        }
    });
    
    // Hide questions after quiz
    questions.forEach(questionData => {
        if (questionData.marker) {
            questionData.marker.visible = false;
            if (questionData.marker.element) {
                questionData.marker.element.style.display = 'none';
            }
        }
    });
    
    // Reset quiz state
    currentQuizQuestion = 0;
    quizAnswers = [];
}

// Load labels for a model from database
async function loadLabelsForModel(modelId) {
    try {
        const response = await fetch(`${API_BASE}/api/models/${modelId}/labels`);
        if (!response.ok) return;
        
        const savedLabels = await response.json();
        
        // Clear existing labels
        clearLabels();
        
        // Load labels
        savedLabels.forEach(savedLabel => {
            const position = new THREE.Vector3(
                savedLabel.position_x,
                savedLabel.position_y,
                savedLabel.position_z
            );
            
            // Create HTML element for label
            const labelDiv = document.createElement('div');
            labelDiv.className = 'label-3d';
            labelDiv.textContent = savedLabel.text;
            labelDiv.style.backgroundColor = savedLabel.color;
            labelDiv.style.borderColor = savedLabel.color;

            // Add hover popup
            addLabelHoverPopup(labelDiv, savedLabel.id);

            // Create CSS2D object
            const label = new CSS2DObject(labelDiv);
            label.position.copy(position);

            // Add to scene
            scene.add(label);

            // Store label info
            const labelData = {
                id: savedLabel.id,
                text: savedLabel.text,
                position: position,
                color: savedLabel.color,
                object: label
            };

            labels.push(labelData);
        });
        
        if (labels.length > 0) {
            updateLabelsList();
        }
    } catch (error) {
        console.error('Error loading labels:', error);
    }
}

// Load questions for a model from database
async function loadQuestionsForModel(modelId) {
    try {
        const response = await fetch(`${API_BASE}/api/models/${modelId}/questions`);
        if (!response.ok) return;
        
        const savedQuestions = await response.json();
        
        // Clear existing questions
        clearQuestions();
        
        // Load questions
        savedQuestions.forEach(savedQuestion => {
            const position = new THREE.Vector3(
                savedQuestion.position_x,
                savedQuestion.position_y,
                savedQuestion.position_z
            );
            
            // Create HTML element for question marker
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

            // Store question info first (needed for hover popup)
            const questionData = {
                id: savedQuestion.id,
                text: savedQuestion.text,
                question_type: savedQuestion.question_type || 'mcq',
                options: savedQuestion.options,
                correctAnswer: savedQuestion.correct_answer,
                position: position,
                cameraView: savedQuestion.camera_position_x !== null ? {
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
                } : null
            };

            // Add hover popup
            addQuestionHoverPopup(questionDiv, questionData);

            // Create CSS2D object
            const questionMarker = new CSS2DObject(questionDiv);
            questionMarker.position.copy(position);
            questionData.marker = questionMarker;

            // Add to scene
            scene.add(questionMarker);

            questions.push(questionData);
        });
        
        // Enable start quiz button if we have questions
        if (questions.length > 0) {
            startQuizBtn.disabled = false;
        }
        
        // Update questions list
        updateQuestionsList();
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    initScene();
    // Disable start quiz button initially
    startQuizBtn.disabled = true;
    
    // Check if there's a model ID in the URL path
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(p => p);
    
    // If there's a single path segment that looks like a UUID, load that model
    if (pathParts.length === 1 && pathParts[0] !== '' && pathParts[0] !== 'embed') {
        const modelIdFromUrl = pathParts[0];
        // Validate it looks like a UUID (contains hyphens and is reasonable length)
        if (modelIdFromUrl.includes('-') && modelIdFromUrl.length > 10) {
            // Wait a bit for models to load, then select this model
            setTimeout(async () => {
                await loadAvailableModels();
                await selectModel(modelIdFromUrl);
            }, 500);
        }
    }
});
