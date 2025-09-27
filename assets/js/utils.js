export const clone = (value) => JSON.parse(JSON.stringify(value));

let uidCounter = 0;
export const uid = (prefix = 'item') => `${prefix}-${Date.now().toString(36)}-${uidCounter++}`;

export const coalesce = (value, fallback) => (value === null || value === undefined ? fallback : value);

export const escapeHtml = (value) =>
  String(coalesce(value, ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const formatDate = (date) => {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export const debounce = (fn, delay = 180) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    });
    reader.addEventListener('error', () => {
      reject(reader.error || new Error('Unable to read file'));
    });
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Unable to load image')));
    image.src = src;
  });

export const compressImageFile = async (
  file,
  { maxWidth = 1600, maxHeight = 1600, quality = 0.82, mimeType } = {}
) => {
  if (!(file instanceof Blob)) {
    throw new Error('A valid image file is required');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    return dataUrl;
  }

  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return dataUrl;
  }

  const outputType = mimeType || (file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg');
  if (outputType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
  }
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  try {
    if (/image\/(jpeg|jpg|webp)/.test(outputType)) {
      return canvas.toDataURL(outputType, quality);
    }
    return canvas.toDataURL(outputType);
  } catch (error) {
    console.error('Unable to compress image, using original data URL instead.', error);
    return dataUrl;
  }
};
