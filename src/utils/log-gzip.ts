export const doGzip = async (input: string, output: string) => {
  //@ts-ignore
  const gzip = window.zlib.createGzip();
  //@ts-ignore
  const source = window.fs.createReadStream(input)
  //@ts-ignore
  const dst = window.fs.createWriteStream(output)
  //@ts-ignore
  await window.pipePromise(source, gzip, dst)
  //@ts-ignore
  return window.readFilePromise(output)
}

export const getZipPath = (): string => {
  return window.localStorage.getItem('logPath') as string;
}

export const getLogPath = (): string => {
  return window.localStorage.getItem('logPath') as string;
}