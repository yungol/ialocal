import { apiFetch } from './useApi';

// Start a video generation job. `source` is either { imageId } for an already
// generated image or { image } with a base64/data-URL upload.
async function createVideo({ prompt, aspect, imageId, image }) {
  const data = await apiFetch('/api/video', {
    method: 'POST',
    body: JSON.stringify({ prompt, aspect, imageId, image }),
  });
  return data.jobId;
}

// Ask the vision model for an English image-to-video prompt based on an image.
// `kind` is 'greeting' or 'motion'. Returns the prompt string.
async function generateVideoPrompt({ kind, imageId, image, text }) {
  const data = await apiFetch('/api/video/prompt', {
    method: 'POST',
    body: JSON.stringify({ kind, imageId, image, text }),
  });
  return data.prompt;
}

function getVideoJob(jobId) {
  return apiFetch(`/api/video/job/${jobId}`);
}

// Poll a job until it finishes. Resolves with the saved video entry, rejects
// on error. `onStatus` reports intermediate states for the UI.
async function pollVideoJob(jobId, { onStatus, intervalMs = 2500 } = {}) {
  for (;;) {
    const job = await getVideoJob(jobId);
    if (onStatus) onStatus(job.status);

    if (job.status === 'done') return job.video;
    if (job.status === 'error') {
      throw new Error(job.error || 'Error al generar el video');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function getSavedVideos({ limit, offset } = {}) {
  const data = await apiFetch(
    `/api/videos?${new URLSearchParams({ limit: limit ?? 20, offset: offset ?? 0 })}`,
  );
  const videos = (data.videos || []).map((v) => ({
    id: v.id,
    // New entries carry `file`; older ones are named after the id.
    url: `/videos/${v.file || `${v.id}.mp4`}`,
    prompt: v.prompt,
    aspect: v.aspect,
    createdAt: v.createdAt,
  }));
  return { videos, total: data.total ?? videos.length };
}

function deleteVideo(id) {
  return apiFetch(`/api/videos/${id}`, { method: 'DELETE' });
}

export {
  createVideo,
  generateVideoPrompt,
  getVideoJob,
  pollVideoJob,
  getSavedVideos,
  deleteVideo,
};
