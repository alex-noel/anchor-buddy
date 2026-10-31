import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { SearchRequest } from '@anchor-buddy/domain';
import Sheet from './Sheet';
import SelectField from './SelectField';
import { Button, Check } from './ui';
import { colors as c } from '../theme';
import { DEFAULT_FILTERS, type ResultFilters } from '../lib/workspace';
export default function AdvancedFiltersSheet({
  filters,
  bedding,
  onApply,
  onClose,
}: {
  filters: ResultFilters;
  bedding: SearchRequest['preferredBedding'];
  onApply: (filters: ResultFilters, bedding: SearchRequest['preferredBedding']) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters);
  const [bed, setBed] = useState(bedding ?? 'sand');
  return (
    <Sheet
      title="Advanced filters & sorting"
      subtitle="Results are grouped by assessment first, then sorted within each group."
      onClose={onClose}
    >
      <SelectField
        label="Sort by"
        value={draft.sort}
        onChange={(value) => setDraft({ ...draft, sort: value as ResultFilters['sort'] })}
        options={[
          { value: 'distance', label: 'Straight-line distance' },
          { value: 'price', label: 'Estimated total price' },
          { value: 'depth', label: 'Maximum depth' },
          { value: 'exposure', label: 'Weather exposure' },
        ]}
      />
      <SelectField
        label="Price"
        value={draft.fee}
        onChange={(value) => setDraft({ ...draft, fee: value as ResultFilters['fee'] })}
        options={[
          { value: 'all', label: 'Any price' },
          { value: 'free', label: 'Confirmed free' },
          { value: 'paid', label: 'Paid' },
          { value: 'unknown', label: 'Fee unknown' },
        ]}
      />
      <SelectField
        label="Assessment"
        value={draft.assessment}
        onChange={(value) =>
          setDraft({ ...draft, assessment: value as ResultFilters['assessment'] })
        }
        options={[
          { value: 'recommended', label: 'Hide excluded positions' },
          { value: 'complete', label: 'Passes all configured checks' },
          { value: 'all', label: 'All results, including exclusions' },
        ]}
      />
      <SelectField
        label="Preferred seabed"
        value={bed}
        onChange={(value) => setBed(value as typeof bed)}
        options={[
          { value: 'sand', label: 'Sand' },
          { value: 'mud', label: 'Mud' },
          { value: 'mixed', label: 'Mixed' },
          { value: 'rock', label: 'Rock' },
          { value: 'unknown', label: 'Unknown' },
          { value: 'any', label: 'Any seabed' },
        ]}
        help="Applies to anchor positions. Suitable holding evidence is still required; a seabed preference cannot override an exclusion."
      />
      <Check
        label="Only sites with no known or unresolved vessel incompatibility"
        checked={draft.compatibleOnly}
        onChange={(value) => setDraft({ ...draft, compatibleOnly: value })}
      />
      <Text style={{ fontSize: 12, lineHeight: 19, color: c.muted }}>
        Unknown prices sort last in each assessment group. Distance does not establish a navigable
        approach.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            onPress={() => {
              setDraft(DEFAULT_FILTERS);
              setBed('sand');
            }}
          >
            Reset
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            onPress={() => {
              onApply(draft, bed);
              onClose();
            }}
          >
            Apply
          </Button>
        </View>
      </View>
    </Sheet>
  );
}
