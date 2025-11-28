// lib/whatsappParser.ts

export type ParsedConversation = {
  cleanedText: string
  title?: string
}

/**
 * Faz uma limpeza básica do .txt exportado do WhatsApp
 * e marca quem é "EU" vs "CLIENTE" com base no nome informado.
 *
 * Ele suporta os formatos mais comuns de export:
 *  - "09/11/2025 15:59 - Nome: mensagem"
 *  - "09/11/2025, 15:59 - Nome: mensagem"
 */
export function parseWhatsappConversation(
  raw: string,
  myName: string,
): ParsedConversation {
  const myNameNormalized = myName.trim().toLowerCase()

  // Quebra em linhas
  const lines = raw.split(/\r?\n/)

  const cleanedLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Remove cabeçalhos chatos do WhatsApp
    if (
      trimmed.startsWith("As mensagens e ligações são protegidas") ||
      trimmed.startsWith("Messages and calls are end-to-end encrypted") ||
      trimmed.startsWith("WhatsApp Business") ||
      trimmed.startsWith("Os envios de mídia")
    ) {
      continue
    }

    // Tenta bater com o padrão de mensagem com data/hora
    // Exemplo: 09/11/2025 15:59 - Nome: mensagem
    // ou      09/11/2025, 15:59 - Nome: mensagem
    const msgRegex =
      /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})\s+-\s+(.*?):\s+(.*)$/

    const match = trimmed.match(msgRegex)

    if (match) {
      const [, data, hora, autorOriginal, conteudo] = match
      const autorNormalized = autorOriginal.trim().toLowerCase()

      const speaker =
        autorNormalized === myNameNormalized ? "EU" : "CLIENTE"

      cleanedLines.push(`[${data} ${hora}] ${speaker}: ${conteudo}`)
    } else {
      // Linha que não bateu com o padrão: mantemos do jeito que está
      cleanedLines.push(trimmed)
    }
  }

  const cleanedText = cleanedLines.join("\n")

  // Cria um "título" simples usando a primeira linha útil
  const firstLine =
    cleanedLines.find((l) => !!l && !l.startsWith("[")) ??
    cleanedLines[0] ??
    "Conversa WhatsApp"

  const title = firstLine.slice(0, 80)

  return { cleanedText, title }
}