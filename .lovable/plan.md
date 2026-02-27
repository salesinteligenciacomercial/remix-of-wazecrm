

## Problem: Storage Bloat from Base64 in Database

The root cause of rapid storage consumption is clear: **when users send media files (images, videos, audio, documents) from the CRM frontend, the full Base64 data URL is saved directly into the `conversas` table** (`midia_url` and `media_url` columns).

A single 5MB image becomes ~6.7MB of Base64 text stored in the database. Videos can be 40-60MB of Base64 per message. This is why 19 GB of your 22 GB usage is in the `conversas` table.

The webhook (`webhook-conversas`) already correctly uploads media to Storage and saves only the URL. But the **frontend send flow** (`ConversaPopup.tsx` lines 957-971) bypasses this entirely.

### Implementation Plan

**Step 1: Upload media to Storage before saving to `conversas` (ConversaPopup.tsx)**
- In `handleSendMedia`: After sending via WhatsApp, upload the file to Storage bucket `whatsapp-media` and save only the Storage URL (not the data URL) in `midia_url`/`media_url`
- In `handleSendAudio`: Same fix — upload audio blob to Storage, save URL only
- Create a shared helper function `uploadMediaToStorage(file, messageId)` that uploads to `whatsapp-media/{company_id}/{messageId}.{ext}` and returns the public URL

**Step 2: Create Storage bucket if needed (migration)**
- Ensure `whatsapp-media` bucket exists with appropriate policies (the webhook already uses it, so it likely exists)

**Step 3: Clean existing Base64 data from `conversas` (migration)**
- Create a SQL migration that:
  1. Identifies rows where `midia_url` starts with `data:` (Base64 content)
  2. Sets those to `NULL` (the media was already sent via WhatsApp, the recipient has it)
  3. Runs in batches to avoid locking
- This will immediately reclaim most of the 19 GB

**Step 4: Also fix `DisparoEmMassa.tsx`**
- Check if mass dispatch also saves Base64 to conversas and fix similarly

### Technical Details
- Storage path: `whatsapp-media/{company_id}/{timestamp}-{filename}`
- Use `supabase.storage.from('whatsapp-media').upload(path, file)` then `getPublicUrl()`
- The cleanup migration: `UPDATE conversas SET midia_url = NULL, media_url = NULL WHERE midia_url LIKE 'data:%'`
- After VACUUM, expect to recover 15-18 GB of storage

