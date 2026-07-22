// Selah — iOS home & lock-screen widgets (WidgetKit + SwiftUI).
//
// Reads the payload the app publishes into the shared App Group via
// @bacons/apple-targets' ExtensionStorage (a UserDefaults suite). No network,
// no app launch: the widget just renders the last thing you chose to keep.
//
// Home screen: systemSmall + systemMedium.
// Lock screen (iOS 16+): accessoryRectangular, accessoryInline, accessoryCircular.

import WidgetKit
import SwiftUI

private let appGroup = "group.app.selah.journal"
private let payloadKey = "selahWidgetPayload"

// MARK: - Model

struct SelahPayload: Decodable {
    var kind: String
    var eyebrow: String
    var body: String
    var footer: String
    var accessoryShort: String
    var updatedAt: Double

    static let placeholder = SelahPayload(
        kind: "dailyVerse",
        eyebrow: "Psalm 46:10",
        body: "“Be still, and know that I am God.”",
        footer: "Psalm 46:10 · WEB",
        accessoryShort: "Be still, and know",
        updatedAt: 0
    )

    static func load() -> SelahPayload {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let raw = defaults.string(forKey: payloadKey),
            let data = raw.data(using: .utf8),
            let decoded = try? JSONDecoder().decode(SelahPayload.self, from: data)
        else { return .placeholder }
        return decoded
    }
}

// MARK: - Timeline

struct SelahEntry: TimelineEntry {
    let date: Date
    let payload: SelahPayload
}

struct SelahProvider: TimelineProvider {
    func placeholder(in context: Context) -> SelahEntry {
        SelahEntry(date: Date(), payload: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SelahEntry) -> Void) {
        completion(SelahEntry(date: Date(), payload: SelahPayload.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SelahEntry>) -> Void) {
        let entry = SelahEntry(date: Date(), payload: SelahPayload.load())
        // Refresh a little after midnight so the daily verse rolls over even if
        // the app isn't opened; the app also reloads on launch and on save.
        let nextMidnight = Calendar.current.nextDate(
            after: Date(), matching: DateComponents(hour: 0, minute: 5),
            matchingPolicy: .nextTime
        ) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
    }
}

// MARK: - Palette (Dawn)

private extension Color {
    static let selahBg = Color(red: 0.961, green: 0.953, blue: 0.980)
    static let selahInk = Color(red: 0.271, green: 0.255, blue: 0.325)
    static let selahSoft = Color(red: 0.435, green: 0.420, blue: 0.510)
    static let selahAccent = Color(red: 0.561, green: 0.525, blue: 0.776)
}

// MARK: - Home-screen views

struct SelahHomeView: View {
    var payload: SelahPayload
    var compact: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(payload.eyebrow.uppercased())
                    .font(.system(size: 10, weight: .semibold))
                    .kerning(1)
                    .foregroundColor(.selahAccent)
                    .lineLimit(1)
                Spacer()
                Text("‖").font(.system(size: 13)).foregroundColor(.selahAccent)
            }
            Spacer(minLength: 2)
            Text(payload.body)
                .font(payload.kind == "streak"
                      ? .system(size: 22, weight: .semibold, design: .serif)
                      : .system(size: compact ? 13 : 15, design: .serif))
                .foregroundColor(.selahInk)
                .lineLimit(compact ? 4 : 5)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 2)
            Text(payload.footer)
                .font(.system(size: 11))
                .foregroundColor(.selahSoft)
                .lineLimit(1)
        }
        .padding(compact ? 12 : 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(for: .widget) { Color.selahBg }
    }
}

// MARK: - Lock-screen (accessory) views

struct SelahAccessoryView: View {
    @Environment(\.widgetFamily) var family
    var payload: SelahPayload

    var body: some View {
        switch family {
        case .accessoryInline:
            Text("‖ \(payload.accessoryShort)")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Text("‖").font(.system(size: 22, design: .serif))
            }
        default: // accessoryRectangular
            VStack(alignment: .leading, spacing: 2) {
                Text("‖ \(payload.eyebrow)")
                    .font(.system(size: 11, weight: .semibold))
                    .lineLimit(1)
                Text(payload.accessoryShort)
                    .font(.system(size: 13))
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Widgets

struct SelahHomeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SelahHomeWidget", provider: SelahProvider) { entry in
            SelahHomeView(payload: entry.payload,
                          compact: false)
        }
        .configurationDisplayName("Selah")
        .description("A verse, a note, or your rhythm — kept in view.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct SelahLockWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SelahLockWidget", provider: SelahProvider) { entry in
            SelahAccessoryView(payload: entry.payload)
        }
        .configurationDisplayName("Selah")
        .description("Keep a word on your lock screen.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline, .accessoryCircular])
    }
}

@main
struct SelahWidgetBundle: WidgetBundle {
    var body: some Widget {
        SelahHomeWidget()
        SelahLockWidget()
    }
}
