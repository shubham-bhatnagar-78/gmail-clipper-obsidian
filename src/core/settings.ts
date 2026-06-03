import '../styles/settings.scss';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../utils/storage';
import type { ClipperSettings, PropertyConfig } from '../types/email';

let currentSettings: ClipperSettings;

const vaultName = document.getElementById('vault-name') as HTMLInputElement;
const folderPath = document.getElementById('folder-path') as HTMLInputElement;
const filenameTemplate = document.getElementById('filename-template') as HTMLInputElement;
const dateFormat = document.getElementById('date-format') as HTMLInputElement;
const deliveryMethod = document.getElementById('delivery-method') as HTMLSelectElement;
const includeAttachments = document.getElementById('include-attachments') as HTMLInputElement;
const imageHandling = document.getElementById('image-handling') as HTMLSelectElement;
const threadSeparator = document.getElementById('thread-separator') as HTMLInputElement;
const propertiesEditor = document.getElementById('properties-editor')!;
const addPropertyBtn = document.getElementById('add-property')!;
const btnSave = document.getElementById('btn-save')!;
const btnReset = document.getElementById('btn-reset')!;
const saveStatus = document.getElementById('save-status')!;

function populateForm() {
  vaultName.value = currentSettings.vaultName;
  folderPath.value = currentSettings.folderPath;
  filenameTemplate.value = currentSettings.filenameTemplate;
  dateFormat.value = currentSettings.dateFormat;
  deliveryMethod.value = currentSettings.deliveryMethod;
  includeAttachments.checked = currentSettings.includeAttachmentList;
  imageHandling.value = currentSettings.imageHandling;
  threadSeparator.value = currentSettings.threadSeparator;
  renderProperties();
}

function renderProperties() {
  propertiesEditor.textContent = '';
  currentSettings.properties.forEach((prop, index) => {
    const row = document.createElement('div');
    row.className = 'property-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = prop.name;
    nameInput.placeholder = 'Name';
    nameInput.addEventListener('input', () => {
      currentSettings.properties[index].name = nameInput.value;
    });

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = prop.value;
    valueInput.placeholder = 'Value (e.g. {{subject}})';
    valueInput.addEventListener('input', () => {
      currentSettings.properties[index].value = valueInput.value;
    });

    const typeSelect = document.createElement('select');
    ['text', 'date', 'list', 'checkbox'].forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      typeSelect.appendChild(opt);
    });
    typeSelect.value = prop.type;
    typeSelect.addEventListener('change', () => {
      currentSettings.properties[index].type = typeSelect.value as PropertyConfig['type'];
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      currentSettings.properties.splice(index, 1);
      renderProperties();
    });

    row.appendChild(nameInput);
    row.appendChild(valueInput);
    row.appendChild(typeSelect);
    row.appendChild(removeBtn);
    propertiesEditor.appendChild(row);
  });
}

function showSaveStatus(message: string, type: 'success' | 'error') {
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${type}`;
  saveStatus.classList.remove('hidden');
  setTimeout(() => saveStatus.classList.add('hidden'), 3000);
}

async function handleSave() {
  const updated: ClipperSettings = {
    vaultName: vaultName.value,
    folderPath: folderPath.value,
    filenameTemplate: filenameTemplate.value,
    dateFormat: dateFormat.value,
    deliveryMethod: deliveryMethod.value as ClipperSettings['deliveryMethod'],
    includeAttachmentList: includeAttachments.checked,
    imageHandling: imageHandling.value as ClipperSettings['imageHandling'],
    threadSeparator: threadSeparator.value,
    templateId: currentSettings.templateId,
    properties: currentSettings.properties,
  };

  try {
    await saveSettings(updated);
    currentSettings = updated;
    showSaveStatus('Settings saved', 'success');
  } catch (err) {
    showSaveStatus(`Failed to save: ${err}`, 'error');
  }
}

addPropertyBtn.addEventListener('click', () => {
  currentSettings.properties.push({ name: '', value: '', type: 'text' });
  renderProperties();
});

btnSave.addEventListener('click', handleSave);

btnReset.addEventListener('click', async () => {
  currentSettings = { ...DEFAULT_SETTINGS };
  populateForm();
  await saveSettings(currentSettings);
  showSaveStatus('Reset to defaults', 'success');
});

async function init() {
  currentSettings = await loadSettings();
  populateForm();
}

init();
