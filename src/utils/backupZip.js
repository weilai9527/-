const encoder = new TextEncoder()
const decoder = new TextDecoder()

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

const crc32 = (bytes) => {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const toDosDateTime = (date = new Date()) => {
  const year = Math.max(date.getFullYear(), 1980)
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { dosDate, dosTime }
}

const writeUint16 = (view, offset, value) => view.setUint16(offset, value, true)
const writeUint32 = (view, offset, value) => view.setUint32(offset, value >>> 0, true)

const bytesFromEntry = async (entry) => {
  if (entry.bytes instanceof Uint8Array) return entry.bytes
  if (entry.blob instanceof Blob) return new Uint8Array(await entry.blob.arrayBuffer())
  if (typeof entry.text === 'string') return encoder.encode(entry.text)
  return new Uint8Array()
}

const makeLocalHeader = ({ nameBytes, crc, size, dosDate, dosTime }) => {
  const header = new Uint8Array(30 + nameBytes.length)
  const view = new DataView(header.buffer)
  writeUint32(view, 0, 0x04034b50)
  writeUint16(view, 4, 20)
  writeUint16(view, 6, 0x0800)
  writeUint16(view, 8, 0)
  writeUint16(view, 10, dosTime)
  writeUint16(view, 12, dosDate)
  writeUint32(view, 14, crc)
  writeUint32(view, 18, size)
  writeUint32(view, 22, size)
  writeUint16(view, 26, nameBytes.length)
  writeUint16(view, 28, 0)
  header.set(nameBytes, 30)
  return header
}

const makeCentralHeader = ({ nameBytes, crc, size, dosDate, dosTime, offset }) => {
  const header = new Uint8Array(46 + nameBytes.length)
  const view = new DataView(header.buffer)
  writeUint32(view, 0, 0x02014b50)
  writeUint16(view, 4, 20)
  writeUint16(view, 6, 20)
  writeUint16(view, 8, 0x0800)
  writeUint16(view, 10, 0)
  writeUint16(view, 12, dosTime)
  writeUint16(view, 14, dosDate)
  writeUint32(view, 16, crc)
  writeUint32(view, 20, size)
  writeUint32(view, 24, size)
  writeUint16(view, 28, nameBytes.length)
  writeUint16(view, 30, 0)
  writeUint16(view, 32, 0)
  writeUint16(view, 34, 0)
  writeUint16(view, 36, 0)
  writeUint32(view, 38, 0)
  writeUint32(view, 42, offset)
  header.set(nameBytes, 46)
  return header
}

const makeEndRecord = ({ entryCount, centralSize, centralOffset }) => {
  const record = new Uint8Array(22)
  const view = new DataView(record.buffer)
  writeUint32(view, 0, 0x06054b50)
  writeUint16(view, 4, 0)
  writeUint16(view, 6, 0)
  writeUint16(view, 8, entryCount)
  writeUint16(view, 10, entryCount)
  writeUint32(view, 12, centralSize)
  writeUint32(view, 16, centralOffset)
  writeUint16(view, 20, 0)
  return record
}

export const createZip = async (entries) => {
  const fileParts = []
  const centralParts = []
  let offset = 0

  for (const entry of entries) {
    const bytes = await bytesFromEntry(entry)
    const nameBytes = encoder.encode(entry.path)
    const { dosDate, dosTime } = toDosDateTime(entry.date)
    const crc = crc32(bytes)
    const size = bytes.length
    const localHeader = makeLocalHeader({ nameBytes, crc, size, dosDate, dosTime })
    const centralHeader = makeCentralHeader({ nameBytes, crc, size, dosDate, dosTime, offset })

    fileParts.push(localHeader, bytes)
    centralParts.push(centralHeader)
    offset += localHeader.length + size
  }

  const centralOffset = offset
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const endRecord = makeEndRecord({
    entryCount: entries.length,
    centralSize,
    centralOffset
  })

  return new Blob([...fileParts, ...centralParts, endRecord], { type: 'application/zip' })
}

export const readZip = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(bytes.buffer)
  const entries = new Map()
  let offset = 0

  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const flags = view.getUint16(offset + 6, true)
    const method = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const uncompressedSize = view.getUint32(offset + 22, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const nameStart = offset + 30
    const dataStart = nameStart + nameLength + extraLength
    const dataEnd = dataStart + compressedSize

    if (flags & 0x0008) {
      throw new Error('不支持带 data descriptor 的 ZIP 文件')
    }
    if (method !== 0) {
      throw new Error('备份 ZIP 使用了不支持的压缩方式')
    }
    if (dataEnd > bytes.length || compressedSize !== uncompressedSize) {
      throw new Error('备份 ZIP 文件已损坏')
    }

    const path = decoder.decode(bytes.slice(nameStart, nameStart + nameLength))
    entries.set(path, bytes.slice(dataStart, dataEnd))
    offset = dataEnd
  }

  return entries
}
