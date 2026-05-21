export interface Character {
  name: string
  age: number
  region: string
  avatar: string
}

const POOL: Character[] = [
  { name: 'ลุงสมชาย',  age: 68, region: 'เชียงใหม่', avatar: '👴' },
  { name: 'ป้าแดง',    age: 63, region: 'กรุงเทพฯ',  avatar: '👩' },
  { name: 'พี่ต้อม',   age: 52, region: 'ลำปาง',     avatar: '🧑' },
  { name: 'น้องนิด',   age: 47, region: 'เชียงราย',  avatar: '👧' },
  { name: 'ยายบัว',    age: 72, region: 'พะเยา',     avatar: '👵' },
  { name: 'ลุงแก้ว',   age: 65, region: 'ภูเก็ต',    avatar: '👴' },
  { name: 'ป้าสมใจ',   age: 59, region: 'ลำพูน',     avatar: '👩' },
  { name: 'พี่มาลี',   age: 44, region: 'นครราชสีมา', avatar: '🧑' },
]

export function pickCharacters(count: number): Character[] {
  const shuffled = [...POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
