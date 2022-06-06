import { request } from 'https';

export default function getAPIResponse(postId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'mm.server1.dashnet.in',
      port: 443,
      path: `/api/post/get/${postId}`,
      method: 'GET',
      protocol: 'https:',
    };

    let data = '';

    const req = request(options, (res) => {
      res.on('data', (d) => {
        data += d;
      });
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}
