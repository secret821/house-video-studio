/** The application owns editable project parameters; Studio remains available for inspection. */
import { Composition } from 'remotion';

import { DIMENSIONS, EMPTY_PROJECT, FPS } from '../services/definition/project';

import { HouseTour } from './house-tour';
import { getTimeline } from './timeline';

export function VideoRoot() {
  return (
    <Composition
      id="HouseTour"
      component={HouseTour}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={150}
      defaultProps={{ project: EMPTY_PROJECT }}
      calculateMetadata={({ props }) => ({
        durationInFrames: getTimeline(props.project).frames,
        ...DIMENSIONS[props.project.aspect],
      })}
    />
  );
}
