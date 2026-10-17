// バイト列（number[]）と表示用の文字列（16進数・MACアドレス・IPv4アドレス）の相互変換

export const formatHex = (bytes: number[]): string =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(' ')

// 空白区切りなどの16進文字列をバイト列にする。形式が正しくなければ null
export function parseHex(text: string): number[] | null {
  const hex = text.replace(/\s+/g, '')
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) return null
  return hex.match(/../g)?.map((pair) => parseInt(pair, 16)) ?? []
}

// MACアドレスはアプリ全体で xx:xx:xx:xx:xx:xx（小文字）に統一する
export const formatMac = (bytes: number[]): string => formatHex(bytes).replace(/ /g, ':')

export function parseMac(text: string): number[] | null {
  const trimmed = text.trim()
  if (!/^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}$/.test(trimmed)) return null
  return parseHex(trimmed.replace(/:/g, ''))
}

export const formatIpv4 = (bytes: number[]): string => bytes.join('.')

export function parseIpv4(text: string): number[] | null {
  const parts = text.trim().split('.')
  const isValid = parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  return isValid ? parts.map(Number) : null
}

// ビッグエンディアンの数値を size バイトで読み書きする
export function parseUint(bytes: number[], offset: number, size: number): number {
  return bytes.slice(offset, offset + size).reduce((value, byte) => value * 256 + byte, 0)
}

export function buildUintBytes(value: number, size: number): number[] {
  return Array.from({ length: size }, (_, index) => Math.floor(value / 256 ** (size - 1 - index)) % 256)
}
