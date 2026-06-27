import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Exchange, ResearchReport } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1d29" },
  header: { marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 9, color: "#5a5f73", marginTop: 2 },
  metricsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  metricBox: { flex: 1, border: "1px solid #e7e9f3", borderRadius: 6, padding: 8 },
  metricLabel: { fontSize: 7, color: "#8b91a8", textTransform: "uppercase", marginBottom: 3 },
  metricValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  paragraph: { fontSize: 9.5, lineHeight: 1.5, color: "#333749" },
  scenarioRow: { flexDirection: "row", gap: 10 },
  scenarioBox: { flex: 1, border: "1px solid #e7e9f3", borderRadius: 6, padding: 8 },
  scenarioName: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#5a5f73" },
  scenarioTarget: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 3 },
  scenarioReturn: { fontSize: 8.5, marginTop: 1 },
  scenarioDesc: { fontSize: 8, color: "#5a5f73", marginTop: 4, lineHeight: 1.4 },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1px solid #f0f1f6" },
  kvLabel: { color: "#5a5f73" },
  kvValue: { fontFamily: "Helvetica-Bold" },
  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 10, fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4, color: "#333749" },
  footer: { marginTop: 24, fontSize: 7.5, color: "#8b91a8", fontStyle: "italic" },
});

interface PdfStock {
  symbol: string;
  name: string;
  exchange: Exchange;
}

export function ResearchReportPdf({ stock, report }: { stock: PdfStock; report: ResearchReport }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{stock.name}</Text>
          <Text style={styles.subtitle}>
            {stock.symbol} · {stock.exchange} — Equity Research · Generated {report.generatedOn}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Rating</Text>
            <Text style={styles.metricValue}>{report.rating}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>12M target</Text>
            <Text style={styles.metricValue}>₹{report.targetPrice.toLocaleString("en-IN")}</Text>
            <Text style={{ fontSize: 8, color: report.upsidePct >= 0 ? "#15803d" : "#dc2626" }}>
              {report.upsidePct >= 0 ? "+" : ""}
              {report.upsidePct}% upside
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Current price</Text>
            <Text style={styles.metricValue}>₹{report.currentPrice.toLocaleString("en-IN")}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.paragraph}>{report.summary}</Text>

        <Text style={styles.sectionTitle}>Scenarios</Text>
        <View style={styles.scenarioRow}>
          {report.scenarios.map((sc) => (
            <View key={sc.name} style={styles.scenarioBox}>
              <Text style={styles.scenarioName}>{sc.name}</Text>
              <Text style={styles.scenarioTarget}>₹{sc.target.toLocaleString("en-IN")}</Text>
              <Text style={{ ...styles.scenarioReturn, color: sc.returnPct >= 0 ? "#15803d" : "#dc2626" }}>
                {sc.returnPct >= 0 ? "+" : ""}
                {sc.returnPct}%
              </Text>
              <Text style={styles.scenarioDesc}>{sc.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Key metrics</Text>
            {report.kpis.map((k) => (
              <View key={k.label} style={styles.kvRow}>
                <Text style={styles.kvLabel}>{k.label}</Text>
                <Text style={styles.kvValue}>{k.value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>DCF inputs</Text>
            {report.dcf.map((d) => (
              <View key={d.label} style={styles.kvRow}>
                <Text style={styles.kvLabel}>{d.label}</Text>
                <Text style={styles.kvValue}>{d.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Catalysts</Text>
            {report.catalysts.map((c, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{c}</Text>
              </View>
            ))}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Risks</Text>
            {report.risks.map((r, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{r}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          For educational purposes only — not investment advice. AI-generated analysis, not independently audited.
        </Text>
      </Page>
    </Document>
  );
}
