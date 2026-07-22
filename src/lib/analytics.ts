/**
 * Privacy contract: Selah never records journal content, titles, verse
 * selections, tags, or search terms. Only anonymous app-health events
 * (screen opened, entry saved, a count, not content) may ever be sent,
 * and only after Sentry/PostHog keys are configured. Until then: no-op.
 */
type EventName =
  | 'entry_saved'
  | 'entry_deleted'
  | 'search_performed'
  | 'verse_attached'
  | 'prompt_started'
  | 'reminder_set'
  | 'lock_enabled'
  | 'export_created';

export function track(_event: EventName): void {
  // Intentionally empty. Wire Sentry/PostHog here post-launch, events only,
  // never payloads. See SECURITY.md before adding any property.
}
