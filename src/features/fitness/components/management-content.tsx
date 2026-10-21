import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { UiText } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';

import { exerciseMeasurementLabel, exerciseTypeLabel } from '../management-presentation';
import type { Exercise, RoutineDetail } from '../types';
import { ArchivedRoutineEditor } from './fitness-forms';
import { RoutineHeader } from './routine-composition';
import { measurementIcons } from '../workout-presentation';

export function ExerciseDetail({ exercise, onDismiss }: { exercise: Exercise; onDismiss: () => void }) {
  return <AdaptiveSheet appearance="v2" title={exercise.name} onDismiss={onDismiss} header={<RoutineHeader title={exercise.name} onDismiss={onDismiss} />}>
    <EditorSection title="Measurement" headingType="cardTitle" description="" icon={measurementIcons[exercise.measurementType]} variant="group">
    <UiText>{exerciseTypeLabel(exercise.measurementType)} · {exerciseMeasurementLabel(exercise.measurementType)}</UiText>
    <UiText type="secondary" color="textSecondary">{exercise.isBuiltIn ? 'Built-in exercise. Available to all your routines and cannot be archived.'
      : exercise.deletedAt !== null ? 'Archived. Existing routine references and workout history are retained. New workouts omit this exercise.'
        : 'Custom exercise. Archiving removes it from new choices and keeps existing routine references and workout history.'}</UiText>
    </EditorSection>
  </AdaptiveSheet>;
}

export function ArchivedRoutineDetail({ routine, onDismiss }: { routine: RoutineDetail; onDismiss: () => void }) {
  return <ArchivedRoutineEditor routine={routine} onDismiss={onDismiss} />;
}
