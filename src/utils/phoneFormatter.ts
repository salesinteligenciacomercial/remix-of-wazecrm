/**
 * Formata e valida número de telefone brasileiro
 * Adiciona automaticamente +55 e remove formatação
 * Aceita diferentes formatos:
 * - 10 dígitos: 1123892019 (DDD + 8 dígitos - adiciona 9 automaticamente)
 * - 11 dígitos: 61999523405 (DDD + 9 dígitos - já completo)
 * - Com código do país: 551123892019
 * - Com formatação: (11) 2389-2019, 11 2389-2019, etc.
 * 
 * Formatos aceitos:
 * - 1123892019 → 551123892019
 * - 61999523405 → 5561999523405
 * - 1132747400 → 551132747400
 * - 41999999999 → 5541999999999
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Número de telefone inválido');
  }

  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  
  // Se começar com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Remove código do país se já estiver presente
  if (cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
  }
  
  // Validar comprimento após remover código do país
  if (cleaned.length < 10 || cleaned.length > 11) {
    throw new Error(`Número inválido. Encontrado ${cleaned.length} dígitos após limpeza. Use o formato: DDD + número (10 ou 11 dígitos)`);
  }
  
  // Se tiver 10 dígitos, assume que é DDD(2) + número(8) - adiciona o 9
  if (cleaned.length === 10) {
    const ddd = cleaned.substring(0, 2);
    const numero = cleaned.substring(2);
    
    // Valida se o DDD é válido (deve estar entre 11 e 99)
    const dddNum = parseInt(ddd);
    if (dddNum < 11 || dddNum > 99) {
      throw new Error(`DDD inválido: ${ddd}. DDDs brasileiros são entre 11 e 99`);
    }
    
    // Adiciona o 9 para celular
    cleaned = ddd + '9' + numero;
  }
  
  // Se tiver 11 dígitos, valida se começa com 9 (celular) ou não (fixo)
  if (cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const primeiroDigito = cleaned.substring(2, 3);
    
    // Valida DDD
    const dddNum = parseInt(ddd);
    if (dddNum < 11 || dddNum > 99) {
      throw new Error(`DDD inválido: ${ddd}. DDDs brasileiros são entre 11 e 99`);
    }
    
    // Se não começar com 9, pode ser um número fixo (aceitamos mesmo assim)
    // Mas para WhatsApp, preferimos celular (que começa com 9)
  }
  
  // Adiciona código do país
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

/**
 * Versão segura que não lança erro - retorna string vazia se inválido
 * Tenta formatar o telefone de forma inteligente mesmo com formatos diferentes
 * Aceita números de 10 ou 11 dígitos (com ou sem DDD)
 */
export function safeFormatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  
  try {
    return formatPhoneNumber(phone);
  } catch {
    // Se falhar, tenta uma formatação mais permissiva
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove 0 inicial
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Remove código do país se presente
    if (cleaned.startsWith('55')) {
      cleaned = cleaned.substring(2);
    }
    
    // Se tiver exatamente 10 dígitos, assume DDD(2) + número(8) e adiciona 9
    if (cleaned.length === 10) {
      const ddd = cleaned.substring(0, 2);
      const numero = cleaned.substring(2);
      // Valida DDD básico (11-99)
      const dddNum = parseInt(ddd);
      if (dddNum >= 11 && dddNum <= 99) {
        cleaned = ddd + '9' + numero;
      } else {
        // Se DDD inválido, retorna vazio
        return '';
      }
    }
    
    // Se tiver 11 dígitos, valida DDD
    if (cleaned.length === 11) {
      const ddd = cleaned.substring(0, 2);
      const dddNum = parseInt(ddd);
      if (dddNum < 11 || dddNum > 99) {
        return '';
      }
    }
    
    // Se tiver entre 10-11 dígitos válidos, adiciona 55
    if (cleaned.length >= 10 && cleaned.length <= 11) {
      return '55' + cleaned;
    }
    
    // Se não conseguir formatar, retorna vazio
    return '';
  }
}

/**
 * Valida se um telefone pode ser formatado corretamente
 * Retorna true se o telefone é válido, false caso contrário
 */
export function isValidPhoneNumber(phone: string | undefined | null): boolean {
  if (!phone) return false;
  
  try {
    const formatted = formatPhoneNumber(phone);
    // Deve ter 13 dígitos (55 + DDD + 9 dígitos) ou 12 (55 + DDD + 8 dígitos)
    return formatted.length === 12 || formatted.length === 13;
  } catch {
    return false;
  }
}

/**
 * Formata número para exibição: +55 (85) 98765-4321
 */
export function displayPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 13) {
    // +55 (85) 98765-4321
    return `+${cleaned.substring(0, 2)} (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`;
  } else if (cleaned.length === 12) {
    // +55 (85) 8765-4321
    return `+${cleaned.substring(0, 2)} (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 8)}-${cleaned.substring(8)}`;
  }
  
  return phone;
}
