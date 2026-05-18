function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    }
  }
  return ((crc & 0xffff) >>> 0).toString(16).toUpperCase().padStart(4, '0')
}

function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`
}

export function buildPromptPayEMV(phoneOrId: string, amount?: number): string {
  const raw = phoneOrId.replace(/[-\s]/g, '')
  const target = raw.length === 13
    ? `0213${raw}`
    : `0113${raw.startsWith('0') ? '66' + raw.slice(1) : raw}`

  const aid = tlv('00', '0101') + tlv('01', '12') + tlv('02', target)
  let payload =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('29', aid) +
    tlv('52', '0000') +
    tlv('53', '764') +
    (amount !== undefined ? tlv('54', amount.toFixed(2)) : '') +
    tlv('58', 'TH') +
    tlv('59', 'JUAGKAN') +
    tlv('60', 'Bangkok') +
    '6304'
  return payload + crc16(payload)
}

export function promptPayQrUrl(phoneOrId: string, amount: number): string {
  const emv = buildPromptPayEMV(phoneOrId, amount)
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(emv)}`
}
