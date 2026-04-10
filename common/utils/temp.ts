export function matchFields(str: string, matcher = /\{([A-Z0-9]+)\}/gi) {
  if (!str) return null

  const matchList = str.match(matcher)
  if (!matchList) return null

  const fields: Record<string, {
    temp: string
    field: string
  }> = {}

  for (const match of matchList) {
    const field = match.substring(1, match.length - 1)
    if (field) {
      fields[field] = {
        temp: match,
        field,
      }
    }
  }

  return fields
}

export function matchAnyStrFields(str: string) {
  if (!str) return null

  const matchList = str.match(/\{([\u4E00-\u9FA5a-z0-9]+)\}/gi)
  if (!matchList) return null

  const fields: Record<string, {
    temp: string
    field: string
  }> = {}

  for (const match of matchList) {
    const field = match.substring(1, match.length - 1)
    if (field) {
      fields[field] = {
        temp: match,
        field,
      }
    }
  }

  return fields
}
