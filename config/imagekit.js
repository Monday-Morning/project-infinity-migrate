import ImageKit from 'imagekit';

export const adamantiumA = new ImageKit({
  publicKey: process.env.IMAGEKIT_ADAMANTIUM_A_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_ADAMANTIUM_A_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_ADAMANTIUM_A_ENDPOINT,
});

export const infinityA = new ImageKit({
  publicKey: process.env.IMAGEKIT_INFINITY_A_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_INFINITY_A_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_INFINITY_A_ENDPOINT,
});

export default ImageKit;
