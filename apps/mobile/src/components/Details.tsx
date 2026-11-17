import React, { useState, type ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import type { Assessment, RegionPack, UnitSystem } from '@anchor-buddy/domain';
import Sheet from './Sheet';
import { ForecastIntervalRow, ForecastOverview } from './ForecastOverview';
import { Button, Card, Eyebrow, Icon, Notice } from './ui';
import { StatusBadge, kindNames } from './ResultCard';
import { colors as c, spacing, textScale } from '../theme';
import { depth, distance, localTime, money } from '../lib/units';
import { describeForecast, forecastTimezone, type ForecastStay } from '../lib/forecastPresentation';

function Disclosure({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.disclosureButton}
      >
        <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
          <Text style={styles.disclosureTitle}>{title}</Text>
          {summary ? <Text style={styles.secondaryText}>{summary}</Text> : null}
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={c.ink} />
      </Pressable>
      {expanded ? <View style={styles.disclosureContent}>{children}</View> : null}
    </View>
  );
}

function ReasonRows({ reasons }: { reasons: Assessment['reasons'] }) {
  return reasons.map((reason, index) => (
    <View key={`${reason.code}-${index}`} style={styles.reasonRow}>
      <Icon
        name={reason.severity === 'excluded' ? 'x-circle' : 'alert-circle'}
        color={reason.severity === 'excluded' ? c.error : c.warning}
        size={17}
      />
      <Text style={styles.reasonText}>{reason.message}</Text>
    </View>
  ));
}

export default function Details({
  assessment: a,
  pack,
  stay,
  units,
  onClose,
  onPlan,
  onSources,
  evidenceCachedAt,
}: {
  assessment: Assessment;
  pack: RegionPack;
  stay: ForecastStay | null;
  units: UnitSystem;
  onClose: () => void;
  onPlan: () => void;
  onSources?: () => void;
  /** Local cache write time; it does not refresh source issue or retrieval dates. */
  evidenceCachedAt?: string | null;
}) {
  const [allWeather, setAllWeather] = useState(false);
  const timezone = stay?.timezone ?? forecastTimezone();
  const forecast = describeForecast(a.weather, pack, stay, Date.now());
  const forecastWindows = [forecast.requested?.stay, forecast.requested?.contingency];
  const forecastGaps = forecastWindows.some(
    (window) => window && (window.intervalGap || window.metricGaps.length),
  );
  const p = a.candidate.place;
  const anchored = a.candidate.kind === 'anchorage' || a.candidate.kind === 'generated';
  const footprintResolved = a.requiredRodeM !== null && a.swingRadiusM !== null;
  const elapsedEvidence = a.reasons.some(
    (reason) => reason.code === 'elapsed_stay' || reason.code.startsWith('currently_'),
  );
  const excludedReasons = a.reasons.filter((reason) => reason.severity === 'excluded');
  const missingReasons = a.reasons.filter((reason) => reason.severity === 'insufficient_evidence');
  const otherReasons = a.reasons.filter((reason) => reason.severity === 'info');
  const referencedSources = pack.sources.filter((source) => a.sourceIds.includes(source.id));
  const knownSourceIds = new Set(referencedSources.map((source) => source.id));
  const unresolvedSourceIds = a.sourceIds.filter((id) => !knownSourceIds.has(id));
  const hasPublishedLimits =
    !!p &&
    Boolean(
      p.maxLengthM !== undefined ||
      p.maxBeamM !== undefined ||
      p.maxDraftM !== undefined ||
      p.maxAirDraftM !== undefined ||
      p.maxDisplacementKg !== undefined ||
      p.entranceMinDepthM !== undefined ||
      p.berthMinDepthM !== undefined ||
      p.mooringSwingRadiusM !== undefined ||
      p.allowedVesselTypes?.length,
    );

  const packStatus =
    pack.validation.status === 'reviewed'
      ? 'Reviewed analysis pack'
      : pack.validation.status === 'synthetic'
        ? 'Synthetic test data pack'
        : 'Unreviewed data pack';

  return (
    <Sheet
      title={a.candidate.name}
      subtitle={
        kindNames[a.candidate.kind] +
        ' · ' +
        distance(a.distanceNm, units) +
        ' straight-line distance'
      }
      onClose={onClose}
    >
      <View style={styles.decisionSummary}>
        <StatusBadge assessment={a} />
        <View style={styles.contextBlock}>
          <Text style={styles.contextText}>
            {a.context
              ? `${a.context.purpose === 'current' ? 'Current assessment' : 'Historical assessment'} · ${localTime(a.context.assessedAt)}`
              : 'Assessment time not recorded'}
          </Text>
          <Text style={styles.contextText}>{packStatus}</Text>
          <Text style={styles.contextText}>
            Pack valid until {localTime(pack.validUntil)} · generated {localTime(pack.generatedAt)}
          </Text>
          {evidenceCachedAt ? (
            <Text style={styles.contextText}>
              Local evidence cache saved {localTime(evidenceCachedAt)}. Source dates below retain
              their recorded values.
            </Text>
          ) : null}
        </View>
        <View style={styles.metricsRow}>
          <Card style={{ flex: 1, padding: spacing.lg }}>
            <Eyebrow>WATER DEPTH</Eyebrow>
            <Text style={styles.metricValue}>
              {depth(a.minDepthM, units)} – {depth(a.maxDepthM, units)}
            </Text>
          </Card>
          <Card style={{ flex: 1, padding: spacing.lg }}>
            <Eyebrow>ESTIMATED STAY</Eyebrow>
            <Text style={styles.metricValue}>
              {money(a.cost.total, a.cost.currency, a.cost.status)}
            </Text>
          </Card>
        </View>

        {excludedReasons.length ? (
          <View style={styles.reasonGroup}>
            <Text style={styles.groupTitle}>Blocking reasons</Text>
            <ReasonRows reasons={excludedReasons} />
          </View>
        ) : null}
        {missingReasons.length ? (
          <View style={styles.reasonGroup}>
            <Text style={styles.groupTitle}>Evidence gaps</Text>
            <ReasonRows reasons={missingReasons} />
          </View>
        ) : null}
        {!a.reasons.length ? (
          <Text style={styles.secondaryText}>
            No reason details are recorded for this assessment.
          </Text>
        ) : null}

        {anchored ? (
          <Button
            onPress={onPlan}
            disabled={elapsedEvidence}
            icon="anchor"
            secondary={a.status !== 'passes'}
          >
            {a.status === 'excluded' ? 'Inspect position in planner' : 'Plan this position'}
          </Button>
        ) : (
          <Notice>
            Confirm berth or mooring availability and arrival instructions with the operator. This
            site assessment does not authorize dropping an anchor at a dock or mooring.
          </Notice>
        )}
      </View>

      <Disclosure
        title="Other assessment findings"
        summary={
          otherReasons.length
            ? `${otherReasons.length} additional finding(s)`
            : 'No additional findings'
        }
      >
        {otherReasons.length ? (
          otherReasons.map((reason, index) => (
            <View key={`${reason.code}-${index}`} style={styles.reasonRow}>
              <Icon name="info" color={c.information} size={17} />
              <Text style={styles.reasonText}>{reason.message}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.secondaryText}>No additional assessment findings are recorded.</Text>
        )}
      </Disclosure>

      <Disclosure
        title="Planning details"
        summary={anchored ? 'Depth, rode, footprint and exposure' : 'Depth and exposure context'}
      >
        {anchored ? (
          <View style={styles.metricsRow}>
            <Card style={{ flex: 1, padding: spacing.lg }}>
              <Eyebrow>REQUIRED RODE</Eyebrow>
              <Text style={styles.metricValue}>{depth(a.requiredRodeM, units)}</Text>
            </Card>
            <Card style={{ flex: 1, padding: spacing.lg }}>
              <Eyebrow>CALCULATED SWING RADIUS</Eyebrow>
              <Text style={styles.metricValue}>
                {depth(footprintResolved ? a.swingRadiusM : null, units)}
              </Text>
            </Card>
          </View>
        ) : null}
        {anchored ? (
          <Text style={styles.secondaryText}>
            {footprintResolved
              ? 'Calculated geometry does not establish clear seabed, suitable holding or permission to anchor.'
              : 'The full swing footprint has not been established from the available depth, water-level and equipment evidence.'}
          </Text>
        ) : null}
        <Notice>
          {a.exposure.label}. Exposure is a coastline/fetch estimate, not a local shelter guarantee.
        </Notice>
        {a.depthAllowancePercent > 0 ? (
          <Notice>
            +{a.depthAllowancePercent}% deeper alternative. All other constraints still apply.
          </Notice>
        ) : null}
      </Disclosure>

      <Disclosure
        title="Stay & departure weather"
        summary={
          forecastGaps
            ? 'Forecast gaps in requested windows'
            : `${a.weather.length} forecast interval(s)`
        }
      >
        <ForecastOverview forecast={forecast} scope="position" timezone={timezone} units={units} />
        {!a.weather.length ? (
          <Notice>
            No forecast has verified spatial coverage at this position for this stay. Sources &
            coverage may contain a forecast for the search centre; it cannot establish local shelter
            or conditions here.
          </Notice>
        ) : null}
        {(allWeather ? forecast.rows : forecast.rows.slice(0, 12)).map((row, index) => (
          <ForecastIntervalRow key={index} row={row} timezone={timezone} units={units} />
        ))}
        {a.weather.length > 12 ? (
          <Button secondary onPress={() => setAllWeather(!allWeather)}>
            {allWeather
              ? 'Show first 12 intervals'
              : `Show all ${a.weather.length} forecast intervals`}
          </Button>
        ) : null}
      </Disclosure>

      <Disclosure title="Access, availability & site limits">
        <Text style={styles.bodyText}>
          Approach: {a.approach.status.replaceAll('_', ' ')}. {a.approach.notes.join(' ')}
        </Text>
        <Text style={styles.bodyText}>
          Availability: {a.availability}.{' '}
          {p?.overnightAllowed === true
            ? 'Overnight use permitted in the source record.'
            : p?.overnightAllowed === false
              ? 'Day use only.'
              : 'Overnight permission requires verification.'}
        </Text>
        {p ? (
          <>
            <Text style={styles.groupTitle}>Published limits</Text>
            {!hasPublishedLimits ? (
              <Text style={styles.secondaryText}>
                No numeric or vessel-type limits are recorded in this place record.
              </Text>
            ) : null}
            {p.maxLengthM !== undefined ? (
              <Text style={styles.bodyText}>
                Maximum vessel length: {depth(p.maxLengthM, units)}
              </Text>
            ) : null}
            {p.maxBeamM !== undefined ? (
              <Text style={styles.bodyText}>Maximum beam: {depth(p.maxBeamM, units)}</Text>
            ) : null}
            {p.maxDraftM !== undefined ? (
              <Text style={styles.bodyText}>Maximum draft: {depth(p.maxDraftM, units)}</Text>
            ) : null}
            {p.maxAirDraftM !== undefined ? (
              <Text style={styles.bodyText}>Maximum air draft: {depth(p.maxAirDraftM, units)}</Text>
            ) : null}
            {p.maxDisplacementKg !== undefined ? (
              <Text style={styles.bodyText}>Maximum displacement: {p.maxDisplacementKg} kg</Text>
            ) : null}
            {p.entranceMinDepthM !== undefined ? (
              <Text style={styles.bodyText}>
                Published entrance depth: {depth(p.entranceMinDepthM, units)}
              </Text>
            ) : null}
            {p.berthMinDepthM !== undefined ? (
              <Text style={styles.bodyText}>
                Published berth depth: {depth(p.berthMinDepthM, units)}
              </Text>
            ) : null}
            {p.mooringSwingRadiusM !== undefined ? (
              <Text style={styles.bodyText}>
                Published mooring swing radius: {depth(p.mooringSwingRadiusM, units)}
              </Text>
            ) : null}
            {p.allowedVesselTypes?.length ? (
              <Text style={styles.bodyText}>
                Allowed vessel types: {p.allowedVesselTypes.join(', ')}
              </Text>
            ) : null}
            <Text style={styles.secondaryText}>
              Vessel limits {p.vesselLimitsVerified ? 'marked verified' : 'not marked verified'};
              operational restrictions{' '}
              {p.operationalRestrictionsVerified ? 'marked verified' : 'not marked verified'}.
            </Text>
            {p.holding !== 'unknown' || p.facilities.length || p.notes.length || p.contact ? (
              <Text style={styles.secondaryText}>
                Holding: {p.holding}. {p.facilities.join(' · ')}. {p.notes.join(' ')}{' '}
                {p.contact ? 'Contact: ' + p.contact : ''}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.secondaryText}>
            No place-specific limits are available for this generated position.
          </Text>
        )}
      </Disclosure>

      <Disclosure title="Cost breakdown" summary={`${a.cost.items.length} item(s)`}>
        {a.cost.items.map((item, i) => (
          <View key={`${item.label}-${i}`} style={styles.costRow}>
            <Text style={[styles.bodyText, { flex: 1 }]}>{item.label}</Text>
            <Text style={styles.bodyText}>
              {money(item.amount, a.cost.currency, a.cost.status)}
            </Text>
          </View>
        ))}
        <Text style={styles.secondaryText}>
          {a.cost.notes.join(' ') ||
            'An estimate is not a booking or confirmation of availability.'}
        </Text>
      </Disclosure>

      <Disclosure
        title="Sources & freshness"
        summary={`${a.sourceIds.length} referenced source(s)`}
      >
        {onSources ? (
          <Button secondary onPress={onSources}>
            Sources & coverage
          </Button>
        ) : null}
        <Text style={styles.secondaryText}>
          Retrieval and expiry dates below are the source record dates. A local cache save time, if
          shown above, does not change these dates.
        </Text>
        {referencedSources.map((source) => (
          <View key={source.id} style={styles.sourceRow}>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(source.url)}>
              <Text style={styles.sourceName}>{source.name}</Text>
            </Pressable>
            <Text style={styles.secondaryText}>Source ID: {source.id}</Text>
            <Text style={styles.secondaryText}>Retrieved {localTime(source.retrievedAt)}</Text>
            <Text style={styles.secondaryText}>Valid until {localTime(source.validUntil)}</Text>
            {source.evidence?.role ? (
              <Text style={styles.secondaryText}>Evidence role: {source.evidence.role}</Text>
            ) : null}
          </View>
        ))}
        {unresolvedSourceIds.map((id) => (
          <Text key={id} style={styles.secondaryText}>
            Referenced source record is unavailable in this pack: {id}
          </Text>
        ))}
        {!a.sourceIds.length ? (
          <Text style={styles.secondaryText}>
            No applicable source identities are recorded for this position.
          </Text>
        ) : null}
      </Disclosure>
    </Sheet>
  );
}

const styles = {
  decisionSummary: { gap: spacing.md },
  contextBlock: { gap: spacing.xs },
  contextText: { fontSize: textScale.caption, lineHeight: 17, color: c.muted },
  metricsRow: { flexDirection: 'row' as const, gap: spacing.md, flexWrap: 'wrap' as const },
  metricValue: {
    fontSize: textScale.heading,
    lineHeight: 27,
    fontWeight: '600' as const,
    color: c.ink,
  },
  reasonGroup: { gap: spacing.sm },
  groupTitle: {
    fontSize: textScale.compact,
    lineHeight: 18,
    fontWeight: '600' as const,
    color: c.ink,
  },
  reasonRow: { flexDirection: 'row' as const, gap: spacing.sm, alignItems: 'flex-start' as const },
  reasonText: { flex: 1, fontSize: textScale.body, lineHeight: 21, color: c.ink },
  disclosure: { borderTopWidth: 1, borderTopColor: c.line },
  disclosureButton: {
    minHeight: 48,
    paddingVertical: spacing.sm,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
  },
  disclosureTitle: {
    fontSize: textScale.body,
    lineHeight: 21,
    fontWeight: '600' as const,
    color: c.ink,
  },
  disclosureContent: { paddingBottom: spacing.md, gap: spacing.md },
  secondaryText: { fontSize: textScale.compact, lineHeight: 19, color: c.muted },
  bodyText: { fontSize: textScale.compact, lineHeight: 20, color: c.ink },
  rowLabel: { fontSize: textScale.compact, fontWeight: '600' as const, color: c.ink },
  costRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
  },
  sourceRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  sourceName: { fontSize: textScale.body, color: c.action, fontWeight: '600' as const },
};
