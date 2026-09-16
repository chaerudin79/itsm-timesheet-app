// Test fixDate logic
function fixDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr

  const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!dateMatch) return dateStr

  const [, first, second, year] = dateMatch
  const firstNum = parseInt(first, 10)
  const secondNum = parseInt(second, 10)

  if (firstNum > 12) {
    return `${second}/${first}/${year}`
  }

  if (secondNum > 12) {
    return dateStr
  }

  // Both <= 12 - assume DD/MM/YYYY, convert to MM/DD/YYYY
  return `${second}/${first}/${year}`
}

console.log('Input: 10/09/2026 (DD/MM - 10 Sept)')
console.log('Output:', fixDate('10/09/2026'))
console.log('Expected: 09/10/2026 (MM/DD - Sept 10)')
console.log('')

const result = fixDate('10/09/2026')
const [month, day, year] = result.split('/')
console.log(`Month: ${month}, Day: ${day}`)
console.log(`This is: ${new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
