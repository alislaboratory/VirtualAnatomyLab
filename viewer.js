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
let pendingLabelEditId = null; // Track label being edited
let labelsVisible = true; // Track labels visibility state
let questions = [];
let questionMode = false;
let pendingQuestionPosition = null;
let pendingCameraView = null;
let cameraAdjustmentMode = false;
let quizMode = false;
let previewMode = false; // Track if we're in preview mode
let currentQuizQuestion = 0;
let quizAnswers = [];
let isAnimating = false;
let currentModelId = null;
let originHelper = null;
const API_BASE = window.location.origin;

// Authentication state
let isLoggedIn = false;
let currentUsername = null;
const VALID_USERS = ['christina', 'kosta', 'ali', 'patrick'];
const VALID_PASSWORD = 'brachialplexus';

// Helper function to get current username
function getCurrentUsername() {
    if (!isLoggedIn) return null;
    const savedLogin = localStorage.getItem('anatomyLabLogin');
    if (savedLogin) {
        try {
            const loginData = JSON.parse(savedLogin);
            return loginData.username || null;
        } catch (e) {
            return null;
        }
    }
    return currentUsername;
}

// Helper function to log actions to server
async function logToServer(action, details = '', forceUsername = null) {
    // For failed logins, we want to log even if not logged in
    // Use forceUsername if provided, otherwise get current username
    const username = forceUsername || getCurrentUsername();
    
    // Only skip logging if no username available (except for failed logins which use forceUsername)
    if (!username && !forceUsername) return;
    
    try {
        await fetch(`${API_BASE}/api/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username || 'UNKNOWN', action, details })
        });
    } catch (error) {
        console.error('Error logging action:', error);
    }
}

// Helper function to add username header to fetch requests
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    const username = getCurrentUsername();
    if (username && options) {
        if (!options.headers) {
            options.headers = {};
        }
        if (options.headers instanceof Headers) {
            options.headers.set('x-username', username);
        } else if (typeof options.headers === 'object') {
            options.headers['x-username'] = username;
        }
    }
    return originalFetch(url, options);
};

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
const uploadProgressContainer = document.getElementById('upload-progress-container');
const uploadProgressFill = document.getElementById('upload-progress-fill');
const uploadProgressText = document.getElementById('upload-progress-text');
const loadingEl = document.getElementById('loading');
const dbLoadingEl = document.getElementById('db-loading');
const dbLoadingTextEl = document.getElementById('db-loading-text');
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
    
    // Initialize authentication
    initAuth();
}

// Authentication Functions
function initAuth() {
    // Check if user is already logged in
    const savedLogin = localStorage.getItem('anatomyLabLogin');
    if (savedLogin) {
        try {
            const loginData = JSON.parse(savedLogin);
            if (loginData.username && loginData.timestamp) {
                // Check if login is still valid (24 hours)
                const hoursSinceLogin = (Date.now() - loginData.timestamp) / (1000 * 60 * 60);
                if (hoursSinceLogin < 24) {
                    isLoggedIn = true;
                    currentUsername = loginData.username;
                    hideLoginModal();
                    showLogoutButton();
                    return;
                }
            }
        } catch (e) {
            // Invalid saved login, clear it
            localStorage.removeItem('anatomyLabLogin');
        }
    }
    
    // Show login modal if not logged in
    showLoginModal();
}

function showLoginModal() {
    const loginModal = document.getElementById('login-modal');
    const container = document.querySelector('.container');
    if (loginModal) {
        loginModal.classList.remove('hidden');
        if (container) {
            container.style.pointerEvents = 'none';
            container.style.opacity = '0.5';
        }
        setTimeout(() => {
            const usernameInput = document.getElementById('login-username');
            if (usernameInput) usernameInput.focus();
        }, 100);
    }
}

function hideLoginModal() {
    const loginModal = document.getElementById('login-modal');
    const container = document.querySelector('.container');
    if (loginModal) {
        loginModal.classList.add('hidden');
        if (container) {
            container.style.pointerEvents = 'auto';
            container.style.opacity = '1';
        }
    }
}

function showLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
    }
}

function hideLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.classList.add('hidden');
    }
}

function checkAuth() {
    if (!isLoggedIn) {
        showError('Please login to perform this action.');
        return false;
    }
    return true;
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim().toLowerCase();
            const password = document.getElementById('login-password').value;
            
            if (VALID_USERS.includes(username) && password === VALID_PASSWORD) {
                // Successful login
                isLoggedIn = true;
                currentUsername = username;
                localStorage.setItem('anatomyLabLogin', JSON.stringify({
                    username: username,
                    timestamp: Date.now()
                }));
                
                hideLoginModal();
                showLogoutButton();
                loginError.classList.add('hidden');
                loginForm.reset();
                
                // Log successful login
                logToServer('LOGIN_SUCCESS', `Username: ${username}`);
            } else {
                // Failed login
                loginError.textContent = 'Invalid username or password';
                loginError.classList.remove('hidden');
                document.getElementById('login-password').value = '';
                document.getElementById('login-password').focus();
                
                // Log failed login attempt (use forceUsername since user is not logged in)
                logToServer('LOGIN_FAILED', `Attempted username: ${username || 'UNKNOWN'}`, username || 'UNKNOWN');
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                const username = getCurrentUsername();
                isLoggedIn = false;
                localStorage.removeItem('anatomyLabLogin');
                hideLogoutButton();
                showLoginModal();
                // Disable edit modes
                if (labelMode) toggleLabelMode();
                if (questionMode) toggleQuestionMode();
                if (quizMode) exitQuiz();
                
                // Log logout
                if (username) {
                    logToServer('LOGOUT', `Username: ${username}`);
                }
                currentUsername = null;
            }
        });
    }
});

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

// Show/hide database operation loading indicator
function showDbLoading(show, message = 'Processing...') {
    if (show) {
        if (dbLoadingTextEl) {
            dbLoadingTextEl.textContent = message;
        }
        if (dbLoadingEl) {
            dbLoadingEl.classList.remove('hidden');
        }
    } else {
        if (dbLoadingEl) {
            dbLoadingEl.classList.add('hidden');
        }
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
                copyEmbedUrl(model.id, model.name, embedBtn);
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
    if (!checkAuth()) return;
    
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
    if (!checkAuth()) return;
    
    const modelId = editModelNameInput.dataset.modelId;
    const name = editModelNameInput.value.trim();
    const description = editModelDescriptionInput.value.trim();

    if (!name) {
        showError('Please enter a model name.');
        return;
    }

    showDbLoading(true, 'Updating model...');
    try {
        const response = await fetch(`${API_BASE}/api/models/${modelId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            throw new Error('Failed to update model');
        }

        showDbLoading(true, 'Reloading models...');
        // Reload model list
        await loadAvailableModels();
        
        // Update current selection if this is the active model
        if (currentModelId === modelId) {
            modelSelectText.textContent = name;
        }

        closeEditModelModal();
        showDbLoading(false);
    } catch (error) {
        console.error('Error updating model:', error);
        showError('Failed to update model: ' + error.message);
        showDbLoading(false);
    }
}

// Copy embed URL to clipboard
function copyEmbedUrl(modelId, modelName, buttonElement) {
    const embedUrl = `${API_BASE}/embed/${modelId}`;
    
    // Log the action
    logToServer('COPY_EMBED_LINK', `Model: ${modelName || modelId} (ID: ${modelId})`);
    
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
    if (!checkAuth()) return;
    
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
    uploadProgressContainer.classList.add('hidden');
    uploadProgressFill.style.width = '0%';
    uploadProgressText.textContent = '0%';
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
    if (!checkAuth()) return;
    
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

    uploadModelBtn.disabled = true;
    uploadProgressContainer.classList.remove('hidden');
    uploadProgressFill.style.width = '0%';
    uploadProgressText.textContent = '0%';

    try {
        const formData = new FormData();
        formData.append('model', file);
        formData.append('name', name);
        if (description) {
            formData.append('description', description);
        }

        // Use XMLHttpRequest for upload progress tracking
        const model = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    uploadProgressFill.style.width = percentComplete + '%';
                    uploadProgressText.textContent = Math.round(percentComplete) + '%';
                }
            });

            // Handle completion
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const model = JSON.parse(xhr.responseText);
                        resolve(model);
                    } catch (e) {
                        reject(new Error('Invalid response from server'));
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error || 'Failed to upload model'));
                    } catch (e) {
                        reject(new Error('Failed to upload model'));
                    }
                }
            });

            // Handle errors
            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            // Handle abort
            xhr.addEventListener('abort', () => {
                reject(new Error('Upload cancelled'));
            });

            // Start upload - add username header
            xhr.open('POST', `${API_BASE}/api/models`);
            const username = getCurrentUsername();
            if (username) {
                xhr.setRequestHeader('x-username', username);
            }
            xhr.send(formData);
        });

        // Update progress for database operations
        uploadProgressText.textContent = 'Saving to database...';
        uploadProgressFill.style.width = '90%';

        showDbLoading(true, 'Reloading models...');
        // Reload model list
        await loadAvailableModels();

        uploadProgressText.textContent = 'Loading model...';
        uploadProgressFill.style.width = '100%';

        // Update dropdown text and load the model
        modelSelectText.textContent = model.name;
        await loadModelFromDatabase(model.id);

        // Close modal
        closeNewModelModal();
        uploadProgressContainer.classList.add('hidden');
        showDbLoading(false);
    } catch (error) {
        console.error('Error uploading model:', error);
        showError('Failed to upload model: ' + error.message);
        uploadProgressContainer.classList.add('hidden');
        showDbLoading(false);
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
        
        // Log model view (server already logs this, but we can add client-side logging too)
        // The server-side logging happens in the GET /api/models/:id endpoint
        
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
    if (!checkAuth()) return;
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
    // Clear edit state but don't delete the label
    pendingLabelPosition = null;
    pendingLabelEditId = null;
}

async function saveLabel() {
    const text = labelTextInput.value.trim();
    if (!text || !pendingLabelPosition) {
        showError('Please enter label text.');
        return;
    }

    const color = labelColorInput.value;
    
    // If we're editing an existing label, delete the old one first
    if (pendingLabelEditId) {
        await deleteLabel(pendingLabelEditId);
        pendingLabelEditId = null;
    }
    
    await createLabel(text, pendingLabelPosition, color);
    closeLabelModal();
}

async function createLabel(text, position, color = '#667eea') {
    if (!checkAuth()) return;
    if (!currentModelId) {
        showError('Please load a model first.');
        return;
    }

    showDbLoading(true, 'Saving label...');
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
        showDbLoading(false);
    } catch (error) {
        console.error('Error creating label:', error);
        showError('Failed to save label: ' + error.message);
        showDbLoading(false);
    }
}

// Helper functions for eye icons
function getOpenEyeIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>`;
}

function getClosedEyeIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>`;
}

// Store toggle button references for syncing
const labelToggleButtons = new Map(); // labelId -> [button1, button2, ...]
const questionToggleButtons = new Map(); // questionId -> [button1, button2, ...]

// Helper function to update all toggle buttons for a label
function updateLabelToggleButtons(labelId, isVisible) {
    const buttons = labelToggleButtons.get(labelId) || [];
    // Filter out invalid buttons and update valid ones
    const validButtons = buttons.filter(btn => btn && btn.parentElement);
    validButtons.forEach(btn => {
        btn.innerHTML = isVisible ? getOpenEyeIcon() : getClosedEyeIcon();
        btn.title = isVisible ? 'Hide label' : 'Show label';
    });
    // Update the stored buttons array to only include valid ones
    if (validButtons.length !== buttons.length) {
        labelToggleButtons.set(labelId, validButtons);
    }
}

// Helper function to update all toggle buttons for a question
function updateQuestionToggleButtons(questionId, isVisible) {
    const buttons = questionToggleButtons.get(questionId) || [];
    // Filter out invalid buttons and update valid ones
    const validButtons = buttons.filter(btn => btn && btn.parentElement);
    validButtons.forEach(btn => {
        btn.innerHTML = isVisible ? getOpenEyeIcon() : getClosedEyeIcon();
        btn.title = isVisible ? 'Hide question' : 'Show question';
    });
    // Update the stored buttons array to only include valid ones
    if (validButtons.length !== buttons.length) {
        questionToggleButtons.set(questionId, validButtons);
    }
}

// Unified function to toggle label visibility
function toggleLabelVisibility(labelId) {
    const labelData = labels.find(l => l.id === labelId);
    if (labelData && labelData.object) {
        const isVisible = labelData.object.visible;
        labelData.object.visible = !isVisible;
        if (labelData.object.element) {
            labelData.object.element.style.display = !isVisible ? 'block' : 'none';
        }
        // Update all toggle buttons for this label
        updateLabelToggleButtons(labelId, !isVisible);
    }
}

// Unified function to toggle question visibility
function toggleQuestionVisibility(questionId) {
    const question = questions.find(q => q.id === questionId);
    if (question && question.marker) {
        const isVisible = question.marker.visible;
        question.marker.visible = !isVisible;
        if (question.marker.element) {
            question.marker.element.style.display = !isVisible ? 'block' : 'none';
        }
        // Update all toggle buttons for this question
        updateQuestionToggleButtons(questionId, !isVisible);
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
            // Store the label data for editing (don't delete yet)
            pendingLabelEditId = labelId;
            pendingLabelPosition = labelData.position.clone();
            labelTextInput.value = labelData.text;
            labelColorInput.value = labelData.color;
            labelModal.classList.remove('hidden');
            labelMode = true;
            addLabelBtn.classList.add('active');
            addLabelBtn.textContent = 'Cancel';
        }
    };
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'label-hover-btn label-hover-btn-toggle';
    // Set initial state based on current visibility
    const labelDataForToggle = labels.find(l => l.id === labelId);
    const isCurrentlyVisible = labelDataForToggle && labelDataForToggle.object ? labelDataForToggle.object.visible : true;
    toggleBtn.innerHTML = isCurrentlyVisible ? getOpenEyeIcon() : getClosedEyeIcon();
    toggleBtn.title = isCurrentlyVisible ? 'Hide label' : 'Show label';
    
    // Register this button for syncing
    if (!labelToggleButtons.has(labelId)) {
        labelToggleButtons.set(labelId, []);
    }
    labelToggleButtons.get(labelId).push(toggleBtn);
    
    toggleBtn.onclick = (e) => {
        e.stopPropagation();
        toggleLabelVisibility(labelId);
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
    popup.appendChild(toggleBtn);
    popup.appendChild(deleteBtn);
    labelDiv.appendChild(popup);
    
    // Use JavaScript hover events for more reliable behavior
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
        // Use a longer delay to allow mouse movement between elements
        hoverTimeout = setTimeout(() => {
            if (!isHovering) {
                popup.style.display = 'none';
            }
            hoverTimeout = null;
        }, 200); // Increased delay
    };
    
    // Track mouse enter/leave on both elements
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
    
    // Also handle mouse movement to catch cases where mouse moves directly to popup
    labelDiv.addEventListener('mousemove', (e) => {
        e.stopPropagation();
        if (!isHovering) showPopup();
    });
    popup.addEventListener('mousemove', (e) => {
        e.stopPropagation();
        if (!isHovering) showPopup();
    });
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
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'question-hover-btn question-hover-btn-toggle';
    // Set initial state based on current visibility
    const question = questions.find(q => q.id === questionData.id);
    const isCurrentlyVisible = question && question.marker ? question.marker.visible : false;
    toggleBtn.innerHTML = isCurrentlyVisible ? getOpenEyeIcon() : getClosedEyeIcon();
    toggleBtn.title = isCurrentlyVisible ? 'Hide question' : 'Show question';
    
    // Register this button for syncing
    if (!questionToggleButtons.has(questionData.id)) {
        questionToggleButtons.set(questionData.id, []);
    }
    questionToggleButtons.get(questionData.id).push(toggleBtn);
    
    toggleBtn.onclick = (e) => {
        e.stopPropagation();
        toggleQuestionVisibility(questionData.id);
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
    buttons.appendChild(toggleBtn);
    buttons.appendChild(deleteBtn);
    popup.appendChild(buttons);
    questionDiv.appendChild(popup);
    
    // Use JavaScript hover events for more reliable behavior
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
        // Use a longer delay to allow mouse movement between elements
        hoverTimeout = setTimeout(() => {
            if (!isHovering) {
                popup.style.display = 'none';
            }
            hoverTimeout = null;
        }, 200); // Increased delay
    };
    
    // Track mouse enter/leave on both elements
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
    
    // Also handle mouse movement to catch cases where mouse moves directly to popup
    questionDiv.addEventListener('mousemove', (e) => {
        e.stopPropagation();
        if (!isHovering) showPopup();
    });
    popup.addEventListener('mousemove', (e) => {
        e.stopPropagation();
        if (!isHovering) showPopup();
    });
}

// Preview a question - opens quiz UI and focuses on it
function previewQuestion(questionData) {
    // Find the question index
    const questionIndex = questions.findIndex(q => q.id === questionData.id);
    if (questionIndex === -1) return;
    
    // Set preview mode
    previewMode = true;
    quizMode = false; // Not in actual quiz mode
    
    // Set currentQuizQuestion for updateQuizUI to work
    currentQuizQuestion = questionIndex;
    quizAnswers = new Array(questions.length).fill(-1);
    
    // Open quiz overlay
    quizOverlay.classList.remove('hidden');
    
    // Update UI to show this question
    updateQuizUI();
    
    // Disable navigation buttons in preview mode, but enable submit for preview
    quizPrevBtn.disabled = true;
    quizNextBtn.disabled = true;
    const submitBtn = document.getElementById('quiz-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'View Answer';
    }
    
    // Hide feedback area initially in preview
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
}

async function deleteLabel(labelId) {
    if (!checkAuth()) return;
    
    showDbLoading(true, 'Deleting label...');
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
            // Clean up toggle button references
            labelToggleButtons.delete(labelId);
            updateLabelsList();
        }
        showDbLoading(false);
    } catch (error) {
        console.error('Error deleting label:', error);
        showError('Failed to delete label: ' + error.message);
        showDbLoading(false);
    }
}

function updateLabelsList() {
    labelsList.innerHTML = '';
    // Don't clear all references - hover popup buttons should persist
    // Just remove references for list buttons (they'll be recreated)

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

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn-small';
        toggleBtn.style.background = '#6b7280';
        toggleBtn.style.color = 'white';
        toggleBtn.style.fontSize = '14px';
        toggleBtn.style.padding = '6px 10px';
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.justifyContent = 'center';
        const isCurrentlyVisible = labelData.object ? labelData.object.visible : true;
        toggleBtn.innerHTML = isCurrentlyVisible ? getOpenEyeIcon() : getClosedEyeIcon();
        toggleBtn.title = isCurrentlyVisible ? 'Hide label' : 'Show label';
        
        // Register this button for syncing
        if (!labelToggleButtons.has(labelData.id)) {
            labelToggleButtons.set(labelData.id, []);
        }
        labelToggleButtons.get(labelData.id).push(toggleBtn);
        
        toggleBtn.onclick = () => {
            toggleLabelVisibility(labelData.id);
        };
        actions.appendChild(toggleBtn);

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
    // Clear all toggle button references
    labelToggleButtons.clear();
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
    if (!checkAuth()) return;
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
    if (!checkAuth()) return;
    if (!currentModelId) {
        showError('Please load a model first.');
        return;
    }

    showDbLoading(true, 'Saving question...');
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
        showDbLoading(false);
    } catch (error) {
        console.error('Error creating question:', error);
        showError('Failed to save question: ' + error.message);
        showDbLoading(false);
    }
}

async function updateQuestion(questionId, text, questionType, options, correctAnswer, position, cameraView) {
    if (!checkAuth()) return;
    if (!currentModelId) {
        showError('Please load a model first.');
        return;
    }

    showDbLoading(true, 'Updating question...');
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
        showDbLoading(false);
    } catch (error) {
        console.error('Error updating question:', error);
        showError('Failed to update question: ' + error.message);
        showDbLoading(false);
    }
}

async function deleteQuestion(questionId) {
    if (!checkAuth()) return;
    
    showDbLoading(true, 'Deleting question...');
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
            // Clean up toggle button references
            questionToggleButtons.delete(questionId);
            updateQuestionsList();
            
            // Disable start quiz button if no questions
            if (questions.length === 0) {
                startQuizBtn.disabled = true;
            }
        }
        showDbLoading(false);
    } catch (error) {
        console.error('Error deleting question:', error);
        showError('Failed to delete question: ' + error.message);
        showDbLoading(false);
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

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn-small';
        toggleBtn.style.background = '#6b7280';
        toggleBtn.style.color = 'white';
        toggleBtn.style.fontSize = '14px';
        toggleBtn.style.padding = '6px 10px';
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.justifyContent = 'center';
        const isCurrentlyVisible = questionData.marker ? questionData.marker.visible : false;
        toggleBtn.innerHTML = isCurrentlyVisible ? getOpenEyeIcon() : getClosedEyeIcon();
        toggleBtn.title = isCurrentlyVisible ? 'Hide question' : 'Show question';
        
        // Register this button for syncing
        if (!questionToggleButtons.has(questionData.id)) {
            questionToggleButtons.set(questionData.id, []);
        }
        questionToggleButtons.get(questionData.id).push(toggleBtn);
        
        toggleBtn.onclick = () => {
            toggleQuestionVisibility(questionData.id);
        };
        actions.appendChild(toggleBtn);

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
    // Clear all toggle button references
    questionToggleButtons.clear();
    startQuizBtn.disabled = true;
}

// Quiz Mode Functions
function startQuiz() {
    if (questions.length === 0) {
        showError('Please add at least one question before starting the quiz.');
        return;
    }

    previewMode = false; // Reset preview mode
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
    // If in preview mode, don't show confirmation and don't reset quiz state
    if (previewMode) {
        previewMode = false;
        quizOverlay.classList.add('hidden');
        
        // Re-enable buttons
        quizPrevBtn.disabled = false;
        quizNextBtn.disabled = false;
        const submitBtn = document.getElementById('quiz-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Quiz';
        }
        if (quizFeedback) {
            quizFeedback.style.display = 'block';
        }
        
        // Reset preview state
        currentQuizQuestion = 0;
        quizAnswers = [];
        return;
    }
    
    // Normal quiz exit
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
    // If in preview mode, show the answer instead of submitting
    if (previewMode) {
        const question = questions[currentQuizQuestion];
        if (!question) return;
        
        // Show feedback for this question
        const userAnswer = quizAnswers[currentQuizQuestion];
        let isCorrect = false;
        let correctAnswerText = '';
        
        const questionType = question.question_type || 'mcq';
        if (questionType === 'text') {
            correctAnswerText = question.correctAnswer;
            isCorrect = userAnswer && userAnswer.toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
        } else {
            const correctIndex = parseInt(question.correctAnswer);
            correctAnswerText = question.options[correctIndex];
            isCorrect = userAnswer === correctIndex;
        }
        
        // Show feedback
        if (quizFeedback) {
            quizFeedback.style.display = 'block';
            quizFeedback.innerHTML = `
                <div style="padding: 16px; background: ${isCorrect ? '#d4edda' : '#f8d7da'}; border-radius: 8px; margin-top: 16px;">
                    <strong style="color: ${isCorrect ? '#155724' : '#721c24'};">${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong>
                    <p style="margin: 8px 0 0 0; color: #333;">Correct answer: ${correctAnswerText}</p>
                </div>
            `;
        }
        return;
    }
    
    // Normal quiz submission
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
