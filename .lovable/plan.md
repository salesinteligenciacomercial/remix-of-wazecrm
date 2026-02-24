

## Diagnostic Summary

The system **IS receiving messages** (webhook-conversas is working and saving to the database). The problem is twofold:

### Problem 1: Sending fails - Evolution API session disconnected
The logs show clearly:
- Evolution API session state: `close` / `connecting` (physically disconnected)
- Database still shows `status: connected` (stale)
- No Meta API fallback configured (`meta_phone_number_id: null`, `has_meta_token: false`)
- Result: all send attempts return 500 "Connection Closed"

**This is NOT a code bug.** Your WhatsApp session in the Evolution API panel expired and needs to be reconnected manually by scanning the QR code again.

### Problem 2: Received messages may not appear in UI
Although webhook saves messages to the database, the real-time subscription in the Conversas page may not be refreshing the contact list properly (this was the bug fixed earlier).

---

## Required Actions

### Action 1 (Manual - You must do this):
Reconnect your WhatsApp session in the Evolution API panel (`https://evolution-evolution-api.0ntuaf.easypanel.host`):
1. Access the Evolution API panel
2. Find the instance **CRM**
3. Scan the QR code with your WhatsApp to re-establish the session
4. Once connected, sending and receiving will work normally

### Action 2 (Optional - Code improvement):
Configure Meta API as a fallback so that when Evolution goes offline, messages still get delivered via the official API. This requires:
- A Meta Business phone number ID
- A Meta access token
- Updating the `whatsapp_connections` record to set `api_provider: 'both'` with Meta credentials

### Action 3 (Code fix):
Update the `enviar-whatsapp` edge function to return a clearer error message when Evolution is disconnected and no Meta fallback is available, instead of a generic 500 error. The response should tell the user to reconnect the WhatsApp session.

---

## Technical Details

The edge function `enviar-whatsapp` correctly detects the disconnected state via real-time check (`/instance/connectionState`), but when `hasMeta: null`, the fallback path has no alternative and the function crashes with the 500 error. The fix would add a graceful error response:

```
"Sessão WhatsApp desconectada. Reconecte o QR Code na página de Configurações ou configure a API Meta como fallback."
```

