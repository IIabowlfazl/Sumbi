document.addEventListener('DOMContentLoaded', () => {
      // --- DOM Elements ---
      // --- To-Do List Functions ---
let tasks = []; // Structure will be updated below
// let draggedItemIndex = null; // Consider removing/revising drag-and-drop later

// Generate unique IDs (simple counter for this example)
let nextTaskId = 0;
function getNextId() {
    // ... (keep existing getNextId function)
    const storedId = localStorage.getItem('nextTaskId');
    if (storedId) {
      nextTaskId = parseInt(storedId, 10);
    }
    const id = nextTaskId;
    nextTaskId++;
    localStorage.setItem('nextTaskId', nextTaskId.toString());
    return id;
}

// Find task or subtask by ID - NEW HELPER FUNCTION
function findTaskById(id, parentId = null) {
  if (parentId !== null) {
    const parentTask = tasks.find(task => task.id === parentId);
    if (parentTask && parentTask.subtasks) {
        const subtask = parentTask.subtasks.find(sub => sub.id === id);
        return { task: subtask, parentTask: parentTask };
    }
  } else {
      const task = tasks.find(task => task.id === id);
      return { task: task, parentTask: null };
  }
  return { task: null, parentTask: null };
}


function renderTasks() {
  taskList.innerHTML = ''; // Clear existing list

  tasks.forEach((task) => { // Only iterate through main tasks
    taskList.appendChild(createTaskElement(task));
  });

  saveTasks(); // Save after every render
}

// NEW: Function to create a single task/subtask element
function createTaskElement(task, parentId = null) {
    const li = document.createElement('li');
    li.classList.add('task-item');
    li.dataset.id = task.id;
    if (parentId !== null) {
        li.classList.add('subtask-item');
        li.dataset.parentId = parentId;
    } else {
        // Only main tasks are draggable for now
        li.draggable = true;
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('dragenter', handleDragEnter);
        li.addEventListener('dragleave', handleDragLeave);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);
    }

    if (task.completed) {
        li.classList.add('completed');
    }

    // --- Task Content ---
    const taskContent = document.createElement('div');
    taskContent.classList.add('task-content');

    // Add toggle icon if it's a main task with subtasks
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    if (!parentId && hasSubtasks) {
        li.classList.add('has-subtasks');
        if (task.isExpanded) {
            li.classList.add('expanded');
        }
        const toggleIcon = document.createElement('i');
        toggleIcon.classList.add('fas', 'fa-caret-right', 'toggle-subtasks');
        toggleIcon.addEventListener('click', handleToggleSubtasks);
        taskContent.appendChild(toggleIcon);
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('task-checkbox');
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', handleToggleComplete);
    taskContent.appendChild(checkbox);

    const taskTextSpan = document.createElement('span');
    taskTextSpan.classList.add('task-text');
    taskTextSpan.textContent = task.text;
    taskTextSpan.addEventListener('click', handleInitiateEdit); // Changed from editTask directly
    taskContent.appendChild(taskTextSpan);

    li.appendChild(taskContent);

    // --- Task Actions ---
    const taskActions = document.createElement('div');
    taskActions.classList.add('task-actions');

    // Add "Add Subtask" button only for main tasks
    if (parentId === null) {
        const addSubtaskButton = document.createElement('button');
        addSubtaskButton.classList.add('add-subtask-button');
        addSubtaskButton.title = 'Add Subtask';
        addSubtaskButton.innerHTML = '<i class="fas fa-plus-circle"></i>';
        addSubtaskButton.addEventListener('click', handleAddSubtask);
        taskActions.appendChild(addSubtaskButton);
    }

    const editButton = document.createElement('button');
    editButton.classList.add('edit-button');
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.addEventListener('click', handleInitiateEdit); // Changed from editTask directly
    taskActions.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button');
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.addEventListener('click', handleDeleteTask); // Changed from deleteTask
    taskActions.appendChild(deleteButton);

    li.appendChild(taskActions);

    // --- Nested Subtask List ---
    if (!parentId && hasSubtasks) {
        const subtaskList = document.createElement('ul');
        subtaskList.classList.add('subtask-list');
        task.subtasks.forEach(subtask => {
            // Recursive call (or direct call) to create subtask element
            subtaskList.appendChild(createTaskElement(subtask, task.id));
        });
        li.appendChild(subtaskList);
    }

    return li;
}


function addTask() {
  const text = taskInput.value.trim();
  if (text) {
    const newTask = {
      id: getNextId(),
      text: text,
      completed: false,
      isExpanded: false, // New property
      subtasks: []       // New property
    };
    tasks.push(newTask);
    taskInput.value = ''; // Clear input
    renderTasks(); // Re-render the entire list
  }
}

// Find task index by ID - *REPLACED by findTaskById*
// function findTaskIndexById(id) { ... } // Remove this old function


// --- NEW Event Handlers ---

function handleToggleSubtasks(event) {
    const taskItem = event.target.closest('.task-item');
    const taskId = parseInt(taskItem.dataset.id, 10);
    const { task } = findTaskById(taskId);

    if (task) {
        task.isExpanded = !task.isExpanded;
        taskItem.classList.toggle('expanded');
        // Update icon directly (optional, CSS rotation handles visuals)
        // event.target.classList.toggle('fa-caret-right');
        // event.target.classList.toggle('fa-caret-down');
        saveTasks(); // Persist the state
    }
}

 function handleAddSubtask(event) {
    const taskItem = event.target.closest('.task-item');
    const parentId = parseInt(taskItem.dataset.id, 10);
    const { task: parentTask } = findTaskById(parentId);

    if (parentTask) {
        const subtaskText = prompt('Enter subtask text:');
        if (subtaskText && subtaskText.trim()) {
            const newSubtask = {
                id: getNextId(),
                text: subtaskText.trim(),
                completed: false
                // Subtasks don't have subtasks or expanded state in this model
            };
            // Ensure subtasks array exists
            parentTask.subtasks = parentTask.subtasks || [];
            parentTask.subtasks.push(newSubtask);
            // Expand parent if not already expanded
            if (!parentTask.isExpanded) {
                parentTask.isExpanded = true;
            }
            renderTasks(); // Re-render to show the new subtask
        }
    }
}

function handleToggleComplete(event) {
    const taskItem = event.target.closest('.task-item');
    const id = parseInt(taskItem.dataset.id, 10);
    const parentId = taskItem.dataset.parentId ? parseInt(taskItem.dataset.parentId, 10) : null;

    const { task } = findTaskById(id, parentId);

    if (task) {
        task.completed = !task.completed;
        // Potentially add logic here: if main task completed, complete subtasks?
        // Or if all subtasks complete, complete main task?
        renderTasks(); // Re-render is simpler than toggling class directly
    }
}

function handleDeleteTask(event) {
     const taskItem = event.target.closest('.task-item');
     const id = parseInt(taskItem.dataset.id, 10);
     const parentId = taskItem.dataset.parentId ? parseInt(taskItem.dataset.parentId, 10) : null;

     let confirmMessage = "Are you sure you want to delete this task?";
     const { task, parentTask } = findTaskById(id, parentId);

     if (parentId === null && task && task.subtasks && task.subtasks.length > 0) {
         confirmMessage = "Are you sure you want to delete this main task and ALL its subtasks?";
     }

     if (task && confirm(confirmMessage)) {
         if (parentId !== null && parentTask) {
             // Delete subtask
             parentTask.subtasks = parentTask.subtasks.filter(sub => sub.id !== id);
         } else {
             // Delete main task
             tasks = tasks.filter(t => t.id !== id);
         }
         renderTasks(); // Re-render after deletion
     }
 }

 // Renamed original editTask to handle the actual editing process
 function handleInitiateEdit(event) {
    const taskItem = event.target.closest('.task-item');
    const id = parseInt(taskItem.dataset.id, 10);
    const parentId = taskItem.dataset.parentId ? parseInt(taskItem.dataset.parentId, 10) : null;
    const taskTextSpan = taskItem.querySelector('.task-text');

    if (!taskTextSpan || taskItem.querySelector('.edit-task-input')) {
         return; // Already editing or element not found
    }

    const { task } = findTaskById(id, parentId);
    if (!task) return;

    const currentText = task.text;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.classList.add('edit-task-input');
    input.style.flexGrow = '1'; // Take available space

    // Replace span with input
    const taskContentDiv = taskItem.querySelector('.task-content');
    taskContentDiv.replaceChild(input, taskTextSpan);
    input.focus();

    const saveEdit = () => {
         // Check if the input element is still part of the document
        if (!document.body.contains(input)) return;

        const newText = input.value.trim();
        const { task: currentTask } = findTaskById(id, parentId); // Re-fetch task

        if (currentTask) { // Ensure task still exists
             if (newText && newText !== currentText) {
                 currentTask.text = newText;
             }
        }
         // Always re-render to switch back from input to span and save
         renderTasks();
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
         if (e.key === 'Enter') {
             input.blur(); // Trigger saveEdit
         } else if (e.key === 'Escape') {
              // Just re-render to cancel editing without saving
              renderTasks();
         }
    });
 }


// Remove or comment out the old toggleComplete, editTask, deleteTask functions
// function toggleComplete(id) { ... }
// function deleteTask(id) { ... }
// function editTask(id, listItem) { ... }


// --- Persistence (Local Storage) ---
function saveTasks() {
  localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
  // Save nextTaskId as well
  localStorage.setItem('nextTaskId', nextTaskId.toString());
}

function loadTasks() {
    const storedTasks = localStorage.getItem('pomodoroTasks');
    if (storedTasks) {
        let loadedTasks = JSON.parse(storedTasks);
        // Ensure tasks have necessary properties (backward compatibility)
        tasks = loadedTasks.map(task => ({
            ...task,
            id: task.id ?? getNextId(), // Assign ID if missing (very old data)
            completed: task.completed ?? false,
            isExpanded: task.isExpanded ?? false,
            subtasks: (task.subtasks ?? []).map(sub => ({ // Ensure subtasks also have props
                ...sub,
                id: sub.id ?? getNextId(),
                completed: sub.completed ?? false
            }))
        }));
    } else {
        tasks = []; // Initialize if nothing is stored
    }

    // Ensure nextTaskId is initialized correctly after loading all IDs
    let maxId = -1;
    tasks.forEach(task => {
        if (task.id > maxId) maxId = task.id;
        if (task.subtasks) {
            task.subtasks.forEach(sub => {
                if (sub.id > maxId) maxId = sub.id;
            });
        }
    });
    const storedNextId = localStorage.getItem('nextTaskId');
    nextTaskId = Math.max(maxId + 1, storedNextId ? parseInt(storedNextId, 10) : 0);
    localStorage.setItem('nextTaskId', nextTaskId.toString());


    renderTasks(); // Call renderTasks *after* loading and initializing
}


// --- Drag and Drop Handlers ---
// !!! WARNING: These handlers are NOT updated for nested structure !!!
// They will likely misbehave. Consider disabling or rewriting them.
function handleDragStart(e) { ... }
function handleDragOver(e) { ... }
function handleDragEnter(e) { ... }
function handleDragLeave(e) { ... }
function handleDrop(e) { ... }
function handleDragEnd(e) { ... }

// --- Initialization ---
// Make sure loadTasks is called *after* all function definitions it relies on
// The order at the end seems fine:
// loadSettings();
// loadTasks();
// updateDisplay();
// --- Ensure Event Listeners use NEW handlers ---
// Remove old event listeners if they referred to the old functions by name directly
// (The current code uses anonymous functions or direct calls, which is mostly okay,
// but double check the main addTask listener)

// --- END OF script.js CHANGES ---
        });
        saveTasks(); // Save after every render
      }

      function addTask() {
        const text = taskInput.value.trim();
        if (text) {
          const newTask = {
            id: getNextId(), // Assign a unique ID
            text: text,
            completed: false,
          };
          tasks.push(newTask);
          taskInput.value = ''; // Clear input
          renderTasks();
        }
      }

      // Find task index by ID
      function findTaskIndexById(id) {
        return tasks.findIndex((task) => task.id === id);
      }

      function toggleComplete(id) {
        const index = findTaskIndexById(id);
        if (index > -1) {
          tasks[index].completed = !tasks[index].completed;
          renderTasks(); // Re-render to apply style changes
        }
      }

      function deleteTask(id) {
        tasks = tasks.filter((task) => task.id !== id); // Filter out the task by ID
        renderTasks();
      }

      function editTask(id, listItem) {
        const index = findTaskIndexById(id);
        if (index === -1) return;

        const taskTextSpan = listItem.querySelector('.task-text');
        const currentText = tasks[index].text;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.classList.add('edit-task-input');
        input.style.flexGrow = '1';

        const taskContentDiv = listItem.querySelector('.task-content');
        taskContentDiv.replaceChild(input, taskTextSpan);
        input.focus();

        const saveEdit = () => {
          const newText = input.value.trim();
          // Check if the element still exists before trying to replace
          if (listItem.contains(input)) {
            if (newText && newText !== currentText) {
              tasks[index].text = newText;
            }
            // Always re-render to ensure consistency, even if text is unchanged
            renderTasks();
          }
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            input.blur();
          } else if (e.key === 'Escape') {
             // Check if the element still exists before trying to replace
             if (listItem.contains(input)) {
                // Revert to original text span by re-rendering
                renderTasks();
             }
          }
        });
      }

      // --- Drag and Drop Handlers ---
      function handleDragStart(e) {
        draggedItemIndex = parseInt(this.dataset.index, 10);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Set data if needed, though index is stored globally here
        // e.dataTransfer.setData('text/plain', draggedItemIndex);
        // Add class for visual feedback
        setTimeout(() => this.classList.add('dragging'), 0); // Timeout helps visibility
      }

      function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        // Optional: Add class to target element for visual feedback
        // this.classList.add('drag-over');
      }

      function handleDragEnter(e) {
        e.preventDefault();
        // Add visual cue to the element being hovered over
        this.classList.add('drag-over');
      }

      function handleDragLeave(e) {
        // Remove visual cue when dragging leaves
        this.classList.remove('drag-over');
      }

      function handleDrop(e) {
        e.preventDefault(); // Prevent default browser behavior
        e.stopPropagation(); // Prevent event bubbling

        const droppedOnItemIndex = parseInt(this.dataset.index, 10);
        this.classList.remove('drag-over'); // Clean up visual cue

        if (draggedItemIndex !== null && draggedItemIndex !== droppedOnItemIndex) {
          // Reorder the tasks array
          const itemToMove = tasks.splice(draggedItemIndex, 1)[0];
          tasks.splice(droppedOnItemIndex, 0, itemToMove);

          // Re-render the list to reflect the new order
          renderTasks();
        }
      }

      function handleDragEnd(e) {
        // Clean up: Remove dragging class from all items
        const items = taskList.querySelectorAll('.task-item');
        items.forEach(item => item.classList.remove('dragging', 'drag-over'));
        draggedItemIndex = null; // Reset the dragged item index
      }


      // --- Persistence (Local Storage) ---
      function saveTasks() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
      }

      function loadTasks() {
        const storedTasks = localStorage.getItem('pomodoroTasks');
        if (storedTasks) {
          tasks = JSON.parse(storedTasks);
          // Ensure tasks have IDs if loading old data without them
          tasks.forEach(task => {
            if (task.id === undefined) {
              task.id = getNextId();
            }
          });
        } else {
          tasks = []; // Initialize if nothing is stored
        }
        // Ensure nextTaskId is initialized correctly after loading
        let maxId = -1;
        tasks.forEach(task => {
            if (task.id > maxId) maxId = task.id;
        });
        nextTaskId = maxId + 1;
        localStorage.setItem('nextTaskId', nextTaskId.toString());

        renderTasks();
      }

      function saveSettings() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
      }

      function loadSettings() {
        const storedSettings = localStorage.getItem('pomodoroSettings');
        if (storedSettings) {
          settings = JSON.parse(storedSettings);
        }
        workDurationInput.value = settings.workDuration;
        shortBreakDurationInput.value = settings.shortBreakDuration;
        longBreakDurationInput.value = settings.longBreakDuration;
        if (isPaused) {
          resetTimer();
        }
      }

      // --- Settings Modal ---
      function openSettingsModal() {
        settingsModal.style.display = 'flex';
      }

      function closeSettingsModal() {
        settingsModal.style.display = 'none';
      }

      function applySettings() {
        const newWork = parseInt(workDurationInput.value, 10);
        const newShort = parseInt(shortBreakDurationInput.value, 10);
        const newLong = parseInt(longBreakDurationInput.value, 10);

        if (isNaN(newWork) || newWork < 1) {
          alert('Work duration must be at least 1 minute.');
          workDurationInput.value = settings.workDuration; return;
        }
        if (isNaN(newShort) || newShort < 1) {
          alert('Short break duration must be at least 1 minute.');
          shortBreakDurationInput.value = settings.shortBreakDuration; return;
        }
        if (isNaN(newLong) || newLong < 1) {
          alert('Long break duration must be at least 1 minute.');
          longBreakDurationInput.value = settings.longBreakDuration; return;
        }

        settings.workDuration = newWork;
        settings.shortBreakDuration = newShort;
        settings.longBreakDuration = newLong;

        saveSettings();
        closeSettingsModal();
        if (isPaused) {
          resetTimer();
        }
      }

      // --- Event Listeners ---
      startPauseButton.addEventListener('click', () => {
        if (isPaused) startTimer(); else pauseTimer();
      });
      skipButton.addEventListener('click', skipTimer);
      resetButton.addEventListener('click', resetTimer);
      addTaskButton.addEventListener('click', addTask);
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
      });
      settingsButton.addEventListener('click', openSettingsModal);
      closeButton.addEventListener('click', closeSettingsModal);
      saveSettingsButton.addEventListener('click', applySettings);
      window.addEventListener('click', (event) => {
        if (event.target === settingsModal) closeSettingsModal();
      });

      // --- Initialization ---
      loadSettings();
      loadTasks(); // Load tasks (which now calls renderTasks)
      updateDisplay();
    });
