export function sum (a: number[]): number {
  let total = 0
  a.forEach(x => { total += x })
  return total
}

export function mean (a: number[]): number {
  if (a.length === 0) return 0
  return sum(a) / a.length
}

export function round (x: number): number {
  return parseFloat(x.toFixed(4))
}

export function unique <T> (a: T[]): T[] {
  return a.filter((x, i) => a.indexOf(x) === i)
}

export function makeTwoDigits (x: number): string {
  const y = Math.round(x)
  if (y > 9) return y.toString()
  else return '0' + y.toString()
}

export function getDateString (): string {
  const d = new Date()
  let myDateString = ''
  myDateString += d.getFullYear().toString()
  myDateString += makeTwoDigits((d.getMonth() + 1))
  myDateString += makeTwoDigits(d.getDate())
  myDateString += makeTwoDigits(d.getHours())
  myDateString += makeTwoDigits(d.getMinutes())
  myDateString += makeTwoDigits(d.getSeconds())
  return myDateString
}

export function filterString (str: string, allowedChars: string): string {
  const regExp = new RegExp(`[^${allowedChars}]`, 'g')
  return str.replace(regExp, '')
}

export function countOccurrences (str: string, target: string): number {
  const regExp = new RegExp(target, 'g')
  const matches = str.match(regExp) ?? []
  return matches.length
}

export function parseDecimal (str: string): number | null {
  const filtered = filterString(str, '1234567890.')
  const x = parseFloat(filtered)
  if (!isFinite(x)) return null
  return x
}

export function parseNumber (str: string): number | null {
  const split = str.split('/')
  if (split.length === 1) return parseDecimal(str)
  if (split.length === 2) {
    const numerator = parseDecimal(split[0])
    const denominator = parseDecimal(split[1])
    if (numerator == null) return null
    if (denominator == null) return null
    const decimal = numerator / denominator
    if (!isFinite(decimal)) return null
    return decimal
  }
  return null
}

export function isDecimal (str: string): boolean {
  const filtered = filterString(str, '1234567890.')
  const x = parseFloat(filtered)
  return isFinite(x)
}

export function parseAnswer (str: string): string {
  const x = parseNumber(str)
  if (x != null) return round(x).toString()
  return str.toLowerCase().replaceAll(' ', '')
}
