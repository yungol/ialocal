const { execFile } = require('child_process');

function getVRAM() {
  return new Promise((resolve, reject) => {
    execFile(
      'nvidia-smi',
      ['--query-gpu=memory.used,memory.total,memory.free', '--format=csv,noheader,nounits'],
      (err, stdout) => {
        if (err) {
          return reject(new Error(`nvidia-smi failed: ${err.message}`));
        }

        const [used, total, free] = stdout
          .trim()
          .split(',')
          .map((s) => parseInt(s.trim(), 10));

        resolve({
          used,
          total,
          free,
          percentage: Math.round((used / total) * 100),
        });
      },
    );
  });
}

module.exports = { getVRAM };
