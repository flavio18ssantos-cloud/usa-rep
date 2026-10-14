import { higgsfield } from '@higgsfield/client/v2';

// Reads HF_CREDENTIALS (key-id:key-secret) from the environment; loaded from .env.local by the npm start script.
if (!process.env.HF_CREDENTIALS) {
  console.error('HF_CREDENTIALS is not set. Add it to .env.local in key-id:key-secret format.');
  process.exit(1);
}

async function main() {
  const jobSet = await higgsfield.subscribe('bytedance/seedance-2.5/text-to-video', {
    input: {
      prompt: 'A cinematic scene at sunset',
      duration: 5,
      resolution: '720p',
      aspect_ratio: '16:9',
    },
    withPolling: true,
  });

  switch (jobSet.status) {
    case 'completed': {
      const url = jobSet.video?.url;
      if (!url) {
        console.error('Request completed but no video URL was returned.');
        process.exit(1);
      }
      console.log('Video URL:', url);
      return;
    }
    case 'nsfw':
      console.error('Request was rejected by moderation (nsfw). No video was generated.');
      process.exit(2);
    case 'failed':
      console.error('Generation failed. Request ID:', jobSet.request_id);
      process.exit(3);
    default:
      // Covers canceled or any other non-terminal status returned without a result.
      console.error(`Request did not complete (status: ${jobSet.status}). Request ID: ${jobSet.request_id}`);
      process.exit(4);
  }
}

main().catch((error) => {
  console.error('Request error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
