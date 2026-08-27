self.onmessage = (e: MessageEvent) => {
  const { imageData, threshold } = e.data as { imageData: ImageData; threshold: number };
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const v = luma >= threshold ? 255 : 0;
    output.data[i] = v;
    output.data[i + 1] = v;
    output.data[i + 2] = v;
    output.data[i + 3] = data[i + 3];
  }

  self.postMessage({ imageData: output });
};
