self.onmessage = (e: MessageEvent) => {
  const { imageData, levels } = e.data as { imageData: ImageData; levels: number };
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  const step = 255 / (levels - 1);

  for (let i = 0; i < data.length; i += 4) {
    output.data[i] = Math.round(Math.round(data[i] / step) * step);
    output.data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
    output.data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
    output.data[i + 3] = data[i + 3];
  }

  self.postMessage({ imageData: output });
};
